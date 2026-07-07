import { NextRequest, NextResponse } from "next/server";
import { demoEvents, supabaseServer } from "@/lib/supabase/server";
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
    const event = `client_error:${String(type ?? "unknown").slice(0, 40)}`;
    const meta = { message: String(message ?? "").slice(0, 300) };
    const sb = supabaseServer();
    if (sb) await sb.from("audit_events").insert({ event, meta });
    else demoEvents.push({ event, at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
