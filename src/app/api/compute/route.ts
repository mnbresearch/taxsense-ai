import { NextRequest, NextResponse } from "next/server";
import { computeBoth } from "@/lib/tax-engine";
import { advanceTaxPlan } from "@/lib/tax-engine/advanceTax";
import { recommendItrForm } from "@/lib/tax-engine/itrForm";
import { optimize } from "@/lib/optimizer";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`compute:${clientKey(req)}`, { capacity: 60, refillPerMinute: 60 });
  if (!rl.allowed)
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } });
  try {
    const { profile } = await req.json();
    if (!profile) return NextResponse.json({ error: "profile required" }, { status: 400 });
    const comparison = computeBoth(profile);
    const optimizer = optimize(profile);
    const best = comparison[comparison.recommended];
    const advanceTax = advanceTaxPlan(profile, best);
    const itr = recommendItrForm(profile, best.totalIncome);
    return NextResponse.json({
      comparison,
      optimizer,
      advanceTax: {
        applicable: advanceTax.applicable,
        reason: advanceTax.reason,
        netTaxAfterTds: advanceTax.netTaxAfterTds,
        presumptiveSchedule: advanceTax.presumptiveSchedule,
        installments: advanceTax.installments,
        interest234C_ifAllMissed: advanceTax.interest234C_ifAllMissed,
        interest234B_4months: advanceTax.interest234B_ifUnpaid(4),
        notes: advanceTax.notes,
      },
      itr,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "compute failed" }, { status: 500 });
  }
}
