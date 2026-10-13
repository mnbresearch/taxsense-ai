/** Stable, versioned public shape of a computation (decoupled from engine internals). */
import { computeBoth, type TaxProfile, type RegimeComputation } from "@/lib/tax-engine";
import { recommendItrForm } from "@/lib/tax-engine/itrForm";
import { optimize } from "@/lib/optimizer";
import { FY } from "./store";

function regime(r: RegimeComputation) {
  return {
    grossTotalIncome: r.grossTotalIncome,
    deductionsAllowed: r.deductionsAllowed,
    totalDeductions: r.totalDeductions,
    taxableIncome: r.totalIncome,
    taxBeforeRebate: r.taxBeforeRebate,
    rebate87A: r.rebate87A,
    surcharge: r.surcharge,
    cess: r.cess,
    totalTax: r.totalTaxLiability,
    taxesPaid: r.taxesPaid,
    netPayable: r.netPayable,
    effectiveRatePct: r.effectiveRatePct,
  };
}

export function computeV1(profile: TaxProfile) {
  const cmp = computeBoth(profile);
  const best = cmp[cmp.recommended];
  const itr = recommendItrForm(profile, best.totalIncome);
  const opt = optimize(profile);
  return {
    financialYear: FY,
    assessmentYear: "AY2026-27",
    recommendedRegime: cmp.recommended,
    savingsVsOtherRegime: cmp.savings,
    regimes: { old: regime(cmp.old), new: regime(cmp.new) },
    itr: { form: itr.form, name: itr.formName, reasons: itr.reasons, cautions: itr.cautions },
    suggestions: opt.suggestions.slice(0, 5).map((s) => ({ id: s.id, label: s.label, cashOutlay: s.cashOutlay, taxSaved: s.taxSaved })),
    disclaimer: "Informational computation, not tax advice. Verify before filing.",
  };
}

export function profileSummary(computation: unknown) {
  const c = computation as { recommended?: string; savings?: number; old?: { totalTaxLiability?: number }; new?: { totalTaxLiability?: number } } | null;
  if (!c || !c.recommended) return null;
  return { recommendedRegime: c.recommended, totalTaxOld: c.old?.totalTaxLiability ?? null, totalTaxNew: c.new?.totalTaxLiability ?? null, savingsVsOtherRegime: c.savings ?? null };
}
