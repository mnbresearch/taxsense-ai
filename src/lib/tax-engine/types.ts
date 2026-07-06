/**
 * TaxSense AI — Core domain model
 * FY 2025-26 (AY 2026-27), Indian Income-tax Act, 1961 (as amended by Finance Act 2025).
 *
 * All amounts are in whole rupees (₹). The engine is pure & deterministic:
 * profile in → computation out. No I/O, no side effects.
 */

export type Regime = "old" | "new";

/** Residential status. The engine currently models resident individuals. */
export type ResidentialStatus = "resident" | "nri";

/** Section 17 salary income, modelled at the level users actually know. */
export interface SalaryIncome {
  /** Gross salary: basic + DA + HRA + all allowances + bonus + perquisites (before any exemption). */
  grossSalary: number;
  /** Basic + Dearness Allowance — the base for HRA exemption and NPS (80CCD(2)) caps. */
  basicPlusDA: number;
  /** HRA component actually received (part of grossSalary). */
  hraReceived: number;
  /** Annual rent actually paid. */
  rentPaid: number;
  /** Metro (Delhi/Mumbai/Kolkata/Chennai) → 50% of basic+DA in the HRA formula, else 40%. */
  isMetroCity: boolean;
  /** Employer's NPS contribution — deductible u/s 80CCD(2) in BOTH regimes. */
  employerNpsContribution: number;
  /** Professional tax paid — deductible u/s 16(iii), OLD regime only. */
  professionalTax: number;
}

export type HousePropertyUse = "self-occupied" | "let-out";

export interface HouseProperty {
  use: HousePropertyUse;
  /** Annual rent received (0 for self-occupied). */
  annualRent: number;
  /** Municipal taxes actually paid by the owner during the year. */
  municipalTaxes: number;
  /** Interest paid on housing loan for the year — s.24(b). */
  homeLoanInterest: number;
}

/**
 * Capital gains, split by the special-rate buckets that matter after
 * Finance (No.2) Act 2024 (rates apply to transfers on/after 23-Jul-2024).
 */
export interface CapitalGains {
  /** STCG on STT-paid listed equity / equity MF — s.111A @ 20%. */
  stcg111A: number;
  /** Other STCG (debt funds, property < holding period, etc.) — taxed at slab rates. */
  stcgOther: number;
  /** LTCG on STT-paid listed equity / equity MF — s.112A @ 12.5% above ₹1,25,000 exemption. */
  ltcg112A: number;
  /** Other LTCG (property, gold, unlisted, debt pre-2023 …) — s.112 @ 12.5% (no indexation, post 23-Jul-2024). */
  ltcgOther: number;
}

export interface BusinessIncome {
  /** Net taxable business/professional income (after 44AD/44ADA presumption if applicable). */
  netIncome: number;
  /** Whether computed under presumptive scheme (affects doc checklist, not tax math). */
  presumptive: boolean;
}

export interface OtherSources {
  /** Savings-account interest (eligible for 80TTA / counts toward 80TTB). */
  savingsInterest: number;
  /** FD/RD/other interest (counts toward 80TTB for seniors). */
  fdInterest: number;
  /** Dividends (taxed at slab; surcharge on this portion capped at 15%). */
  dividends: number;
  /** Family pension received (std. deduction: 1/3 capped ₹15k old / ₹25k new). */
  familyPension: number;
  /** Anything else taxable under "Other sources". */
  other: number;
}

/** Chapter VI-A investments/payments as CLAIMED by the user (engine applies statutory caps). */
export interface DeductionInputs {
  /** 80C basket: EPF, PPF, ELSS, LIC, principal repayment, tuition, NSC … (cap ₹1.5L). */
  section80C: number;
  /** 80CCD(1B): self NPS over and above 80C (cap ₹50k). */
  section80CCD1B: number;
  /** 80D: health insurance premium — self/spouse/children. */
  section80D_selfFamily: number;
  /** 80D: health insurance premium — parents. */
  section80D_parents: number;
  /** Parents ≥ 60 → 80D parents cap ₹50k instead of ₹25k. */
  parentsAreSenior: boolean;
  /** 80E: education-loan interest (no cap). */
  section80E: number;
  /** 80G: eligible donations (entered post-qualifying-limit; engine takes as given). */
  section80G: number;
}

export interface TaxProfile {
  /** Display name for reports. */
  name?: string;
  age: number;
  residentialStatus: ResidentialStatus;
  salary?: SalaryIncome;
  houseProperties: HouseProperty[];
  capitalGains?: CapitalGains;
  business?: BusinessIncome;
  otherSources?: OtherSources;
  deductions: DeductionInputs;
  /** TDS + advance tax already paid (for refund/payable display only). */
  taxesPaid: number;
}

/* ------------------------------- Results ------------------------------- */

export interface SlabLine {
  from: number;
  to: number | null;
  ratePct: number;
  taxableInSlab: number;
  tax: number;
}

export interface HeadwiseIncome {
  salary: number;
  houseProperty: number; // can be negative (old regime, capped set-off)
  capitalGains: number;
  business: number;
  otherSources: number;
}

export interface SpecialRateTax {
  stcg111A: { taxable: number; ratePct: number; tax: number };
  ltcg112A: { taxable: number; ratePct: number; tax: number };
  ltcgOther: { taxable: number; ratePct: number; tax: number };
}

export interface RegimeComputation {
  regime: Regime;
  /** Income under each head after head-level deductions/exemptions. */
  heads: HeadwiseIncome;
  /** Exemptions applied at the salary head (HRA etc.) — for the audit trail. */
  salaryExemptions: { hraExempt: number; standardDeduction: number; professionalTax: number };
  grossTotalIncome: number;
  /** Chapter VI-A actually allowed (post caps, post special-income restriction). */
  deductionsAllowed: Record<string, number>;
  totalDeductions: number;
  /** Total income (taxable income) after Chapter VI-A, rounded to nearest ₹10 (s.288A). */
  totalIncome: number;
  /** Portion of total income taxed at slab rates. */
  normalIncome: number;
  /** Unused basic-exemption shifted against special-rate income (residents). */
  basicExemptionAdjustment: number;
  slabLines: SlabLine[];
  taxOnNormalIncome: number;
  specialRateTax: SpecialRateTax;
  taxBeforeRebate: number;
  rebate87A: number;
  /** s.87A marginal relief (new regime, income just above ₹12L). */
  rebateMarginalRelief: number;
  surcharge: number;
  surchargeMarginalRelief: number;
  cess: number;
  totalTaxLiability: number;
  taxesPaid: number;
  /** +ve → payable, -ve → refund due. */
  netPayable: number;
  effectiveRatePct: number;
  /** Human-readable audit notes emitted during computation. */
  notes: string[];
}

export interface ComparisonResult {
  old: RegimeComputation;
  new: RegimeComputation;
  recommended: Regime;
  savings: number;
}
