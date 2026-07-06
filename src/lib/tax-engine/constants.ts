/**
 * FY 2025-26 (AY 2026-27) statutory figures — Finance Act 2025.
 *
 * Every number below was verified against current sources on 2026-07-06:
 *  - Income Tax Dept (incometax.gov.in — "Salaried Individuals for AY 2026-27")
 *  - incometaxindia.gov.in (s.87A rebate FY 2025-26)
 *  - ClearTax / Tax2win slab & capital-gains guides for FY 2025-26
 *
 * Change tax years by swapping this config — the engine itself is year-agnostic.
 */

export interface SlabDef {
  upTo: number | null; // null = no upper bound
  ratePct: number;
}

/** s.115BAC(1A) — NEW regime slabs, FY 2025-26 (same for all ages). */
export const NEW_REGIME_SLABS: SlabDef[] = [
  { upTo: 400_000, ratePct: 0 },
  { upTo: 800_000, ratePct: 5 },
  { upTo: 1_200_000, ratePct: 10 },
  { upTo: 1_600_000, ratePct: 15 },
  { upTo: 2_000_000, ratePct: 20 },
  { upTo: 2_400_000, ratePct: 25 },
  { upTo: null, ratePct: 30 },
];

/** OLD regime slabs — unchanged for AY 2026-27. Basic exemption varies by age. */
export function oldRegimeSlabs(age: number): SlabDef[] {
  // <60: ₹2.5L | senior citizen 60–79: ₹3L | super senior 80+: ₹5L
  const basicExemption = age >= 80 ? 500_000 : age >= 60 ? 300_000 : 250_000;
  const slabs: SlabDef[] = [{ upTo: basicExemption, ratePct: 0 }];
  if (basicExemption < 500_000) slabs.push({ upTo: 500_000, ratePct: 5 });
  slabs.push({ upTo: 1_000_000, ratePct: 20 });
  slabs.push({ upTo: null, ratePct: 30 });
  return slabs;
}

export function basicExemptionLimit(regime: "old" | "new", age: number): number {
  if (regime === "new") return 400_000;
  return age >= 80 ? 500_000 : age >= 60 ? 300_000 : 250_000;
}

/** s.16(ia) standard deduction on salary/pension. */
export const STANDARD_DEDUCTION = { old: 50_000, new: 75_000 };

/** s.87A rebate — thresholds on TOTAL income; caps on rebate amount. */
export const REBATE_87A = {
  old: { incomeLimit: 500_000, maxRebate: 12_500 },
  // New regime (Finance Act 2025): income ≤ ₹12L → rebate up to ₹60k, with
  // marginal relief just above ₹12L. Rebate does NOT apply to special-rate
  // income (111A/112A/112) — Budget 2025 clarification.
  new: { incomeLimit: 1_200_000, maxRebate: 60_000 },
};

/** Capital-gains special rates (transfers on/after 23-Jul-2024, unchanged FY 2025-26). */
export const CG_RATES = {
  stcg111A_pct: 20, // was 15% pre-Jul-2024
  ltcg112A_pct: 12.5, // was 10%
  ltcg112A_exemption: 125_000,
  ltcgOther_pct: 12.5, // s.112, no indexation
};

/** Surcharge thresholds (on TOTAL income) → surcharge % on income-tax. */
export const SURCHARGE_BANDS = {
  old: [
    { above: 50_000_000, pct: 37 }, // > ₹5 cr
    { above: 20_000_000, pct: 25 }, // > ₹2 cr
    { above: 10_000_000, pct: 15 }, // > ₹1 cr
    { above: 5_000_000, pct: 10 }, // > ₹50 L
  ],
  // s.115BAC: surcharge capped at 25% in the new regime.
  new: [
    { above: 20_000_000, pct: 25 },
    { above: 10_000_000, pct: 15 },
    { above: 5_000_000, pct: 10 },
  ],
};

/** Surcharge on tax on 111A/112A/112 gains & dividends is capped at 15%. */
export const SURCHARGE_CAP_SPECIAL_PCT = 15;

/** Health & education cess — 4% on (tax + surcharge). */
export const CESS_PCT = 4;

/** Chapter VI-A caps. */
export const DEDUCTION_CAPS = {
  section80C: 150_000,
  section80CCD1B: 50_000,
  section80D_selfFamily_below60: 25_000,
  section80D_selfFamily_senior: 50_000,
  section80D_parents_below60: 25_000,
  section80D_parents_senior: 50_000,
  section80TTA: 10_000, // savings interest, age < 60
  section80TTB: 50_000, // savings + FD interest, age ≥ 60 (replaces 80TTA)
  /** 80CCD(2) employer NPS: % of basic+DA. */
  employerNpsPctOfBasic: { old: 10, new: 14 },
};

/** s.24(b): self-occupied home-loan interest cap (old regime only). */
export const SELF_OCCUPIED_INTEREST_CAP = 200_000;

/** s.71(3A): max house-property loss set-off against other heads (old regime). */
export const HP_LOSS_SETOFF_CAP = 200_000;

/** Family-pension standard deduction: 1/3 of pension, capped. */
export const FAMILY_PENSION_DEDUCTION_CAP = { old: 15_000, new: 25_000 };

/** s.288A — round total income to nearest ₹10; s.288B — round tax to nearest ₹10. */
export const round10 = (n: number) => Math.round(n / 10) * 10;
export const roundRupee = (n: number) => Math.round(n);
