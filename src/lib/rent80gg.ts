/**
 * Batch 46 — s.80GG: rent deduction when salary has NO HRA component.
 * Deduction = least of ₹5,000/month, 25% of adjusted total income,
 * and rent paid − 10% of adjusted total income. Old regime only.
 */
export const CAP_80GG_ANNUAL = 60_000;

export interface Gg80Input {
  /** Adjusted total income: gross total income minus LTCG/STCG-111A, minus all VI-A deductions except 80GG. */
  adjustedTotalIncome: number;
  /** Annual rent actually paid. */
  rentPaid: number;
}

export interface Gg80Result {
  limbs: { cap: number; pctIncome: number; rentExcess: number };
  deduction: number;
  binding: "cap" | "pctIncome" | "rentExcess";
}

export function compute80GG(inp: Gg80Input): Gg80Result {
  const ati = Math.max(0, inp.adjustedTotalIncome);
  const rent = Math.max(0, inp.rentPaid);
  const limbs = {
    cap: CAP_80GG_ANNUAL,
    pctIncome: 0.25 * ati,
    rentExcess: Math.max(0, rent - 0.1 * ati),
  };
  const deduction = Math.round(Math.max(0, Math.min(limbs.cap, limbs.pctIncome, limbs.rentExcess)));
  const binding =
    deduction === Math.round(limbs.rentExcess) ? "rentExcess"
    : deduction === Math.round(limbs.pctIncome) ? "pctIncome"
    : "cap";
  return { limbs, deduction, binding };
}
