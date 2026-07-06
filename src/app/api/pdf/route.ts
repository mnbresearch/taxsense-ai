import { NextRequest, NextResponse } from "next/server";
import { computeBoth } from "@/lib/tax-engine";
import { optimize } from "@/lib/optimizer";
import { generateFilingSummaryPdf } from "@/lib/pdf/filingSummary";
import { supabaseServer, demoEvents } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`pdf:${clientKey(req)}`, { capacity: 10, refillPerMinute: 6 });
  if (!rl.allowed)
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } });
  try {
    const { profile, estimates, name } = await req.json();
    if (!profile) return NextResponse.json({ error: "profile required" }, { status: 400 });
    const comparison = computeBoth(profile);
    const optimizer = optimize(profile);
    const pdf = await generateFilingSummaryPdf({
      profile,
      comparison,
      optimizer,
      estimates,
      generatedFor: name,
    });

    const sb = supabaseServer();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data.user)
        await sb.from("audit_events").insert({ user_id: data.user.id, event: "pdf_generated" });
    } else {
      demoEvents.push({ event: "pdf_generated", at: new Date().toISOString() });
    }

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="taxsense-filing-summary.pdf"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "pdf failed" }, { status: 500 });
  }
}
