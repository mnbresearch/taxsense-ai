/**
 * Batch 35 — practitioner interest module: sections 234A, 234B, 234C.
 * Pure and deterministic, like the rest of the engine. All three sections
 * charge simple interest at 1% per month OR PART THEREOF (rounding up).
 *
 * s.234A — late FILING: 1%/mo on unpaid tax from the day after the due
 *          date to the date of filing.
 * s.234B — advance-tax DEFAULT: if advance tax + TDS < 90% of assessed
 *          tax, 1%/mo on the shortfall from 1 April of the AY.
 * s.234C — advance-tax DEFERMENT: quarter-wise shortfalls vs the
 *          15/45/75/100% cumulative schedule (100% by 15 Mar for
 *          presumptive 44AD/44ADA payers), 3 months' interest per
 *          missed installment (1 month for the March installment).
 */

const pctMonth = 0.01;
/** Interest base is tax rounded down to nearest ₹100 (Rule 119A). */
const round100 = (n: number) => Math.floor(Math.max(0, n) / 100) * 100;

export interface Interest234Input {
  /** Total assessed tax liability for the year (after relief, incl. cess). */
  assessedTax: number;
  /** TDS/TCS + other credits (not advance tax). */
  tdsCredits: number;
  /** Advance tax actually paid by each cut-off: 15 Jun, 15 Sep, 15 Dec, 15 Mar (cumulative). */
  advanceByQuarter: [number, number, number, number];
  /** Months (or part) the RETURN was filed after the due date — 0 if on time. */
  monthsLateFiling: number;
  /** Months from 1 April of the AY to full payment/assessment (for 234B). */
  monthsTo234BSettlement: number;
  /** Presumptive-scheme taxpayer (single 15 Mar installment). */
  presumptive?: boolean;
}

export interface Interest234Result {
  netTaxDue: number;
  i234A: number;
  i234B: number;
  i234B_applicable: boolean;
  i234C: number;
  i234C_rows: { due: string; requiredPct: number; required: number; paid: number; shortfall: number; months: number; interest: number }[];
  total: number;
}

export function computeInterest234(inp: Interest234Input): Interest234Result {
  const assessed = Math.max(0, inp.assessedTax);
  const tds = Math.max(0, inp.tdsCredits);
  const netTaxDue = Math.max(0, assessed - tds);
  const adv = inp.advanceByQuarter.map((a) => Math.max(0, a)) as [number, number, number, number];
  const advPaidTotal = adv[3];

  // ---- 234A: late filing on the amount still unpaid at the due date ----
  const unpaidAtDueDate = round100(Math.max(0, netTaxDue - advPaidTotal));
  const i234A = Math.round(unpaidAtDueDate * pctMonth * Math.max(0, Math.ceil(inp.monthsLateFiling)));

  // ---- 234B: paid credits < 90% of assessed tax ----
  const i234B_applicable = tds + advPaidTotal < 0.9 * assessed && netTaxDue > 0;
  const shortfall234B = round100(Math.max(0, netTaxDue - advPaidTotal));
  const i234B = i234B_applicable
    ? Math.round(shortfall234B * pctMonth * Math.max(1, Math.ceil(inp.monthsTo234BSettlement)))
    : 0;

  // ---- 234C: deferment schedule (no interest if net liability < ₹10,000) ----
  const rows: Interest234Result["i234C_rows"] = [];
  let i234C = 0;
  if (netTaxDue >= 10_000) {
    const sched = inp.presumptive
      ? [{ due: "15 Mar", pct: 100, months: 1, paid: adv[3] }]
      : [
          { due: "15 Jun", pct: 15, months: 3, paid: adv[0] },
          { due: "15 Sep", pct: 45, months: 3, paid: adv[1] },
          { due: "15 Dec", pct: 75, months: 3, paid: adv[2] },
          { due: "15 Mar", pct: 100, months: 1, paid: adv[3] },
        ];
    for (const q of sched) {
      // s.234C(1) proviso: 12%/36% safe harbour for the first two installments.
      const safePct = q.pct === 15 ? 12 : q.pct === 45 ? 36 : q.pct;
      const required = (q.pct / 100) * netTaxDue;
      const safeFloor = (safePct / 100) * netTaxDue;
      const shortfall = q.paid + 1e-9 < safeFloor ? round100(required - q.paid) : 0;
      const interest = Math.round(shortfall * pctMonth * q.months);
      rows.push({ due: q.due, requiredPct: q.pct, required: Math.round(required), paid: q.paid, shortfall, months: q.months, interest });
      i234C += interest;
    }
  }

  return { netTaxDue, i234A, i234B, i234B_applicable, i234C, i234C_rows: rows, total: i234A + i234B + i234C };
}
