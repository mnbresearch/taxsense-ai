import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { demoEvents, supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { sendAccessRequestEmails } from "@/lib/email";

export const runtime = "nodejs";

const Input = z.object({
  email: z.string().email().max(120),
  name: z.string().max(80).optional(),
  source: z.string().max(40).optional(),
  phone: z.string().max(20).regex(/^[+\d][\d\s\-()]{6,}$/, "invalid phone").optional(),
  plan: z.string().max(40).optional(),
  company: z.string().max(200).optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`access:${clientKey(req)}`, { capacity: 5, refillPerMinute: 3 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "please enter a valid email" }, { status: 400 });
    const { email, name, source, phone, plan, company } = parsed.data;
    // Honeypot: bots fill the hidden field — pretend success, store nothing.
    if (company) {
      return NextResponse.json({ ok: true, message: "You're on the list — access details land in your inbox at launch." });
    }
    const sb = supabaseAdmin();
    let notify = true;
    if (sb) {
      const row = { email: email.toLowerCase(), name, source: source ?? "landing", phone: phone ?? null, plan: plan ?? null };
      let { error } = await sb.from("access_requests").insert(row);
      // Defensive: if the phone/plan migration hasn't run yet, fall back to base columns.
      if (error && /column|schema/i.test(error.message)) {
        ({ error } = await sb.from("access_requests").insert({ email: row.email, name, source: row.source }));
      }
      if (error) {
        if (!error.message.includes("duplicate")) {
          return NextResponse.json({ error: "could not save — try again" }, { status: 500 });
        }
        // Existing lead: a plan/phone request is an upgrade — update the row and
        // still notify; a plain re-signup stays silent (no duplicate emails).
        if (plan || phone) {
          await sb.from("access_requests").update({ phone: phone ?? null, plan: plan ?? null, ...(name ? { name } : {}), source: source ?? "landing" }).eq("email", email.toLowerCase());
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
