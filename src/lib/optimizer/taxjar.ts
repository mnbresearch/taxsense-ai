/**
 * Tax Jar (feature batch 9) — the freelancer/business cash-flow companion.
 * "I've earned X so far this year — how much should I be setting aside?"
 *
 * Annualizes receipts-to-date, runs the REAL engine on the projection,
 * and turns the answer into a monthly set-aside plus installment status.
 */
import { computeBoth, emptyProfile } from "../tax-engine";
import { advanceTaxPlan } from "../tax-engine/advanceTax";
import type { TaxProfile } from "../tax-engine";

export interface TaxJarInput {
  /** Gross receipts / turnover collected so far this FY. */
  receiptsToDate: number;
  /** FY months elapsed (Apr=1 … Mar=12). */
  monthsElapsed: number;
  kind: "business" | "professional";
  /** Under presumptive scheme? (44AD / 44ADA) */
  presumptive: boolean;
  /** For 44AD: share of digital receipts, 0..1 (blends the 6%/8% rate). */
  digitalShare?: number;
  /** Advance tax already paid this year. */
  taxPaidSoFar?: number;
  age?: number;
}

export interface TaxJarReport {
  projectedAnnualReceipts: number;
  projectedTaxableIncome: number;
  projectedTax: number;
  regime: "old" | "new";
  remainingTax: number;
  monthsLeft: number;
  setAsidePerMonth: number;
  /** % of every incoming rupee to move to the jar for the rest of the year. */
  jarRatePct: number;
  nextInstallment: { dueDate: string; amount: number } | null;
  notes: string[];
}

export function taxJar(input: TaxJarInput): TaxJarReport {
  const months = Math.min(12, Math.max(1, Math.floor(input.monthsElapsed)));
  const monthsLeft = Math.max(1, 12 - months);
  const projected = Math.round((input.receiptsToDate / months) * 12);
  const notes: string[] = [];

  // taxable income under the chosen computation
  let taxable: number;
  if (input.presumptive) {
    if (input.kind === "professional") {
      taxable = Math.round(projected * 0.5);
      notes.push("44ADA: 50% of gross receipts presumed as income.");
    } else {
      const ds = Math.min(1, Math.max(0, input.digitalShare ?? 1));
      taxable = Math.round(projected * (0.06 * ds + 0.08 * (1 - ds)));
      notes.push(`44AD: ${Math.round(ds * 100)}% digital receipts → blended presumptive rate ${(6 * ds + 8 * (1 - ds)).toFixed(1)}%.`);
    }
  } else {
    // conservative default for books cases: assume 25% net margin, tell the user
    taxable = Math.round(projected * 0.25);
    notes.push("Regular books: assumed a 25% net margin for projection — replace with your real margin for precision.");
  }

  const profile: TaxProfile = {
    ...emptyProfile(),
    age: input.age ?? 30,
    business: { netIncome: taxable, presumptive: input.presumptive },
    taxesPaid: 0,
  };
  const cmp = computeBoth(profile);
  const best = cmp[cmp.recommended];
  const projectedTax = best.totalTaxLiability;
  const remaining = Math.max(0, projectedTax - (input.taxPaidSoFar ?? 0));
  const setAside = Math.ceil(remaining / monthsLeft / 100) * 100;
  const monthlyRunRate = input.receiptsToDate / months;
  const jarRatePct = monthlyRunRate > 0 ? Math.min(60, Math.ceil((setAside / monthlyRunRate) * 100)) : 0;

  const adv = advanceTaxPlan({ ...profile, taxesPaid: input.taxPaidSoFar ?? 0 }, best);
  const today = new Date();
  const next = adv.applicable
    ? adv.installments.find((i) => new Date(i.dueDate) >= today) ?? adv.installments[adv.installments.length - 1] ?? null
    : null;

  if (input.presumptive) notes.push("Presumptive privilege: your entire advance tax is one installment, due 15 March.");
  if (remaining === 0) notes.push("You're already covered for the projected year — anything more you pay comes back as a refund.");

  return {
    projectedAnnualReceipts: projected,
    projectedTaxableIncome: taxable,
    projectedTax,
    regime: cmp.recommended,
    remainingTax: remaining,
    monthsLeft,
    setAsidePerMonth: setAside,
    jarRatePct,
    nextInstallment: next ? { dueDate: next.dueDate, amount: Math.min(next.cumulativeAmount - (input.taxPaidSoFar ?? 0), remaining) } : null,
    notes,
  };
}
