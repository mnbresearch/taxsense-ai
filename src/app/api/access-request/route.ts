import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { demoEvents, supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimitShared } from "@/lib/rateLimit";
import { isUndeliverable, sendAccessRequestEmails } from "@/lib/email";

export const runtime = "nodejs";

const Input = z.object({
  email: z.string().email().max(120),
  name: z.string().max(80).optional(),
  source: z.string().max(40).optional(),
  phone: z.string().max(20).regex(/^[+\d][\d\s\-()]{6,}$/, "invalid phone").optional(),
  // Free-text label from the pricing page; only ever stored on *lead* rows.
  plan: z.string().max(60).regex(/^(Pro|Business|Filed For You|Concierge)\b[^<>]*$/, "invalid plan").optional(),
  company: z.string().max(200).optional(), // honeypot
  consent: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimitShared(`access:${clientKey(req)}`, 5, 60, { capacity: 5, refillPerMinute: 2 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "please enter a valid email" }, { status: 400 });
    const { email, name, source, phone, plan, company, consent, marketing } = parsed.data;
    if (isUndeliverable(email)) return NextResponse.json({ error: "please enter a valid email" }, { status: 400 });
    if (consent !== true) return NextResponse.json({ error: "Please tick the consent box to continue." }, { status: 400 });
    // Honeypot: bots fill the hidden field — pretend success, store nothing.
    if (company) {
      return NextResponse.json({ ok: true, message: "You're on the list — access details land in your inbox at launch." });
    }
    const sb = supabaseAdmin();
    let notify = true;
    if (sb) {
      const row = { email: email.toLowerCase(), name, source: source ?? "landing", phone: phone ?? null, plan: plan ?? null, marketing_opt_in: marketing === true, consent_at: new Date().toISOString() };
      let { error } = await sb.from("access_requests").insert(row);
      // Defensive: tolerate un-applied migrations (0013 consent columns, then phone/plan).
      if (error && /column|schema/i.test(error.message)) {
        ({ error } = await sb.from("access_requests").insert({ email: row.email, name, source: row.source, phone: row.phone, plan: row.plan }));
      }
      if (error && /column|schema/i.test(error.message)) {
        ({ error } = await sb.from("access_requests").insert({ email: row.email, name, source: row.source }));
      }
      if (error) {
        if (!error.message.includes("duplicate")) {
          return NextResponse.json({ error: "could not save — try again" }, { status: 500 });
        }
        // Existing lead: a plan/phone request is an upgrade — update the row and
        // still notify; a plain re-signup stays silent (no duplicate emails).
        // SECURITY: only un-activated leads may be updated from this public,
        // unauthenticated route. Active/paid rows are never touched here —
        // otherwise anyone could rewrite another member's plan.
        if (marketing === true) {
          await sb.from("access_requests").update({ marketing_opt_in: true }).eq("email", email.toLowerCase()).eq("status", "lead");
        }
        if (plan || phone) {
          await sb
            .from("access_requests")
            .update({ phone: phone ?? null, plan: plan ?? null, ...(name ? { name } : {}), source: source ?? "landing" })
            .eq("email", email.toLowerCase())
            .eq("status", "lead");
        } else {
          notify = false;
        }
      }
    } else {
      demoEvents.push({ event: `access_request:${email.toLowerCase()}`, at: new Date().toISOString() });
    }
    // Notify admin + confirm to requester via Resend. Never blocks or breaks the UI.
    if (notify) await sendAccessRequestEmails({ email, name, source: source ?? "landing", extra: { Phone: phone, Plan: plan } });
    return NextResponse.json({ ok: true, message: "You're on the list — access details land in your inbox at launch." });
  } catch {
    return NextResponse.json({ error: "could not save — try again" }, { status: 400 });
  }
}
