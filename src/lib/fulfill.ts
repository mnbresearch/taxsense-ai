/**
 * Batch 82 — idempotent payment fulfilment, shared by the webhook and the
 * status-poll fallback. Activation is safe to run twice: the payments table
 * (unique order_id) short-circuits retries, and even without that table an
 * "already active" update is a no-op in effect.
 */
import { supabaseAdmin } from "@/lib/supabase/server";
import { brandedShell, FOUNDER_CC, sendOne } from "@/lib/email";
import { PAY_CATALOG } from "@/lib/cashfree";

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
  const email = opts.email.trim().toLowerCase();
  const cat = PAY_CATALOG[opts.planKey];
  const planLabel = cat?.planLabel ?? `Paid online (${opts.planKey})`;

  // Idempotency ledger (tolerate a missing table — activation is still safe).
  try {
    const { data: existing } = await admin.from("payments").select("status").eq("order_id", opts.orderId).maybeSingle();
    if (existing?.status === "paid") return { ok: true, duplicate: true };
    await admin.from("payments").upsert(
      {
        order_id: opts.orderId, email, plan_key: opts.planKey,
        amount: opts.amount ?? cat?.amount ?? null, status: "paid",
        cf_payment_id: opts.cfPaymentId ?? null, via: opts.via,
      },
      { onConflict: "order_id" }
    );
  } catch { /* table may not exist yet — proceed; activation is idempotent */ }

  // Activate: update the lead row if present, else create one.
  const { data: updated, error: upErr } = await admin
    .from("access_requests")
    .update({ status: "active", plan: planLabel })
    .eq("email", email)
    .select("email")
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!updated) {
    const { error: insErr } = await admin
      .from("access_requests")
      .insert({ email, source: "pay-online", plan: planLabel, status: "active" });
    if (insErr && !/duplicate/i.test(insErr.message)) return { ok: false, error: insErr.message };
  }

  await admin.from("audit_events").insert({
    event: "payment_fulfilled",
    meta: { email, orderId: opts.orderId, planKey: opts.planKey, amount: opts.amount ?? cat?.amount, via: opts.via },
  });

  await sendOne({
    to: email,
    cc: email === FOUNDER_CC ? undefined : [FOUNDER_CC],
    subject: "🎉 Payment received — your TaxSense AI plan is live",
    kind: "custom",
    html: brandedShell(
      "Payment received — you're in!",
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">Your payment for <strong>${cat?.blurb ?? planLabel}</strong> went through and your plan is <strong>active right now</strong>. Sign in with this email address (${email}) and everything is unlocked.</p>
       <p style="margin:18px 0;"><a href="https://taxsense.mnbresearch.com/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Open TaxSense AI →</a></p>
       <p style="color:#78716c;font-size:12px;line-height:1.6;">Order ${opts.orderId}. A GST invoice follows by email. Questions? Just reply — a human reads this inbox.</p>`
    ),
  });

  return { ok: true };
}
