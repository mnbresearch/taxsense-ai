/**
 * Abandoned-checkout follow-up (email). Source of truth = our payments ledger,
 * never a client redirect. One reminder per order, at most one per email per
 * 7 days, only with a recorded consent (payments.consent_at), never to
 * suppressed/undeliverable addresses or anyone who has since paid.
 * Default config: disabled + dry-run.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PAY_CATALOG } from "@/lib/cashfree";
import { brandedShell, isUndeliverable, sendOne, unsubUrl } from "@/lib/email";
import { escHtml } from "@/lib/html";
import { track } from "@/lib/analytics";

export interface FollowupConfig { enabled: boolean; dryRun: boolean; delayHours: number; maxPerRun: number }
export const DEFAULT_FOLLOWUP_CONFIG: FollowupConfig = { enabled: false, dryRun: true, delayHours: 3, maxPerRun: 50 };

export function normalizeConfig(v: unknown): FollowupConfig {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof FollowupConfig, unknown>>;
  const num = (x: unknown, lo: number, hi: number, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d);
  return {
    enabled: o.enabled === true,
    dryRun: o.dryRun !== false,
    delayHours: num(o.delayHours, 1, 48, DEFAULT_FOLLOWUP_CONFIG.delayHours),
    maxPerRun: num(o.maxPerRun, 1, 200, DEFAULT_FOLLOWUP_CONFIG.maxPerRun),
  };
}

export interface Candidate { order_id: string; email: string; plan_key: string | null; created_at: string; consent_at: string | null }

/** Pure eligibility filter (unit-tested). */
export function selectEligible(
  orders: Candidate[],
  ctx: { paidEmails: Set<string>; suppressed: Set<string>; followedOrders: Set<string>; recentlyContacted: Set<string> },
  max: number
): { eligible: Candidate[]; skipped: { order_id: string; email: string; reason: string }[] } {
  const eligible: Candidate[] = [];
  const skipped: { order_id: string; email: string; reason: string }[] = [];
  const seenEmail = new Set<string>();
  for (const o of orders) {
    const email = o.email.trim().toLowerCase();
    if (ctx.followedOrders.has(o.order_id)) continue; // already handled — no record churn
    let reason: string | null = null;
    if (!o.consent_at) reason = "no consent record";
    else if (ctx.paidEmails.has(email)) reason = "purchased since";
    else if (ctx.suppressed.has(email)) reason = "unsubscribed";
    else if (isUndeliverable(email)) reason = "undeliverable";
    else if (ctx.recentlyContacted.has(email) || seenEmail.has(email)) reason = "frequency cap";
    else if (!o.plan_key || !PAY_CATALOG[o.plan_key]) reason = "unknown plan";
    if (reason) { skipped.push({ order_id: o.order_id, email, reason }); continue; }
    seenEmail.add(email);
    if (eligible.length < max) eligible.push(o);
  }
  return { eligible, skipped };
}

export function followupEmail(planKey: string, email: string) {
  const cat = PAY_CATALOG[planKey];
  const link = `https://taxsense.mnbresearch.com/pricing?utm_source=followup#plans`;
  return {
    subject: `Your TaxSense AI ${cat?.planLabel.split(" (")[0] ?? "plan"} checkout is still open`,
    html: brandedShell(
      "Did something go wrong at checkout?",
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">You started paying for <strong>${escHtml(cat?.blurb ?? "a TaxSense AI plan")}</strong> but the payment didn't complete. No money was taken for this order.</p>
       <p style="color:#44403c;font-size:14px;line-height:1.6;">If the payment page was blocked or timed out, you can pick up where you left off — or just reply to this email and we'll help you finish.</p>
       <p style="margin:18px 0;"><a href="${link}" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Complete my plan →</a></p>
       <p style="color:#a8a29e;font-size:11px;">You're receiving this one-time reminder because you started a checkout with ${escHtml(email)} and agreed to be contacted about it. We won't send another. <a href="${unsubUrl(email)}" style="color:#a8a29e;">Unsubscribe</a></p>`
    ),
  };
}

export async function loadConfig(sb: SupabaseClient): Promise<FollowupConfig> {
  const { data } = await sb.from("app_settings").select("value").eq("key", "checkout_followups").maybeSingle();
  return normalizeConfig(data?.value ?? DEFAULT_FOLLOWUP_CONFIG);
}

export async function runCheckoutFollowups(sb: SupabaseClient, opts: { force?: boolean } = {}):
  Promise<{ status: string; considered: number; sent: number; dryRun: number; skipped: number; failed: number }> {
  const cfg = await loadConfig(sb);
  const zero = { considered: 0, sent: 0, dryRun: 0, skipped: 0, failed: 0 };
  if (!cfg.enabled && !opts.force) return { status: "disabled", ...zero };
  const now = Date.now();
  const newest = new Date(now - cfg.delayHours * 3_600_000).toISOString();
  const oldest = new Date(now - 72 * 3_600_000).toISOString();
  const { data: orders, error } = await sb.from("payments").select("order_id, email, plan_key, created_at, consent_at")
    .eq("status", "created").lte("created_at", newest).gte("created_at", oldest).order("created_at").limit(500);
  if (error) return { status: `error: ${error.message.slice(0, 80)}`, ...zero };
  const list = (orders ?? []) as Candidate[];
  if (!list.length) return { status: "nothing to do", ...zero };
  const emails = [...new Set(list.map((o) => o.email.toLowerCase()))];
  const [paid, sup, fol, recent] = await Promise.all([
    sb.from("payments").select("email").eq("status", "paid").in("email", emails),
    sb.from("email_suppressions").select("email").in("email", emails),
    sb.from("checkout_followups").select("order_id").in("order_id", list.map((o) => o.order_id)),
    sb.from("checkout_followups").select("email").in("email", emails).in("status", ["sent", "dry_run"]).gte("created_at", new Date(now - 7 * 86_400_000).toISOString()),
  ]);
  const { eligible, skipped } = selectEligible(list, {
    paidEmails: new Set((paid.data ?? []).map((r: { email: string }) => r.email.toLowerCase())),
    suppressed: new Set((sup.data ?? []).map((r: { email: string }) => r.email.toLowerCase())),
    followedOrders: new Set((fol.data ?? []).map((r: { order_id: string }) => r.order_id)),
    recentlyContacted: new Set((recent.data ?? []).map((r: { email: string }) => r.email.toLowerCase())),
  }, cfg.maxPerRun);

  const out = { considered: list.length, sent: 0, dryRun: 0, skipped: skipped.length, failed: 0 };
  for (const s of skipped) await sb.from("checkout_followups").insert({ order_id: s.order_id, email: s.email, status: "skipped", reason: s.reason });
  for (const o of eligible) {
    const email = o.email.toLowerCase();
    // Claim first (primary key on order_id) so concurrent runs can't double-send.
    const claim = await sb.from("checkout_followups").insert({ order_id: o.order_id, email, status: cfg.dryRun ? "dry_run" : "sent", reason: cfg.dryRun ? "dry run — not sent" : null });
    if (claim.error) continue;
    await track("checkout_abandoned", { props: { plan_key: o.plan_key } });
    if (cfg.dryRun) { out.dryRun++; continue; }
    const msg = followupEmail(o.plan_key!, email);
    const r = await sendOne({ to: email, subject: msg.subject, html: msg.html, kind: "custom" });
    if (r.ok) out.sent++;
    else { out.failed++; await sb.from("checkout_followups").update({ status: "failed", reason: (r.error ?? "send failed").slice(0, 120) }).eq("order_id", o.order_id); }
  }
  return { status: cfg.dryRun ? "dry run" : "sent", ...out };
}
