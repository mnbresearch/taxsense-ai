/**
 * Smart insights (feature batch 3) — quantified, personal, engine-derived.
 *  - breakEven: exactly how much MORE old-regime deduction flips the regime call
 *  - harvesting: tax-free equity LTCG you can still realise this year (s.112A)
 *  - takeHome: monthly in-hand projection under the recommended regime
 */
import { computeBoth, CG_RATES, DEDUCTION_CAPS } from "../tax-engine";
import type { ComparisonResult, TaxProfile } from "../tax-engine";

const clone = (p: TaxProfile): TaxProfile => JSON.parse(JSON.stringify(p));
const fmt = (n: number) => n.toLocaleString("en-IN");

export interface BreakEvenInsight {
  kind: "breakEven";
  headline: string;
  detail: string;
  /** Extra deduction ₹ needed for old regime to equal new (null if old already wins or unreachable). */
  extraDeductionNeeded: number | null;
  achievableWithinCaps: boolean;
}

export interface HarvestInsight {
  kind: "harvest";
  headline: string;
  detail: string;
  headroom: number;
}

export interface TakeHomeInsight {
  kind: "takeHome";
  headline: string;
  detail: string;
  monthlyInHand: number;
}

export type Insight = BreakEvenInsight | HarvestInsight | TakeHomeInsight;

/** Tax under old regime with X extra generic VI-A deduction (uses 80G as carrier). */
function oldTaxWithExtra(profile: TaxProfile, extra: number): number {
  const p = clone(profile);
  p.deductions.section80G += extra;
  return computeBoth(p).old.totalTaxLiability;
}

export function breakEvenInsight(profile: TaxProfile, cmp: ComparisonResult): BreakEvenInsight | null {
  if (cmp.recommended === "old") return null; // old already wins — no flip needed
  const newTax = cmp.new.totalTaxLiability;
  const MAX = 1_000_000;
  if (oldTaxWithExtra(profile, MAX) > newTax) {
    return {
      kind: "breakEven",
      headline: "The new regime wins for you — decisively.",
      detail: "Even ₹10L of additional old-regime deductions wouldn't flip the answer. Stop hunting for proofs; invest for returns, not deductions.",
      extraDeductionNeeded: null,
      achievableWithinCaps: false,
    };
  }
  // binary search the flip point
  let lo = 0, hi = MAX;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (oldTaxWithExtra(profile, mid) > newTax) lo = mid;
    else hi = mid;
  }
  const need = Math.ceil(hi / 1000) * 1000;
  // headroom within common caps
  const d = profile.deductions;
  const headroom =
    (DEDUCTION_CAPS.section80C - Math.min(d.section80C, DEDUCTION_CAPS.section80C)) +
    (DEDUCTION_CAPS.section80CCD1B - Math.min(d.section80CCD1B, DEDUCTION_CAPS.section80CCD1B)) +
    ((profile.age >= 60 ? DEDUCTION_CAPS.section80D_selfFamily_senior : DEDUCTION_CAPS.section80D_selfFamily_below60) -
      Math.min(d.section80D_selfFamily, profile.age >= 60 ? DEDUCTION_CAPS.section80D_selfFamily_senior : DEDUCTION_CAPS.section80D_selfFamily_below60));
  const achievable = need <= headroom;
  return {
    kind: "breakEven",
    headline: `₹${fmt(need)} more in deductions would flip you to the old regime.`,
    detail: achievable
      ? `You have ₹${fmt(headroom)} of unused 80C/NPS/80D headroom — the flip is reachable if those investments suit you anyway.`
      : `Your unused 80C/NPS/80D headroom is only ₹${fmt(Math.max(0, headroom))} — the flip isn't reachable through standard caps, so the new regime stays right.`,
    extraDeductionNeeded: need,
    achievableWithinCaps: achievable,
  };
}

export function harvestInsight(profile: TaxProfile): HarvestInsight | null {
  const ltcg = profile.capitalGains?.ltcg112A ?? 0;
  const headroom = Math.max(0, CG_RATES.ltcg112A_exemption - ltcg);
  if (headroom <= 0 || !profile.capitalGains) return null;
  const saved = Math.round(headroom * (CG_RATES.ltcg112A_pct / 100) * 1.04);
  return {
    kind: "harvest",
    headline: `Harvest up to ₹${fmt(headroom)} of equity LTCG — completely tax-free.`,
    detail: `Sell and immediately rebuy long-held equity to use this year's unused s.112A exemption. Done every year, this move is worth ≈ ₹${fmt(saved)} in future tax per year, and it resets your cost basis higher.`,
    headroom,
  };
}

export function takeHomeInsight(profile: TaxProfile, cmp: ComparisonResult): TakeHomeInsight | null {
  const gross = profile.salary?.grossSalary ?? 0;
  if (gross <= 0) return null;
  const best = cmp[cmp.recommended];
  const monthly = Math.round((gross - best.totalTaxLiability) / 12);
  return {
    kind: "takeHome",
    headline: `≈ ₹${fmt(monthly)} in-hand per month under the ${cmp.recommended} regime.`,
    detail: `Gross ₹${fmt(gross)} − tax ₹${fmt(best.totalTaxLiability)}, spread across 12 months. (Before EPF/professional-tax payroll deductions — ask your payroll team to align monthly TDS so there's no year-end shock.)`,
    monthlyInHand: monthly,
  };
}

export function computeInsights(profile: TaxProfile, cmp: ComparisonResult): Insight[] {
  const out: Insight[] = [];
  const be = breakEvenInsight(profile, cmp);
  if (be) out.push(be);
  const hv = harvestInsight(profile);
  if (hv) out.push(hv);
  const th = takeHomeInsight(profile, cmp);
  if (th) out.push(th);
  return out;
}
