import { NextRequest, NextResponse } from "next/server";
import { demoEvents, supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Client error telemetry (feature batch 4).
 * The app posts one compact event per client-side error — no stack PII,
 * no user financial data, aggressively rate-limited.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`tel:${clientKey(req)}`, { capacity: 5, refillPerMinute: 2 });
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });
  try {
    const { type, message } = await req.json();
    const t = String(type ?? "unknown").slice(0, 40);
    // product events vs client errors, both PII-free
    const event = ["guide_complete", "share_created", "feedback_up", "feedback_down"].includes(t) ? t : `client_error:${t}`;
    const meta = { message: String(message ?? "").slice(0, 300) };
    const sb = supabaseAdmin(); // service role — audit_events has no anon-insert policy by design
    if (sb) await sb.from("audit_events").insert({ event, meta });
    else demoEvents.push({ event, at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
