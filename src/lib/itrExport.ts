/**
 * Batch 98 — ITR filing sheet.
 *
 * Maps a completed computation to the schedules of the applicable ITR form,
 * as a structured object + a human-readable sheet. This is a PREPARATION AID
 * for the taxpayer or their CA to file on the income-tax portal — it is NOT a
 * portal-valid upload file and deliberately does not claim to be. Every figure
 * is traceable to the engine's own output, so what you file matches what the
 * app computed.
 */
import type { RegimeComputation, TaxProfile } from "./tax-engine/types";
import type { ItrRecommendation } from "./tax-engine/itrForm";

export interface ItrScheduleLine {
  code: string;   // schedule/line reference, e.g. "Schedule S", "CG 112A"
  label: string;
  amount: number;
}

export interface ItrFilingSheet {
  meta: {
    form: string;
    assessmentYear: string;
    financialYear: string;
    regime: "old" | "new";
    generatedAt: string;
    disclaimer: string;
  };
  income: ItrScheduleLine[];
  deductions: ItrScheduleLine[];
  taxComputation: ItrScheduleLine[];
  taxesPaidAndDue: ItrScheduleLine[];
  notes: string[];
}

const inr = (n: number) => Math.round(n);

export function buildFilingSheet(
  profile: TaxProfile,
  comp: RegimeComputation,
  itr: ItrRecommendation,
  opts: { fy?: string; ay?: string } = {}
): ItrFilingSheet {
  const fy = opts.fy ?? "2025-26";
  const ay = opts.ay ?? "2026-27";

  const income: ItrScheduleLine[] = [];
  const h = comp.heads;
  if (h.salary) {
    income.push({ code: "Schedule S", label: "Income from Salary (net)", amount: inr(h.salary) });
    if (comp.salaryExemptions.standardDeduction)
      income.push({ code: "Schedule S · 16(ia)", label: "  Standard deduction applied", amount: inr(comp.salaryExemptions.standardDeduction) });
    if (comp.salaryExemptions.hraExempt)
      income.push({ code: "Schedule S · 10(13A)", label: "  HRA exemption applied", amount: inr(comp.salaryExemptions.hraExempt) });
    if (comp.salaryExemptions.professionalTax)
      income.push({ code: "Schedule S · 16(iii)", label: "  Professional tax", amount: inr(comp.salaryExemptions.professionalTax) });
  }
  if (h.houseProperty) income.push({ code: "Schedule HP", label: "Income from House Property", amount: inr(h.houseProperty) });
  if (h.business) income.push({ code: "Schedule BP", label: "Profits & Gains from Business/Profession", amount: inr(h.business) });
  if (h.capitalGains) income.push({ code: "Schedule CG", label: "Capital Gains (net)", amount: inr(h.capitalGains) });
  if (h.otherSources) income.push({ code: "Schedule OS", label: "Income from Other Sources", amount: inr(h.otherSources) });
  income.push({ code: "Part B-TI", label: "Gross Total Income", amount: inr(comp.grossTotalIncome) });

  const deductions: ItrScheduleLine[] = [];
  for (const [k, v] of Object.entries(comp.deductionsAllowed)) {
    if (v) deductions.push({ code: `Schedule VI-A · ${k}`, label: `Deduction ${k}`, amount: inr(v) });
  }
  deductions.push({ code: "Part B-TI", label: "Total Chapter VI-A deductions", amount: inr(comp.totalDeductions) });

  const taxComputation: ItrScheduleLine[] = [
    { code: "Part B-TI", label: "Total Income (taxable)", amount: inr(comp.totalIncome) },
    { code: "Part B-TTI", label: "Tax at normal rates", amount: inr(comp.taxOnNormalIncome) },
    { code: "Schedule SI", label: "Tax at special rates (CG etc.)", amount: inr(((comp.specialRateTax?.stcg111A.tax ?? 0) + (comp.specialRateTax?.ltcg112A.tax ?? 0) + (comp.specialRateTax?.ltcgOther.tax ?? 0))) },
    { code: "Part B-TTI", label: "Tax before rebate", amount: inr(comp.taxBeforeRebate) },
  ];
  if (comp.rebate87A) taxComputation.push({ code: "Part B-TTI · 87A", label: "Rebate u/s 87A", amount: -inr(comp.rebate87A) });
  if (comp.rebateMarginalRelief) taxComputation.push({ code: "Part B-TTI · 87A", label: "87A marginal relief", amount: -inr(comp.rebateMarginalRelief) });
  if (comp.surcharge) taxComputation.push({ code: "Part B-TTI", label: "Surcharge", amount: inr(comp.surcharge) });
  if (comp.surchargeMarginalRelief) taxComputation.push({ code: "Part B-TTI", label: "Surcharge marginal relief", amount: -inr(comp.surchargeMarginalRelief) });
  taxComputation.push({ code: "Part B-TTI", label: "Health & Education Cess (4%)", amount: inr(comp.cess) });
  taxComputation.push({ code: "Part B-TTI", label: "Total Tax Liability", amount: inr(comp.totalTaxLiability) });

  const taxesPaidAndDue: ItrScheduleLine[] = [
    { code: "Schedule TDS/TCS/AT", label: "Taxes already paid (TDS/advance/self-asst)", amount: inr(comp.taxesPaid) },
    {
      code: "Part B-TTI",
      label: comp.netPayable >= 0 ? "Balance tax PAYABLE" : "Refund DUE",
      amount: inr(Math.abs(comp.netPayable)),
    },
  ];

  return {
    meta: {
      form: itr.form,
      assessmentYear: `AY ${ay}`,
      financialYear: `FY ${fy}`,
      regime: comp.regime,
      generatedAt: new Date().toISOString(),
      disclaimer:
        "Preparation aid only. Figures mirror TaxSense AI's computation and are mapped to ITR schedules for you or your CA to file on the income-tax portal. This is not an official ITR upload file. Reconcile against Form 26AS / AIS and verify before filing.",
    },
    income,
    deductions,
    taxComputation,
    taxesPaidAndDue,
    notes: comp.notes ?? [],
  };
}

/** Render the sheet as a plain-text filing worksheet (for copy / PDF / email). */
export function renderFilingSheetText(sheet: ItrFilingSheet): string {
  const money = (n: number) => "Rs " + n.toLocaleString("en-IN");
  const section = (title: string, lines: ItrScheduleLine[]) =>
    `\n${title}\n` + lines.map((l) => `  ${l.label.padEnd(44)} ${money(l.amount).padStart(16)}   [${l.code}]`).join("\n");
  return (
    `ITR FILING SHEET — ${sheet.meta.form} · ${sheet.meta.assessmentYear} · ${sheet.meta.regime.toUpperCase()} regime\n` +
    `Generated ${sheet.meta.generatedAt}\n` +
    section("INCOME", sheet.income) +
    section("\nDEDUCTIONS (Chapter VI-A)", sheet.deductions) +
    section("\nTAX COMPUTATION", sheet.taxComputation) +
    section("\nTAXES PAID & BALANCE", sheet.taxesPaidAndDue) +
    (sheet.notes.length ? `\n\nNOTES\n` + sheet.notes.map((n) => `  • ${n}`).join("\n") : "") +
    `\n\n${sheet.meta.disclaimer}\n`
  );
}
