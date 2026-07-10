import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { demoEvents, supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const Input = z.object({
  email: z.string().email().max(120),
  name: z.string().max(80).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`access:${clientKey(req)}`, { capacity: 5, refillPerMinute: 3 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "please enter a valid email" }, { status: 400 });
    const { email, name, source } = parsed.data;
    const sb = supabaseAdmin();
    if (sb) {
      const { error } = await sb.from("access_requests").insert({ email: email.toLowerCase(), name, source: source ?? "landing" });
      if (error && !error.message.includes("duplicate")) {
        return NextResponse.json({ error: "could not save — try again" }, { status: 500 });
      }
    } else {
      demoEvents.push({ event: `access_request:${email.toLowerCase()}`, at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, message: "You're on the list — access details land in your inbox at launch." });
  } catch {
    return NextResponse.json({ error: "could not save — try again" }, { status: 400 });
  }
}
