import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { brandedShell, sendOne } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Batch 28 — magic-link sign-in.
 * Batch 75 — branded sign-in email: we generate the magic link + 6-digit
 * code server-side (admin.generateLink) and send ONE email via Resend that
 * carries TaxSense branding, the tap-to-open link AND the code — so sign-in
 * works from any device, not just the browser that requested it.
 * Falls back to Supabase's stock magic-link email if anything fails.
 */
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

  // Preferred: branded email with a device-independent 6-digit code.
  const admin = supabaseAdmin();
  if (admin && process.env.RESEND_API_KEY) {
    try {
      const opts = { redirectTo: `${origin}/auth/callback` };
      let link = await admin.auth.admin.generateLink({ type: "magiclink", email: e, options: opts });
      if (link.error && (link.error.status === 404 || /not.*found/i.test(link.error.message))) {
        const created = await admin.auth.admin.createUser({ email: e, email_confirm: true });
        if (!created.error) link = await admin.auth.admin.generateLink({ type: "magiclink", email: e, options: opts });
      }
      const otp = link.data?.properties?.email_otp;
      const actionLink = link.data?.properties?.action_link;
      if (!link.error && otp) {
        const html = brandedShell(
          "Your sign-in code",
          `<p style="color:#44403c;font-size:14px;line-height:1.6;">Type this code into the <strong>Sign in</strong> box on taxsense.mnbresearch.com — it works on any device:</p>
           <p style="background:#f0f7f4;border:1px solid #d6ede1;border-radius:10px;padding:16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#0d5947;margin:18px 0;">${otp}</p>
           ${actionLink ? `<p style="color:#44403c;font-size:13px;line-height:1.6;">On this device already? You can also just tap:</p>
           <p style="margin:10px 0 18px;"><a href="${actionLink}" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Sign me in →</a></p>` : ""}
           <p style="color:#78716c;font-size:12px;line-height:1.6;">The code expires in about an hour and can be used once. Didn't request it? You can safely ignore this email.</p>`
        );
        const sent = await sendOne({ to: e, subject: `${otp} is your TaxSense sign-in code`, html, kind: "confirmation" });
        if (sent.ok)
          return NextResponse.json({ message: `Code sent to ${e} — type the 6 digits below (works on any device).` });
      }
    } catch (err) {
      console.error("branded OTP send failed, falling back", err);
    }
  }

  // Fallback: Supabase's own magic-link email.
  const { error } = await sb.auth.signInWithOtp({
    email: e,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: `Magic link sent to ${e} — open it on this device to sign in.` });
}
