/**
 * Batch 87 — Audit & entity engine (AY 2026-27).
 * 44AB applicability with the presumptive traps, partnership s.40(b)
 * remuneration ceiling + firm tax, and the company-regime comparison.
 */

/* ------------------------------ 44AB audit ------------------------------ */

export interface AuditInput {
  kind: "business" | "profession";
  /** Turnover / gross receipts, ₹. */
  turnover: number;
  /** Cash receipts AND cash payments each ≤ 5% of totals? */
  cashWithin5pct: boolean;
  /** Currently declaring under 44AD/44ADA? */
  presumptive: boolean;
  /** Declared profit below the presumptive floor (8/6% or 50%)? */
  belowPresumptiveFloor: boolean;
  /** Total income above the basic exemption? */
  incomeAboveExemption: boolean;
  /** Opted out of 44AD within the 5-year lock-in (s.44AD(4))? */
  optedOut44ADRecently: boolean;
}

export function auditApplicability(i: AuditInput): { required: boolean; reasons: string[] } {
  const r: string[] = [];
  let required = false;

  if (i.kind === "business") {
    const limit = i.cashWithin5pct ? 100_000_000 : 10_000_000;
    if (i.turnover > limit) {
      required = true;
      r.push(`Business turnover exceeds ${i.cashWithin5pct ? "₹10 crore (digital-heavy limit — cash ≤5% both ways)" : "₹1 crore"} → audit u/s 44AB(a).`);
    } else if (i.cashWithin5pct && i.turnover > 10_000_000) {
      r.push("Between ₹1cr and ₹10cr with ≤5% cash both ways — the enhanced limit saves you from 44AB(a).");
    }
    if (i.presumptive && i.turnover > (i.cashWithin5pct ? 30_000_000 : 20_000_000))
      r.push(`Turnover exceeds the 44AD ceiling (${i.cashWithin5pct ? "₹3cr digital" : "₹2cr"}) — presumptive not available this year.`);
  } else {
    if (i.turnover > 5_000_000 && !(i.presumptive && i.turnover <= 7_500_000 && i.cashWithin5pct)) {
      required = true;
      r.push("Professional gross receipts exceed ₹50L → audit u/s 44AB(b). (44ADA's ₹75L window needs ≥95% digital receipts AND the 50% declaration.)");
    }
  }

  if (i.presumptive && i.belowPresumptiveFloor && i.incomeAboveExemption) {
    required = true;
    r.push(i.kind === "business"
      ? "Declaring below the 8%/6% floor with income above the exemption → books + audit u/s 44AB(e) r/w 44AD(5)."
      : "Declaring below 50% of receipts with income above the exemption → books + audit u/s 44AB(d) r/w 44ADA(4).");
  }
  if (i.optedOut44ADRecently && i.incomeAboveExemption) {
    required = true;
    r.push("Opted out of 44AD within the 5-year lock-in (s.44AD(4)) → audit applies for 5 AYs u/s 44AB(e).");
  }
  if (!required && r.length === 0) r.push("No 44AB trigger on these facts — maintain normal books/records discipline anyway.");
  return { required, reasons: r };
}

/* -------------------- Partnership: s.40(b) + firm tax ------------------- */

export function partnerRemuneration(bookProfit: number): { limit: number; notes: string[] } {
  // FA 2024 (from AY 25-26): first ₹6L of book profit (or loss) → higher of ₹3L or 90%; balance → 60%.
  const first = Math.min(Math.max(bookProfit, 0), 600_000);
  const balance = Math.max(bookProfit - 600_000, 0);
  const limit = Math.round(Math.max(300_000, first * 0.9) + balance * 0.6);
  return {
    limit,
    notes: [
      "s.40(b)(v): on the first ₹6,00,000 of book profit (or loss) — higher of ₹3,00,000 or 90%; on the balance — 60%.",
      "Only remuneration to WORKING partners, authorised by the deed, is deductible; interest to partners capped at 12% simple p.a.",
      "From FY 2025-26 the firm must deduct TDS u/s 194T at 10% on partner remuneration/interest above ₹20,000.",
    ],
  };
}

export function firmTax(totalIncome: number): { tax: number; surcharge: number; cess: number; total: number } {
  const tax = Math.round(totalIncome * 0.30);
  const surcharge = totalIncome > 10_000_000 ? Math.round(tax * 0.12) : 0;
  const cess = Math.round((tax + surcharge) * 0.04);
  return { tax, surcharge, cess, total: tax + surcharge + cess };
}

/* ------------------------ Company regime compare ------------------------ */

export function companyTax(i: { income: number; turnoverUnder400cr: boolean; newManufacturing: boolean }): {
  options: { regime: string; effectivePct: number; tax: number; note: string }[];
  best: string;
} {
  const opts: { regime: string; effectivePct: number; tax: number; note: string }[] = [];
  const mk = (regime: string, base: number, surchargePct: number, note: string) => {
    const t = i.income * base;
    const s = t * surchargePct;
    const total = Math.round((t + s) * 1.04);
    opts.push({ regime, effectivePct: +(((total / i.income) * 100).toFixed(2)), tax: total, note });
  };
  mk("115BAA (flat 22%)", 0.22, 0.10, "No exemptions/incentives; no MAT; open to every domestic company.");
  if (i.newManufacturing) mk("115BAB (new mfg 15%)", 0.15, 0.10, "Manufacturing co. incorporated after 1-Oct-2019, production by 31-Mar-2024 — verify the commencement condition.");
  const normalRate = i.turnoverUnder400cr ? 0.25 : 0.30;
  const sPct = i.income > 100_000_000 ? 0.12 : i.income > 10_000_000 ? 0.07 : 0;
  mk(`Normal (${normalRate * 100}% + MAT applies)`, normalRate, sPct, "Keeps exemptions/incentives + MAT credit; surcharge 7%/12% above ₹1cr/₹10cr.");
  const best = opts.reduce((a, b) => (b.tax < a.tax ? b : a)).regime;
  return { options: opts, best };
}
