import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Batch 74 — device-independent sign-in: verify the 6-digit code from the
 * sign-in email. Unlike the magic link, this works from ANY browser or
 * device — no PKCE cookie required.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`verify:${clientKey(req)}`, { capacity: 8, refillPerMinute: 2 });
  if (!rl.allowed) return NextResponse.json({ error: "too many attempts — wait a minute" }, { status: 429 });
  const { email, code } = await req.json().catch(() => ({}));
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  const token = typeof code === "string" ? code.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || !/^\d{6}$/.test(token))
    return NextResponse.json({ error: "valid email and 6-digit code required" }, { status: 400 });
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ error: "demo mode — sign-in unavailable" }, { status: 500 });
  // Batch 75 — the code may come from signInWithOtp ("email") or from
  // admin.generateLink type "magiclink"; accept both token types.
  let { data, error } = await sb.auth.verifyOtp({ email: e, token, type: "email" });
  if (error || !data.session) {
    const second = await sb.auth.verifyOtp({ email: e, token, type: "magiclink" });
    data = second.data;
    error = second.error;
  }
  if (error || !data.session)
    return NextResponse.json({ error: error?.message ?? "invalid or expired code" }, { status: 401 });
  return NextResponse.json({ ok: true, email: e });
}
