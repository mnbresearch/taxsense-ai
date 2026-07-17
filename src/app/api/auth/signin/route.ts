import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Send a magic sign-in link (Batch 28 — first client-facing auth entry). */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`signin:${clientKey(req)}`, { capacity: 5, refillPerMinute: 1 });
  if (!rl.allowed) return NextResponse.json({ error: "too many attempts — try again in a minute" }, { status: 429 });
  const { email } = await req.json().catch(() => ({}));
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ message: "Demo mode — sign-in unavailable without Supabase." });
  const origin = req.nextUrl.origin;
  const { error } = await sb.auth.signInWithOtp({
    email: e,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: `Magic link sent to ${e} — open it on this device to sign in.` });
}
