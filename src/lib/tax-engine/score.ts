import type { ComparisonResult, TaxProfile } from "./types";
import { DEDUCTION_CAPS } from "./constants";

/**
 * Tax Health Score (batch 16) — a deterministic 0–100 "CIBIL for your taxes".
 * Six dimensions, each with an actionable tip when points are left on the table.
 * Pure function: same profile → same score, fully unit-testable.
 */

export interface ScoreDimension {
  key: string;
  label: string;
  earned: number;
  max: number;
  tip?: string;
}

export interface TaxHealthScore {
  score: number; // 0–100, rounded
  grade: "A+" | "A" | "B" | "C" | "D";
  headline: string;
  dimensions: ScoreDimension[];
}

const r = (n: number) => Math.round(n);

export function computeTaxScore(profile: TaxProfile, cmp: ComparisonResult): TaxHealthScore {
  const d = profile.deductions;
  const dims: ScoreDimension[] = [];
  const liability = cmp[cmp.recommended].totalTaxLiability;
  const oldRegimeRelevant = cmp.recommended === "old" || cmp.savings < 25_000;

  // 1. 80C basket (20)
  {
    const cap = DEDUCTION_CAPS.section80C;
    const used = Math.min(d.section80C, cap);
    const earned = r((used / cap) * 20);
    dims.push({
      key: "s80c", label: "80C basket (PPF, ELSS, EPF…)", earned, max: 20,
      tip: earned < 20 && oldRegimeRelevant ? `₹${(cap - used).toLocaleString("en-IN")} of 80C room unused — matters if you file old regime.` : undefined,
    });
  }

  // 2. Health insurance 80D (15)
  {
    const cap = profile.age >= 60 ? 50_000 : 25_000;
    const used = Math.min(d.section80D_selfFamily, cap);
    const earned = r((used / cap) * 15);
    dims.push({
      key: "s80d", label: "Health insurance (80D)", earned, max: 15,
      tip: earned === 0 ? "No health premium entered — cover protects your family AND deducts up to ₹25k (₹50k senior)." : undefined,
    });
  }

  // 3. Self NPS 80CCD(1B) (15)
  {
    const cap = DEDUCTION_CAPS.section80CCD1B;
    const used = Math.min(d.section80CCD1B, cap);
    const earned = r((used / cap) * 15);
    dims.push({
      key: "nps1b", label: "Self NPS (80CCD-1B)", earned, max: 15,
      tip: earned < 15 && oldRegimeRelevant ? `Up to ₹${(cap - used).toLocaleString("en-IN")} more NPS deducts beyond the 80C cap.` : undefined,
    });
  }

  // 4. Employer NPS 80CCD(2) — works in BOTH regimes (15)
  {
    const has = (profile.salary?.employerNpsContribution ?? 0) > 0;
    const earned = profile.salary ? (has ? 15 : 0) : 15; // non-salaried: not applicable, full marks
    dims.push({
      key: "enps", label: "Employer NPS (80CCD-2)", earned, max: 15,
      tip: profile.salary && !has ? "The one big deduction the NEW regime keeps — ask HR to restructure (see CTC Designer)." : undefined,
    });
  }

  // 5. Advance-tax / TDS coverage (20)
  {
    let earned = 20;
    if (liability > 10_000) {
      const coverage = Math.min(profile.taxesPaid / liability, 1);
      earned = r(coverage * 20);
    }
    dims.push({
      key: "advtax", label: "Tax already paid (TDS/advance)", earned, max: 20,
      tip: earned < 12 && liability > 10_000 ? "Big unpaid balance → 234B/234C interest risk. Check the advance-tax calendar." : undefined,
    });
  }

  // 6. Regime clarity (15) — you've computed both regimes; penalty only if flying blind on big savings
  {
    const earned = 15; // by the time this is computed, both regimes are known
    dims.push({
      key: "regime", label: "Regime choice, computed not guessed", earned, max: 15,
      tip: cmp.savings > 25_000 ? `Picking the wrong regime here costs ₹${cmp.savings.toLocaleString("en-IN")} — file as recommended.` : undefined,
    });
  }

  const total = dims.reduce((s, x) => s + x.earned, 0);
  const max = dims.reduce((s, x) => s + x.max, 0);
  const score = r((total / max) * 100);
  const grade = score >= 85 ? "A+" : score >= 70 ? "A" : score >= 55 ? "B" : score >= 40 ? "C" : "D";
  const headline =
    grade === "A+" ? "Tax-fit. You're squeezing nearly every legal rupee." :
    grade === "A" ? "Strong — a couple of easy moves left on the table." :
    grade === "B" ? "Decent, but you're leaving real money unclaimed." :
    grade === "C" ? "Under-optimised — the tips below are worth thousands." :
    "Flying blind — start with the two biggest tips below.";

  return { score, grade, headline, dimensions: dims };
}
