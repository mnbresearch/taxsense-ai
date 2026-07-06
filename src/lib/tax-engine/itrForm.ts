/**
 * ITR form recommender (AY 2026-27).
 *
 * Rules implemented (CBDT notified forms; simplified to the profile fields we hold):
 *  - ITR-1 (Sahaj): resident individual; total income ≤ ₹50L; income from salary,
 *    ONE house property, other sources; NOW also allowed: LTCG u/s 112A up to the
 *    ₹1.25L exempt limit (change effective AY 2025-26 onwards). Not allowed:
 *    any STCG, LTCG above the exemption, >1 house property, business income,
 *    brought-forward losses.
 *  - ITR-4 (Sugam): like ITR-1 but WITH presumptive business/professional income
 *    (44AD/44ADA/44AE); total income ≤ ₹50L; same 112A-within-exemption allowance.
 *  - ITR-2: individuals/HUF with capital gains, >1 house property, or income > ₹50L,
 *    and NO business/professional income.
 *  - ITR-3: individuals/HUF with business/professional income (non-presumptive,
 *    or presumptive that fails the Sugam conditions).
 */
import type { TaxProfile } from "./types";
import { CG_RATES } from "./constants";

export interface ItrRecommendation {
  form: "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4";
  formName: string;
  reasons: string[];
  cautions: string[];
}

export function recommendItrForm(profile: TaxProfile, totalIncome: number): ItrRecommendation {
  const reasons: string[] = [];
  const cautions: string[] = [];
  const cg = profile.capitalGains;
  const hasBusiness = !!profile.business?.netIncome;
  const presumptive = !!profile.business?.presumptive;
  const hpCount = profile.houseProperties.length;
  const over50L = totalIncome > 5_000_000;
  const nonResident = profile.residentialStatus !== "resident";

  const cgBeyondItr1 =
    !!cg &&
    (cg.stcg111A > 0 ||
      cg.stcgOther > 0 ||
      cg.ltcgOther > 0 ||
      cg.ltcg112A > CG_RATES.ltcg112A_exemption);
  const cgWithinItr1 = !!cg && !cgBeyondItr1 && cg.ltcg112A > 0;

  if (hasBusiness) {
    if (presumptive && !over50L && hpCount <= 1 && !cgBeyondItr1 && !nonResident) {
      reasons.push("Presumptive business/professional income (44AD/44ADA) fits ITR-4 (Sugam).");
      if (cgWithinItr1) reasons.push("Equity LTCG within the ₹1.25L exemption is permitted in ITR-4 from AY 2025-26.");
      return { form: "ITR-4", formName: "Sugam", reasons, cautions };
    }
    reasons.push(
      presumptive
        ? "Presumptive income, but another condition (income > ₹50L / capital gains / properties / residency) pushes you beyond Sugam."
        : "Business/professional income outside the presumptive scheme requires ITR-3."
    );
    cautions.push("ITR-3 needs books-of-account details; consider a CA review.");
    return { form: "ITR-3", formName: "For business/professional income", reasons, cautions };
  }

  if (nonResident || over50L || hpCount > 1 || cgBeyondItr1) {
    if (nonResident) reasons.push("Non-resident status is not allowed in ITR-1.");
    if (over50L) reasons.push("Total income above ₹50 lakh exceeds the ITR-1 limit.");
    if (hpCount > 1) reasons.push("More than one house property requires ITR-2.");
    if (cgBeyondItr1)
      reasons.push("Capital gains beyond the ITR-1 allowance (STCG, or LTCG above ₹1.25L) require ITR-2 (Schedule CG).");
    return { form: "ITR-2", formName: "For individuals with capital gains / multiple properties", reasons, cautions };
  }

  reasons.push("Salary / one house property / other sources within ₹50L fits ITR-1 (Sahaj).");
  if (cgWithinItr1)
    reasons.push("Your equity LTCG is within the ₹1.25L exemption — reportable in ITR-1 itself from AY 2025-26.");
  return { form: "ITR-1", formName: "Sahaj", reasons, cautions };
}
