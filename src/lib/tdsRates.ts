/**
 * Batch 86 — TDS practice engine, FY 2025-26 (post-Finance Act 2025
 * threshold rationalisation). Rate finder + 201(1A)/234E calculators +
 * the deposit/return calendar every deductor works from.
 */

export interface TdsSection {
  section: string;
  nature: string;
  ratePct: number | string;
  threshold: string;
  note: string;
}

/** The sections that dominate practice, with FY 2025-26 thresholds. */
export const TDS_SECTIONS: TdsSection[] = [
  { section: "192", nature: "Salary", ratePct: "slab", threshold: "Basic exemption", note: "Average rate on estimated annual income; employee's chosen regime (default new)." },
  { section: "193", nature: "Interest on securities", ratePct: 10, threshold: "₹10,000", note: "Threshold unified at ₹10,000 by FA 2025." },
  { section: "194", nature: "Dividend", ratePct: 10, threshold: "₹10,000/yr", note: "Raised from ₹5,000 by FA 2025." },
  { section: "194A", nature: "Interest (bank/post office FD)", ratePct: 10, threshold: "₹50,000 (₹1,00,000 senior citizens)", note: "FA 2025 raised limits; ₹10,000 for other payers. No PAN → 20%." },
  { section: "194C", nature: "Contractor payments", ratePct: "1% individual/HUF · 2% others", threshold: "₹30,000 single / ₹1,00,000 annual", note: "Transporter with ≤10 vehicles + declaration → nil." },
  { section: "194H", nature: "Commission / brokerage", ratePct: 2, threshold: "₹20,000/yr", note: "Rate cut to 2% (Oct 2024); threshold raised by FA 2025." },
  { section: "194I", nature: "Rent", ratePct: "2% plant & machinery · 10% land/building", threshold: "₹50,000 per month", note: "FA 2025 moved to a monthly threshold." },
  { section: "194-IA", nature: "Purchase of immovable property", ratePct: 1, threshold: "₹50,00,000", note: "On the higher of consideration or stamp value; Form 26QB within 30 days." },
  { section: "194-IB", nature: "Rent by individual/HUF (no audit)", ratePct: 2, threshold: "₹50,000 per month", note: "Rate cut from 5% (Oct 2024); deduct once in the last month, Form 26QC." },
  { section: "194J", nature: "Professional / technical fees", ratePct: "10% professional · 2% technical/call-centre", threshold: "₹50,000/yr", note: "FA 2025 raised from ₹30,000." },
  { section: "194Q", nature: "Purchase of goods", ratePct: 0.1, threshold: "₹50,00,000/yr per seller", note: "Buyer turnover > ₹10cr; overrides 206C(1H)." },
  { section: "194T", nature: "Partner remuneration/interest from firm", ratePct: 10, threshold: "₹20,000/yr", note: "NEW from 1-Apr-2025 (FA 2024) — firms must now deduct on partner payments." },
  { section: "195", nature: "Payments to non-residents", ratePct: "Rates in force / DTAA", threshold: "₹0", note: "Form 15CA/CB discipline; treaty relief needs TRC." },
];

/** s.201(1A) interest — two legs, calendar months (part month = full month). */
export function tdsInterest(i: {
  tds: number;
  /** months from date deductible to date actually deducted (0 if on time) */
  monthsNotDeducted: number;
  /** months from date deducted to date deposited (0 if on time) */
  monthsNotDeposited: number;
}): { leg1: number; leg2: number; total: number; notes: string[] } {
  const leg1 = Math.round(i.tds * 0.01 * Math.max(0, i.monthsNotDeducted));
  const leg2 = Math.round(i.tds * 0.015 * Math.max(0, i.monthsNotDeposited));
  return {
    leg1, leg2, total: leg1 + leg2,
    notes: [
      "1%/month (or part) for non-deduction — from the date deductible to the date deducted.",
      "1.5%/month (or part) for non-deposit — from the date of deduction to the date of payment.",
      "Interest is mandatory before the TDS return is accepted; disallowance u/s 40(a)(ia) may also bite.",
    ],
  };
}

/** s.234E late-filing fee for TDS returns — ₹200/day capped at the TDS amount. */
export function tdsLateFee(i: { tds: number; daysLate: number }): { fee: number; notes: string[] } {
  const fee = Math.min(Math.max(0, i.daysLate) * 200, Math.max(0, i.tds));
  return {
    fee,
    notes: [
      "₹200/day u/s 234E, capped at the TDS amount in the statement.",
      "Separate penalty u/s 271H (₹10k–₹1L) can apply beyond one year's delay — avoidable if tax+interest+fee are paid and the return filed within a year.",
    ],
  };
}

export const TDS_CALENDAR = [
  { due: "7th of next month", what: "Deposit TDS deducted (challan ITNS-281)", note: "March deductions: 30 April (non-government)." },
  { due: "31 Jul / 31 Oct / 31 Jan / 31 May", what: "Quarterly returns 24Q (salary) & 26Q (others)", note: "Q1–Q4 respectively; 27Q for non-resident payees." },
  { due: "Within 15 days of return due date", what: "Issue Form 16A (quarterly)", note: "Form 16 for salary: by 15 June annually." },
  { due: "30 days from month-end", what: "26QB/26QC/26QE challan-cum-statements", note: "Property, high rent, crypto payments." },
];
