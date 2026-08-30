/**
 * Batch 85 — GST practice engine (FY 2025-26 law).
 * Pure & deterministic: registration thresholds, composition eligibility,
 * GSTR-3B/GSTR-1 late fees, s.50 interest, and the compliance calendar.
 */

export const SPECIAL_CATEGORY_10L = ["Manipur", "Mizoram", "Nagaland", "Tripura"];
export const SPECIAL_CATEGORY_20L_GOODS = [
  "Arunachal Pradesh", "Meghalaya", "Sikkim", "Uttarakhand", "Puducherry", "Telangana",
];

export interface GstRegInput {
  /** Aggregate turnover (all-India, same PAN), ₹/year. */
  turnover: number;
  supplies: "goods" | "services" | "both";
  state: string;
  interState: boolean;
  ecommerce: boolean;
}

export interface GstRegResult {
  required: boolean;
  threshold: number;
  reasons: string[];
}

export function gstRegistration(i: GstRegInput): GstRegResult {
  const reasons: string[] = [];
  const special10 = SPECIAL_CATEGORY_10L.includes(i.state);
  const special20 = SPECIAL_CATEGORY_20L_GOODS.includes(i.state);
  // Services (or mixed) → ₹20L (₹10L in the four special states).
  // Pure goods → ₹40L in normal states; ₹20L in the named states; ₹10L in the four.
  let threshold: number;
  if (i.supplies === "goods") threshold = special10 ? 1_000_000 : special20 ? 2_000_000 : 4_000_000;
  else threshold = special10 ? 1_000_000 : 2_000_000;

  let required = i.turnover > threshold;
  if (required) reasons.push(`Aggregate turnover exceeds the ₹${(threshold / 100000).toFixed(0)}L threshold for ${i.supplies} in ${i.state}.`);

  if (i.interState && i.supplies !== "services") {
    required = true;
    reasons.push("Inter-state supply of GOODS requires registration from ₹0 (s.24) — no threshold. (Inter-state services keep the ₹20L threshold.)");
  }
  if (i.ecommerce) {
    required = true;
    reasons.push("Selling goods through an e-commerce operator requires compulsory registration u/s 24(ix).");
  }
  if (!required) reasons.push(`Below the ₹${(threshold / 100000).toFixed(0)}L threshold — registration is optional (voluntary registration allows ITC but brings full compliance).`);
  return { required, threshold, reasons };
}

export interface CompositionResult {
  eligible: boolean;
  scheme: string | null;
  ratePct: number | null;
  annualTax: number | null;
  notes: string[];
}

export function compositionCheck(i: {
  turnover: number;
  kind: "manufacturer-trader" | "restaurant" | "services";
  state: string;
  interState: boolean;
  ecommerce: boolean;
}): CompositionResult {
  const notes: string[] = [];
  const specialCap = [...SPECIAL_CATEGORY_10L, "Arunachal Pradesh", "Meghalaya", "Sikkim", "Uttarakhand"].includes(i.state);
  if (i.interState) return { eligible: false, scheme: null, ratePct: null, annualTax: null, notes: ["Composition dealers cannot make inter-state OUTWARD supplies (s.10(2)(c))."] };
  if (i.ecommerce && i.kind !== "services") notes.push("Supplying goods via e-commerce no longer blocks composition (since 1-Oct-2023), but the operator must collect TCS.");

  if (i.kind === "services") {
    if (i.turnover > 5_000_000)
      return { eligible: false, scheme: null, ratePct: null, annualTax: null, notes: ["Service providers' composition u/s 10(2A) is capped at ₹50L turnover."] };
    return { eligible: true, scheme: "s.10(2A) services composition", ratePct: 6, annualTax: Math.round(i.turnover * 0.06), notes: [...notes, "6% (3% CGST + 3% SGST) on turnover; no ITC; bill of supply only."] };
  }
  const cap = specialCap ? 7_500_000 : 15_000_000;
  if (i.turnover > cap)
    return { eligible: false, scheme: null, ratePct: null, annualTax: null, notes: [`Composition cap is ₹${cap / 10000000} crore for ${i.state}.`] };
  const rate = i.kind === "restaurant" ? 5 : 1;
  return {
    eligible: true,
    scheme: i.kind === "restaurant" ? "s.10 restaurant composition" : "s.10 manufacturer/trader composition",
    ratePct: rate,
    annualTax: Math.round(i.turnover * rate / 100),
    notes: [...notes, `${rate}% of turnover, no ITC, quarterly CMP-08 + annual GSTR-4.`],
  };
}

/** GSTR-3B / GSTR-1 late fee (₹/day CGST+SGST combined) with turnover caps. */
export function gstrLateFee(i: {
  daysLate: number;
  nilReturn: boolean;
  /** Previous-year annual turnover, for the fee cap. */
  turnover: number;
}): { fee: number; perDay: number; cap: number; notes: string[] } {
  const perDay = i.nilReturn ? 20 : 50;
  const cap = i.nilReturn ? 500 : i.turnover <= 15_000_000 ? 2_000 : i.turnover <= 50_000_000 ? 5_000 : 10_000;
  const fee = Math.min(Math.max(0, i.daysLate) * perDay, cap);
  return {
    fee, perDay, cap,
    notes: [
      `₹${perDay}/day (split equally CGST+SGST), capped at ₹${cap.toLocaleString("en-IN")} for your turnover band.`,
      "Late fee applies per return (GSTR-3B and GSTR-1 separately).",
    ],
  };
}

/** s.50 interest — 18% p.a. on the NET CASH tax paid late. */
export function gstInterest(i: { taxCash: number; daysLate: number }): { interest: number; notes: string[] } {
  const interest = Math.round((i.taxCash * 0.18 * Math.max(0, i.daysLate)) / 365);
  return {
    interest,
    notes: [
      "18% p.a. u/s 50(1), computed on the tax paid through the CASH ledger only (Rule 88B) — the ITC-set-off portion carries no interest for delayed filing.",
      "24% applies only to excess ITC claimed and utilised u/s 50(3).",
    ],
  };
}

export interface GstDeadline { day: string; what: string; who: string }
export function gstCalendar(qrmp: boolean): GstDeadline[] {
  const rows: GstDeadline[] = [
    { day: "11th of next month", what: "GSTR-1 (outward supplies)", who: qrmp ? "Monthly filers (QRMP uses IFF by 13th)" : "Monthly filers" },
    { day: qrmp ? "22nd/24th after quarter" : "20th of next month", what: "GSTR-3B + tax payment", who: qrmp ? "QRMP (date by state group; PMT-06 monthly by 25th)" : "Monthly filers" },
    { day: "18th after quarter", what: "CMP-08 (composition payment)", who: "Composition dealers" },
    { day: "30 April", what: "GSTR-4 annual return", who: "Composition dealers" },
    { day: "31 December", what: "GSTR-9/9C annual return", who: "Turnover > ₹2cr (9C > ₹5cr)" },
  ];
  return rows;
}
