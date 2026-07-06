/**
 * TaxSense AI — Optimizer & what-if simulation engine (Session 2).
 *
 * Pure layer on top of the rules engine:
 *  - simulate(profile, variations): recompute liability under N mutations, ranked
 *  - optimize(profile): regime recommendation + concrete, quantified deduction moves
 */
import { computeBoth, DEDUCTION_CAPS } from "../tax-engine";
import type { ComparisonResult, TaxProfile } from "../tax-engine";

export interface WhatIfVariation {
  id: string;
  label: string;
  /** Immutable mutation of the profile. */
  apply: (p: TaxProfile) => TaxProfile;
  /** Cash the user must part with to execute the move (invest/spend), ₹. */
  cashOutlay: number;
}

export interface WhatIfResult {
  id: string;
  label: string;
  cashOutlay: number;
  comparison: ComparisonResult;
  /** Best-regime liability under this variation. */
  bestLiability: number;
  /** Tax saved vs the baseline best-regime liability. */
  taxSaved: number;
  /** taxSaved / cashOutlay — how hard each rupee works (Infinity for free moves). */
  savingsPerRupee: number;
}

export interface OptimizerReport {
  baseline: ComparisonResult;
  recommendedRegime: "old" | "new";
  regimeSavings: number;
  suggestions: WhatIfResult[];
  headline: string;
}

const clone = (p: TaxProfile): TaxProfile => JSON.parse(JSON.stringify(p));

/** Run N what-if variations and rank them by tax saved. */
export function simulate(profile: TaxProfile, variations: WhatIfVariation[]): WhatIfResult[] {
  const baseline = computeBoth(profile);
  const baseBest = Math.min(baseline.old.totalTaxLiability, baseline.new.totalTaxLiability);
  return variations
    .map((v) => {
      const comparison = computeBoth(v.apply(clone(profile)));
      const bestLiability = Math.min(
        comparison.old.totalTaxLiability,
        comparison.new.totalTaxLiability
      );
      const taxSaved = baseBest - bestLiability;
      return {
        id: v.id,
        label: v.label,
        cashOutlay: v.cashOutlay,
        comparison,
        bestLiability,
        taxSaved,
        savingsPerRupee: v.cashOutlay > 0 ? taxSaved / v.cashOutlay : taxSaved > 0 ? Infinity : 0,
      };
    })
    .sort((a, b) => b.taxSaved - a.taxSaved);
}

/** Build the standard candidate moves for a profile (headroom-aware). */
export function standardVariations(profile: TaxProfile): WhatIfVariation[] {
  const v: WhatIfVariation[] = [];
  const d = profile.deductions;

  const c80 = DEDUCTION_CAPS.section80C - Math.min(d.section80C, DEDUCTION_CAPS.section80C);
  if (c80 > 0) {
    for (const amt of dedupSteps(c80)) {
      v.push({
        id: `80c-${amt}`,
        label: `Invest ₹${fmt(amt)} more in 80C (ELSS/PPF/EPF)`,
        cashOutlay: amt,
        apply: (p) => ((p.deductions.section80C += amt), p),
      });
    }
  }

  const cNps =
    DEDUCTION_CAPS.section80CCD1B - Math.min(d.section80CCD1B, DEDUCTION_CAPS.section80CCD1B);
  if (cNps > 0)
    v.push({
      id: `nps-${cNps}`,
      label: `Contribute ₹${fmt(cNps)} to NPS under 80CCD(1B)`,
      cashOutlay: cNps,
      apply: (p) => ((p.deductions.section80CCD1B += cNps), p),
    });

  const selfCap =
    profile.age >= 60
      ? DEDUCTION_CAPS.section80D_selfFamily_senior
      : DEDUCTION_CAPS.section80D_selfFamily_below60;
  const c80d = selfCap - Math.min(d.section80D_selfFamily, selfCap);
  if (c80d > 0)
    v.push({
      id: `80d-${c80d}`,
      label: `Buy/upgrade health insurance — ₹${fmt(c80d)} more premium under 80D`,
      cashOutlay: c80d,
      apply: (p) => ((p.deductions.section80D_selfFamily += c80d), p),
    });

  const parentCap = d.parentsAreSenior
    ? DEDUCTION_CAPS.section80D_parents_senior
    : DEDUCTION_CAPS.section80D_parents_below60;
  const cPar = parentCap - Math.min(d.section80D_parents, parentCap);
  if (cPar > 0)
    v.push({
      id: `80d-parents-${cPar}`,
      label: `Insure parents — ₹${fmt(cPar)} premium under 80D`,
      cashOutlay: cPar,
      apply: (p) => ((p.deductions.section80D_parents += cPar), p),
    });

  // Equity LTCG harvesting: realise up to the ₹1.25L exemption "for free".
  const ltcg = profile.capitalGains?.ltcg112A ?? 0;
  if (ltcg > 0 && ltcg < 125_000)
    v.push({
      id: "ltcg-harvest",
      label: `Harvest ₹${fmt(125_000 - ltcg)} more equity LTCG tax-free (112A exemption headroom)`,
      cashOutlay: 0,
      apply: (p) => p, // informational — realising exempt gains doesn't change tax
    });

  return v;
}

function dedupSteps(headroom: number): number[] {
  const steps = [15_000, 50_000, headroom].filter((x) => x > 0 && x <= headroom);
  return [...new Set(steps)];
}

const fmt = (n: number) => n.toLocaleString("en-IN");

/** Full optimizer report: regime call + ranked deduction moves. */
export function optimize(profile: TaxProfile): OptimizerReport {
  const baseline = computeBoth(profile);
  const suggestions = simulate(profile, standardVariations(profile)).filter(
    (s) => s.taxSaved > 0
  );
  const headline =
    baseline.savings === 0
      ? "Both regimes give the same liability — pick the new regime for simpler filing."
      : `The ${baseline.recommended} regime saves you ₹${fmt(baseline.savings)}${
          suggestions[0]
            ? `; ${suggestions[0].label.toLowerCase()} would save ₹${fmt(suggestions[0].taxSaved)} more`
            : ""
        }.`;
  return {
    baseline,
    recommendedRegime: baseline.recommended,
    regimeSavings: baseline.savings,
    suggestions,
    headline,
  };
}
