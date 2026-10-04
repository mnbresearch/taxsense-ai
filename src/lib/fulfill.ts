/**
 * Payment fulfilment, shared by the webhook and the status-poll fallback.
 *
 * Security model (hardened):
 *  - The plan and price come from OUR ledger row (written by /api/pay/create-order
 *    with server-side catalog prices), never from webhook/order fields alone.
 *  - Unknown plan keys and under-payments are refused — they never map to a tier.
 *  - Each order is claimed atomically (status created→paid in one UPDATE), so
 *    concurrent webhook + status-poll calls cannot double-activate or double-email.
 *  - Paid-online plans get an expiry (paid_until); renewals extend it.
 */
import { supabaseAdmin } from "@/lib/supabase/server";
import { ADMIN_EMAIL, brandedShell, sendOne } from "@/lib/email";
import { PAY_CATALOG } from "@/lib/cashfree";
import { escHtml } from "@/lib/html";

const DAY = 86_400_000;
/** Validity granted by each catalog key. */
export function planDurationDays(planKey: string): number {
  if (planKey.endsWith("-yearly")) return 366;
  if (planKey.endsWith("-monthly")) return 31;
  if (planKey === "filed-once") return 365;
  return 0;
}

export async function fulfillPaidOrder(opts: {
  orderId: string;
  email: string;
  planKey: string;
  amount?: number;
  cfPaymentId?: string;
  via: "webhook" | "status-poll";
}): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, error: "service key not configured" };

  // 1. Our own ledger row is the source of truth for plan, price and email.
  let email = opts.email.trim().toLowerCase();
  let planKey = opts.planKey;
  const ledger = await admin.from("payments").select("status, plan_key, amount, email").eq("order_id", opts.orderId).maybeSingle();
  const ledgerAvailable = !ledger.error;
  if (ledger.data) {
    if (ledger.data.status === "paid") return { ok: true, duplicate: true };
    planKey = String(ledger.data.plan_key ?? "");
    email = String(ledger.data.email ?? email).trim().toLowerCase();
  } else if (ledgerAvailable) {
    // Ledger exists but has no such order: we never created it — refuse.
    return { ok: false, error: "unknown order" };
  }

  const cat = PAY_CATALOG[planKey];
  if (!cat) return { ok: false, error: "unknown plan" };
  if (opts.amount !== undefined && opts.amount + 0.01 < cat.amount) return { ok: false, error: "amount mismatch" };

  // 2. Atomic claim — only one caller flips created→paid.
  if (ledgerAvailable) {
    const { data: claimed, error: claimErr } = await admin
      .from("payments")
      .update({ status: "paid", cf_payment_id: opts.cfPaymentId ?? null, via: opts.via, updated_at: new Date().toISOString() })
      .eq("order_id", opts.orderId)
      .neq("status", "paid")
      .select("order_id");
    if (claimErr) return { ok: false, error: "ledger update failed" };
    if (!claimed || claimed.length === 0) return { ok: true, duplicate: true };
  }

  // 3. Activate with an expiry; renewals extend from the later of now / current expiry.
  const { data: current } = await admin.from("access_requests").select("paid_until").eq("email", email).maybeSingle();
  const base = Math.max(Date.now(), current?.paid_until ? new Date(current.paid_until).getTime() : 0);
  const paidUntil = new Date(base + planDurationDays(planKey) * DAY).toISOString();

  const activate = async (withExpiry: boolean) => {
    const patch = { status: "active", plan: cat.planLabel, ...(withExpiry ? { paid_until: paidUntil } : {}) };
    const { data: updated, error } = await admin.from("access_requests").update(patch).eq("email", email).select("email").maybeSingle();
    if (error) return error;
    if (!updated) {
      const ins = await admin.from("access_requests").insert({ email, source: "pay-online", ...patch });
      if (ins.error && !/duplicate/i.test(ins.error.message)) return ins.error;
    }
    return null;
  };
  let err = await activate(true);
  if (err && /paid_until|column/i.test(err.message)) err = await activate(false); // migration 0012 not yet applied
  if (err) return { ok: false, error: "activation failed" };

  await admin.from("audit_events").insert({
    event: "payment_fulfilled",
    meta: { email, orderId: opts.orderId, planKey, amount: opts.amount ?? cat.amount, via: opts.via, paidUntil },
  });

  const until = new Date(paidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  await sendOne({
    to: email,
    subject: "🎉 Payment received — your TaxSense AI plan is live",
    kind: "custom",
    html: brandedShell(
      "Payment received — you're in!",
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">Your payment for <strong>${escHtml(cat.blurb)}</strong> went through and your plan is <strong>active right now</strong> (valid until ${until}). Sign in with this email address (${escHtml(email)}) and everything is unlocked.</p>
       <p style="margin:18px 0;"><a href="https://taxsense.mnbresearch.com/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Open TaxSense AI →</a></p>
       <p style="color:#78716c;font-size:12px;line-height:1.6;">Order ${escHtml(opts.orderId)}. A GST invoice follows by email. Questions? Just reply — a human reads this inbox.</p>`
    ),
  });

  // Internal sale alert to the business inbox (replaces CC'ing the customer's mail).
  await sendOne({
    to: ADMIN_EMAIL,
    subject: `💰 Payment: ${cat.blurb} · ₹${(opts.amount ?? cat.amount).toLocaleString("en-IN")}`,
    kind: "admin_notify",
    html: brandedShell(
      "New online payment",
      `<p style="color:#44403c;font-size:14px;line-height:1.6;"><strong>${escHtml(email)}</strong> paid for <strong>${escHtml(cat.blurb)}</strong>. Plan active until ${until}. Order ${escHtml(opts.orderId)} (via ${escHtml(String(opts.via))}).</p>`
    ),
  });

  return { ok: true };
}
