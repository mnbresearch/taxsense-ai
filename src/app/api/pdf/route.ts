import { NextRequest, NextResponse } from "next/server";
import { computeBoth } from "@/lib/tax-engine";
import { optimize } from "@/lib/optimizer";
import { generateFilingSummaryPdf } from "@/lib/pdf/filingSummary";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { advanceTaxPlan } from "@/lib/tax-engine/advanceTax";
import { recommendItrForm } from "@/lib/tax-engine/itrForm";
import { computeInsights } from "@/lib/optimizer/insights";
import { supabaseServer, demoEvents } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`pdf:${clientKey(req)}`, { capacity: 10, refillPerMinute: 6 });
  if (!rl.allowed)
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } });
  try {
    const { profile: rawProfile, estimates, name } = await req.json();
    if (!rawProfile) return NextResponse.json({ error: "profile required" }, { status: 400 });
    const parsedP = safeParseProfile(rawProfile);
    if (!parsedP.ok) return NextResponse.json({ error: `invalid profile — ${parsedP.error}` }, { status: 400 });
    const profile = parsedP.profile;
    const comparison = computeBoth(profile);
    const optimizer = optimize(profile);
    const best = comparison[comparison.recommended];
    const adv = advanceTaxPlan(profile, best);
    const pdf = await generateFilingSummaryPdf({
      profile,
      comparison,
      optimizer,
      estimates,
      generatedFor: name,
      advanceTax: {
        applicable: adv.applicable,
        reason: adv.reason,
        installments: adv.installments,
        interest234C_ifAllMissed: adv.interest234C_ifAllMissed,
      },
      itr: recommendItrForm(profile, best.totalIncome),
      insights: computeInsights(profile, comparison),
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
