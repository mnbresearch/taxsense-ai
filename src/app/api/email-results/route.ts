import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeBoth } from "@/lib/tax-engine";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { brandedShell, sendOne } from "@/lib/email";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const Input = z.object({
  email: z.string().email().max(120),
  profile: z.unknown(),
});

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/**
 * "Email me my results" (batch 14): sends the user a branded snapshot of
 * their old-vs-new comparison. Strictly rate-limited; nothing is stored.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`emailres:${clientKey(req)}`, { capacity: 3, refillPerMinute: 1 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited — try again in a minute" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "valid email + profile required" }, { status: 400 });
    const prof = safeParseProfile(parsed.data.profile);
    if (!prof.ok) return NextResponse.json({ error: "invalid profile" }, { status: 400 });

    const c = computeBoth(prof.profile);
    const winner = c.recommended === "new" ? "New regime" : "Old regime";
    const rows: [string, string][] = [
      ["Old regime tax", inr(c.old.totalTaxLiability)],
      ["New regime tax", inr(c.new.totalTaxLiability)],
      ["Recommended", `${winner} — saves ${inr(c.savings)}`],
      ["Total income (recommended)", inr(c[c.recommended].totalIncome)],
    ];
    const html = brandedShell(
      "Your tax snapshot — FY 2025-26",
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">Here's the comparison you computed on TaxSense AI:</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
         ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#78716c;border-bottom:1px solid #f5f5f4;">${k}</td><td style="padding:8px 0;color:#1c1917;font-weight:700;text-align:right;border-bottom:1px solid #f5f5f4;">${v}</td></tr>`).join("")}
       </table>
       <p style="margin:20px 0 6px;"><a href="https://taxsense-ai.vercel.app/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Continue in TaxSense AI →</a></p>
       <p style="color:#a8a29e;font-size:11px;line-height:1.6;margin-top:14px;">Figures are indicative, computed per the Income-tax Act, 1961 (Finance Act 2025). This snapshot was requested from the app; we did not store your data with this email.</p>`
    );
    const res = await sendOne({ to: parsed.data.email.toLowerCase(), subject: `Your TaxSense AI snapshot — ${winner} saves you ${inr(c.savings)}`, html, kind: "custom" });
    if (!res.ok) return NextResponse.json({ error: res.error === "RESEND_API_KEY not configured" ? "email not configured yet" : "send failed — try again" }, { status: 502 });
    return NextResponse.json({ ok: true, message: "Snapshot sent — check your inbox." });
  } catch {
    return NextResponse.json({ error: "could not send" }, { status: 400 });
  }
}
