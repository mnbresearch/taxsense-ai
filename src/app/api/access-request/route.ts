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
  company: z.string().max(200).optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`access:${clientKey(req)}`, { capacity: 5, refillPerMinute: 3 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "please enter a valid email" }, { status: 400 });
    const { email, name, source, company } = parsed.data;
    // Honeypot: bots fill the hidden field — pretend success, store nothing.
    if (company) {
      return NextResponse.json({ ok: true, message: "You're on the list — access details land in your inbox at launch." });
    }
    const sb = supabaseAdmin();
    let isNew = true;
    if (sb) {
      const { error } = await sb.from("access_requests").insert({ email: email.toLowerCase(), name, source: source ?? "landing" });
      if (error) {
        if (!error.message.includes("duplicate")) {
          return NextResponse.json({ error: "could not save — try again" }, { status: 500 });
        }
        isNew = false; // already on the list — don't re-email
      }
    } else {
      demoEvents.push({ event: `access_request:${email.toLowerCase()}`, at: new Date().toISOString() });
    }
    // Notify admin + confirm to requester via Resend. Never blocks or breaks the UI.
    if (isNew) await sendAccessRequestEmails({ email, name, source: source ?? "landing" });
    return NextResponse.json({ ok: true, message: "You're on the list — access details land in your inbox at launch." });
  } catch {
    return NextResponse.json({ error: "could not save — try again" }, { status: 400 });
  }
}
