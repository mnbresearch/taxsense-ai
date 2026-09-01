/**
 * Batch 93 — the 60-second Tax Check (landing lead magnet).
 * Pure: quick salary profile → both regimes + honestly-computed savings:
 *  - "overpaying now": their declared regime vs the better one, and
 *  - "with two moves": best tax after topping 80C to ₹1.5L + ₹50k NPS,
 * all recomputed through the real engine — no rules of thumb.
 */
import { computeBoth } from "./tax-engine";
import type { TaxProfile } from "./tax-engine/types";

export interface QuickCheckInput {
  /** Annual gross income (salary), ₹. */
  income: number;
  /** Monthly rent paid (0 = none). */
  rentMonthly: number;
  metro: boolean;
  /** 80C already invested (PF/PPF/ELSS/LIC), ₹. */
  ded80C: number;
  /** Regime they filed last year. */
  currentRegime: "new" | "old" | "unsure";
}

export interface QuickCheckResult {
  oldTax: number;
  newTax: number;
  recommended: "old" | "new";
  bestTax: number;
  /** Extra they pay if they stick to their declared (worse) regime. */
  overpayingNow: number;
  /** Further saving available from topping 80C to 1.5L + 50k NPS (old-regime path). */
  movesSaving: number;
  totalOpportunity: number;
}

function profileFor(i: QuickCheckInput, ded80C: number, nps1B: number): TaxProfile {
  const basic = Math.round(i.income * 0.5);
  return {
    age: 30,
    residentialStatus: "resident",
    salary: {
      grossSalary: i.income,
      basicPlusDA: basic,
      hraReceived: Math.round(basic * (i.metro ? 0.5 : 0.4)),
      rentPaid: Math.max(0, Math.round(i.rentMonthly * 12)),
      isMetroCity: i.metro,
      employerNpsContribution: 0,
      professionalTax: i.income > 300000 ? 2400 : 0,
    },
    houseProperties: [],
    deductions: {
      section80C: Math.min(Math.max(0, ded80C), 150000),
      section80CCD1B: Math.min(Math.max(0, nps1B), 50000),
      section80D_selfFamily: 0,
      section80D_parents: 0,
      parentsAreSenior: false,
      section80E: 0,
      section80G: 0,
    },
    taxesPaid: 0,
  };
}

export function quickCheck(i: QuickCheckInput): QuickCheckResult {
  const now = computeBoth(profileFor(i, i.ded80C, 0));
  const oldTax = now.old.totalTaxLiability;
  const newTax = now.new.totalTaxLiability;
  const recommended = now.recommended;
  const bestTax = now[recommended].totalTaxLiability;

  let overpayingNow = 0;
  if (i.currentRegime === "old") overpayingNow = Math.max(0, oldTax - bestTax);
  else if (i.currentRegime === "new") overpayingNow = Math.max(0, newTax - bestTax);

  const withMoves = computeBoth(profileFor(i, 150000, 50000));
  const bestWithMoves = withMoves[withMoves.recommended].totalTaxLiability;
  const movesSaving = Math.max(0, bestTax - bestWithMoves);

  return { oldTax, newTax, recommended, bestTax, overpayingNow, movesSaving, totalOpportunity: overpayingNow + movesSaving };
}
