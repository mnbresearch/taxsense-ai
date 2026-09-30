/**
 * Batch 100 — "Show the working": a deterministic, line-by-line audit trail of
 * exactly how a regime's tax was computed. Pure function over the engine's own
 * output — no new math, so every figure is guaranteed to reconcile with the
 * computation the app already trusts. This is what turns a black-box calculator
 * into something a user (or their CA) can verify step by step.
 */
import type { RegimeComputation } from "./tax-engine/types";

export interface ExplainStep {
  /** short label, e.g. "Salary (net)" or "Tax on 4L–8L @ 5%" */
  label: string;
  /** the rupee amount for this line (may be negative for deductions/rebates) */
  amount: number;
  /** plain-English note explaining the rule applied */
  note?: string;
  /** running subtotal after this step, when meaningful */
  running?: number;
  /** group heading this step falls under */
  group: "income" | "deductions" | "taxable" | "tax" | "final";
}

const inr = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");
const slabLabel = (from: number, to: number | null) =>
  to === null ? `above ${inr(from)}` : `${inr(from)}–${inr(to)}`;

export function explainRegime(comp: RegimeComputation): ExplainStep[] {
  const steps: ExplainStep[] = [];
  const h = comp.heads;

  // ---- Income by head ----
  if (h.salary) {
    steps.push({ group: "income", label: "Salary (net of exemptions)", amount: Math.round(h.salary),
      note: `After standard deduction ${inr(comp.salaryExemptions.standardDeduction)}` +
        (comp.salaryExemptions.hraExempt ? `, HRA exemption ${inr(comp.salaryExemptions.hraExempt)}` : "") +
        (comp.salaryExemptions.professionalTax ? `, professional tax ${inr(comp.salaryExemptions.professionalTax)}` : "") + "." });
  }
  if (h.houseProperty) steps.push({ group: "income", label: "House property", amount: Math.round(h.houseProperty),
    note: h.houseProperty < 0 ? "Loss — set-off against other heads capped at ₹2,00,000." : "Annual value less 30% standard deduction and home-loan interest." });
  if (h.business) steps.push({ group: "income", label: "Business / profession", amount: Math.round(h.business) });
  if (h.capitalGains) steps.push({ group: "income", label: "Capital gains", amount: Math.round(h.capitalGains), note: "Taxed at special rates (see below), not slab rates." });
  if (h.otherSources) steps.push({ group: "income", label: "Other sources", amount: Math.round(h.otherSources), note: "Interest, dividends, etc." });
  steps.push({ group: "income", label: "Gross Total Income", amount: Math.round(comp.grossTotalIncome), running: Math.round(comp.grossTotalIncome) });

  // ---- Chapter VI-A deductions ----
  const dedEntries = Object.entries(comp.deductionsAllowed).filter(([, v]) => v);
  if (dedEntries.length) {
    for (const [k, v] of dedEntries) steps.push({ group: "deductions", label: `Deduction ${k}`, amount: -Math.round(v) });
  } else {
    steps.push({ group: "deductions", label: "Chapter VI-A deductions", amount: 0,
      note: comp.regime === "new" ? "New regime — most deductions not available by design." : "None claimed." });
  }
  if (comp.totalDeductions) steps.push({ group: "deductions", label: "Total deductions", amount: -Math.round(comp.totalDeductions) });

  // ---- Taxable income ----
  steps.push({ group: "taxable", label: "Total Income (taxable)", amount: Math.round(comp.totalIncome), running: Math.round(comp.totalIncome),
    note: "Rounded to nearest ₹10 (s.288A)." });
  if (comp.basicExemptionAdjustment) steps.push({ group: "taxable", label: "Basic-exemption set against special-rate income", amount: -Math.round(comp.basicExemptionAdjustment),
    note: "Residents may absorb unused basic exemption against capital gains." });

  // ---- Slab-by-slab tax ----
  for (const s of comp.slabLines) {
    if (s.tax > 0 || s.taxableInSlab > 0) {
      steps.push({ group: "tax", label: `Tax on ${slabLabel(s.from, s.to)} @ ${s.ratePct}%`, amount: Math.round(s.tax),
        note: `${s.ratePct}% of ${inr(s.taxableInSlab)}.` });
    }
  }
  const sr = comp.specialRateTax;
  const srTotal = (sr?.stcg111A.tax ?? 0) + (sr?.ltcg112A.tax ?? 0) + (sr?.ltcgOther.tax ?? 0);
  if (srTotal) {
    if (sr.stcg111A.tax) steps.push({ group: "tax", label: `STCG @ ${sr.stcg111A.ratePct}% (s.111A)`, amount: Math.round(sr.stcg111A.tax) });
    if (sr.ltcg112A.tax) steps.push({ group: "tax", label: `LTCG @ ${sr.ltcg112A.ratePct}% (s.112A)`, amount: Math.round(sr.ltcg112A.tax), note: "After ₹1,25,000 exemption on listed equity/MF." });
    if (sr.ltcgOther.tax) steps.push({ group: "tax", label: `LTCG @ ${sr.ltcgOther.ratePct}% (s.112)`, amount: Math.round(sr.ltcgOther.tax) });
  }
  steps.push({ group: "tax", label: "Tax before rebate", amount: Math.round(comp.taxBeforeRebate), running: Math.round(comp.taxBeforeRebate) });

  if (comp.rebate87A) steps.push({ group: "tax", label: "Rebate u/s 87A", amount: -Math.round(comp.rebate87A),
    note: comp.regime === "new" ? "New regime: full rebate up to ₹12,00,000 taxable income." : "Old regime: full rebate up to ₹5,00,000 taxable income." });
  if (comp.rebateMarginalRelief) steps.push({ group: "tax", label: "87A marginal relief", amount: -Math.round(comp.rebateMarginalRelief),
    note: "Just above the rebate threshold — tax can't exceed income over the limit." });
  if (comp.surcharge) steps.push({ group: "tax", label: "Surcharge", amount: Math.round(comp.surcharge), note: "High-income levy on the tax amount." });
  if (comp.surchargeMarginalRelief) steps.push({ group: "tax", label: "Surcharge marginal relief", amount: -Math.round(comp.surchargeMarginalRelief),
    note: "Just above a surcharge threshold — surcharge capped so total doesn't exceed income over the limit." });
  steps.push({ group: "tax", label: "Health & Education Cess @ 4%", amount: Math.round(comp.cess) });

  // ---- Final ----
  steps.push({ group: "final", label: "Total Tax Liability", amount: Math.round(comp.totalTaxLiability), running: Math.round(comp.totalTaxLiability),
    note: `Effective rate ${comp.effectiveRatePct.toFixed(1)}% of total income.` });
  if (comp.taxesPaid) steps.push({ group: "final", label: "Less: taxes already paid (TDS/advance/self-asst)", amount: -Math.round(comp.taxesPaid) });
  steps.push({ group: "final",
    label: comp.netPayable >= 0 ? "Balance tax PAYABLE" : "Refund DUE",
    amount: Math.round(Math.abs(comp.netPayable)) });

  return steps;
}

/** Convenience: reconciliation check — the tax steps must sum to the liability. */
export function explainReconciles(comp: RegimeComputation): boolean {
  const steps = explainRegime(comp);
  // Every "tax"-group line except the "Tax before rebate" running subtotal is
  // additive: slab taxes + special-rate taxes + (−rebate −relief +surcharge
  // −surcharge relief +cess) must equal the total tax liability.
  const summed = steps
    .filter((s) => s.group === "tax" && !/before rebate/i.test(s.label))
    .reduce((a, s) => a + s.amount, 0);
  return Math.abs(Math.round(summed) - Math.round(comp.totalTaxLiability)) <= 1;
}
