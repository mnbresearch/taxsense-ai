import { NextRequest, NextResponse } from "next/server";
import { computeBoth } from "@/lib/tax-engine";
import { optimize } from "@/lib/optimizer";
import { generateFilingSummaryPdf } from "@/lib/pdf/filingSummary";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { advanceTaxPlan } from "@/lib/tax-engine/advanceTax";
import { recommendItrForm } from "@/lib/tax-engine/itrForm";
import { computeInsights } from "@/lib/optimizer/insights";
import { supabaseServer, demoEvents } from "@/lib/supabase/server";
import { freeEntitlements, getEntitlementsForEmail } from "@/lib/entitlements";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`pdf:${clientKey(req)}`, { capacity: 10, refillPerMinute: 6 });
  if (!rl.allowed)
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } });

  // Batch 28 — plan gating: free tier gets a couple of PDFs a day; any
  // active paid plan is unlimited (within the abuse rate limit above).
  const sbEnt = supabaseServer();
  let ent = freeEntitlements();
  if (sbEnt) {
    const { data } = await sbEnt.auth.getUser();
    ent = await getEntitlementsForEmail(data.user?.email);
  }
  if (ent.features.pdfPerDay !== null) {
    const cap = ent.features.pdfPerDay;
    const daily = rateLimit(`pdfday:${ent.email ?? clientKey(req)}`, { capacity: cap, refillPerMinute: cap / 1440 });
    if (!daily.allowed)
      return NextResponse.json(
        {
          error: `You've used your ${cap} free filing summaries for today. Pro (₹399/mo) removes the limit.`,
          upgrade: true,
        },
        { status: 402 }
      );
  }
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
      if (data.user) {
        await sb.from("audit_events").insert({ user_id: data.user.id, event: "pdf_generated" });
        // Batch 30 — PDF history: snapshot the exact inputs for re-download.
        await sb.from("pdf_history").insert({
          user_id: data.user.id,
          profile,
          estimates: estimates ?? null,
          regime: comparison.recommended,
          total_tax: best.totalTaxLiability,
        });
      }
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
