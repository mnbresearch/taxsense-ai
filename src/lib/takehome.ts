/**
 * Batch 79 — CTC → monthly take-home, both regimes, on the real engine.
 *
 * Models the standard Indian CTC anatomy: employer PF (12% of basic) and
 * gratuity accrual (4.81% of basic) sit INSIDE the CTC figure but never in
 * your bank account; employee PF (12% of basic) leaves the payslip and
 * lands in 80C. Pure function — safe client-side.
 */
import { computeBoth } from "./tax-engine";
import type { ComparisonResult, TaxProfile } from "./tax-engine/types";

export interface TakeHomeInput {
  /** Annual CTC in ₹. */
  ctc: number;
  /** Basic (+DA) as a fraction of CTC (typical 0.35–0.50). */
  basicPct: number;
  /** CTC includes employer PF (12% of basic) — almost always true. */
  includesEmployerPf: boolean;
  /** CTC includes gratuity accrual (4.81% of basic) — common in larger firms. */
  includesGratuity: boolean;
  /** Monthly rent actually paid (0 = no HRA claim). */
  monthlyRent: number;
  /** Metro city (Delhi/Mumbai/Kolkata/Chennai) for the 50% HRA limb. */
  isMetroCity: boolean;
}

export interface TakeHomeResult {
  basic: number;
  employerPf: number;
  gratuity: number;
  /** Gross salary that reaches the payslip (CTC minus employer-side items). */
  gross: number;
  employeePf: number;
  professionalTax: number;
  cmp: ComparisonResult;
  /** Monthly in-hand under each regime (post PF, PT and income tax). */
  monthlyInHand: { old: number; new: number };
  annualTax: { old: number; new: number };
  recommended: "old" | "new";
}

export function takeHome(input: TakeHomeInput): TakeHomeResult {
  const ctc = Math.max(0, input.ctc);
  const basic = Math.round(ctc * Math.min(Math.max(input.basicPct, 0.2), 0.7));
  const employerPf = input.includesEmployerPf ? Math.round(basic * 0.12) : 0;
  const gratuity = input.includesGratuity ? Math.round(basic * 0.0481) : 0;
  const gross = Math.max(0, ctc - employerPf - gratuity);
  const employeePf = Math.round(basic * 0.12);
  const professionalTax = gross > 300000 ? 2400 : 0;
  // Typical structure: HRA component = 40% of basic (50% in metros).
  const hraReceived = Math.round(basic * (input.isMetroCity ? 0.5 : 0.4));

  const profile: TaxProfile = {
    age: 30,
    residentialStatus: "resident",
    salary: {
      grossSalary: gross,
      basicPlusDA: basic,
      hraReceived,
      rentPaid: Math.max(0, Math.round(input.monthlyRent * 12)),
      isMetroCity: input.isMetroCity,
      employerNpsContribution: 0,
      professionalTax,
    },
    houseProperties: [],
    deductions: {
      section80C: Math.min(employeePf, 150000),
      section80CCD1B: 0,
      section80D_selfFamily: 0,
      section80D_parents: 0,
      parentsAreSenior: false,
      section80E: 0,
      section80G: 0,
    },
    taxesPaid: 0,
  };

  const cmp = computeBoth(profile);
  const inHand = (regime: "old" | "new") =>
    Math.round((gross - employeePf - professionalTax - cmp[regime].totalTaxLiability) / 12);

  return {
    basic, employerPf, gratuity, gross, employeePf, professionalTax, cmp,
    monthlyInHand: { old: inHand("old"), new: inHand("new") },
    annualTax: { old: cmp.old.totalTaxLiability, new: cmp.new.totalTaxLiability },
    recommended: cmp.recommended,
  };
}
