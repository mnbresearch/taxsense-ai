/**
 * Batch 99 — ITR-1 (Sahaj) DRAFT JSON generator.
 *
 * Produces a structured JSON in the official ITR-1 layout, mapped from the
 * verified computation. This is a DRAFT to be opened/validated in the
 * income-tax portal's offline utility before filing — it is NOT a
 * portal-guaranteed upload. Exact schema-version conformance for the AY must
 * be confirmed against the official CBDT schema and a test upload.
 *
 * Scope guard: emits ONLY for ITR-1-eligible profiles. For ITR-2/3/4 it
 * returns { eligible:false } with the reason, rather than a wrong-shaped file.
 *
 * Personal identifiers (PAN, name, DOB, address, bank) are not part of the tax
 * profile, so they are emitted as empty placeholders the filer must complete.
 */
import type { RegimeComputation, TaxProfile } from "./tax-engine/types";
import type { ItrRecommendation } from "./tax-engine/itrForm";

export interface Itr1DraftResult {
  eligible: boolean;
  reason?: string;
  /** the ITR-1-layout object (present only when eligible) */
  json?: Record<string, any>;
  /** loud, unmissable status for any UI that surfaces this */
  status: string;
}

const R = (n: number) => Math.round(n || 0);

export function buildItr1Json(
  profile: TaxProfile,
  comp: RegimeComputation,
  itr: ItrRecommendation,
  opts: { ay?: string; personal?: Partial<Record<string, string>> } = {}
): Itr1DraftResult {
  const status =
    "DRAFT — ITR-1 layout, generated from TaxSense AI's computation. Open in the " +
    "income-tax portal's offline utility to validate against the current schema, " +
    "fill personal/PAN/bank details, and verify every figure before filing. " +
    "This is not a portal-guaranteed file.";

  if (itr.form !== "ITR-1") {
    return {
      eligible: false,
      status,
      reason: `This return maps to ${itr.form}, not ITR-1. Draft JSON is generated only for ITR-1 (Sahaj) to avoid producing a wrong-shaped file.`,
    };
  }

  const ay = opts.ay ?? "2026";
  const p = opts.personal ?? {};
  const h = comp.heads;
  const optOutNewRegime = comp.regime === "old" ? "Y" : "N"; // ITR-1: OptingNewTaxRegime handled via this flag

  const ded = comp.deductionsAllowed;
  const chapVIA: Record<string, number> = {};
  const map: Record<string, string> = {
    "80C": "Section80C", "80CCD(1B)": "Section80CCDEmployee", "80D": "Section80D",
    "80E": "Section80E", "80G": "Section80G", "80TTA": "Section80TTA", "80TTB": "Section80TTB",
  };
  let totalChapVIA = 0;
  for (const [k, v] of Object.entries(ded)) {
    if (v) { chapVIA[map[k] ?? k] = R(v); totalChapVIA += R(v); }
  }

  const json = {
    ITR: {
      ITR1: {
        CreationInfo: {
          SWVersionNo: "1.0",
          SWCreatedBy: "SW20000000",
          JSONCreatedBy: "TaxSenseAI",
          JSONCreationDate: new Date().toISOString().slice(0, 10),
          IntermediaryCity: "NA",
          Digest: "-",
        },
        Form_ITR1: {
          FormName: "ITR1",
          Description: "For Individuals having Income from Salaries, One House Property, Other Sources (Interest etc.) and having total income upto Rs.50 lakh",
          AssessmentYear: ay,
          SchemaVer: "Ver1.0",
          FormVer: "Ver1.0",
        },
        PersonalInfo: {
          AssesseeName: { FirstName: p.firstName ?? "", SurNameOrOrgName: p.lastName ?? "" },
          PAN: p.pan ?? "",
          Address: {
            ResidenceNo: p.residenceNo ?? "",
            LocalityOrArea: p.locality ?? "",
            CityOrTownOrDistrict: p.city ?? "",
            StateCode: p.stateCode ?? "",
            PinCode: p.pinCode ?? "",
            CountryCode: "91",
            EmailAddress: p.email ?? "",
            MobileNo: p.mobile ?? "",
          },
          DOB: p.dob ?? "",
          EmployerCategory: p.employerCategory ?? "OTH",
          Status: "I",
        },
        FilingStatus: {
          ReturnFileSec: 11, // 139(1) - on or before due date
          NewTaxRegime: optOutNewRegime === "N" ? "Y" : "N",
          SeventhProvisio139: "N",
        },
        ITR1_IncomeDeductions: {
          GrossSalary: R(profile.salary?.grossSalary ?? h.salary + comp.salaryExemptions.standardDeduction + comp.salaryExemptions.professionalTax),
          Salary: R(profile.salary?.grossSalary ?? 0),
          NatureOfEmployment: p.employerCategory ?? "OTH",
          DeductionUS16: R(comp.salaryExemptions.standardDeduction + comp.salaryExemptions.professionalTax),
          DeductionUS16ia: R(comp.salaryExemptions.standardDeduction),
          ProfessionalTaxUS16iii: R(comp.salaryExemptions.professionalTax),
          IncomeFromSal: R(h.salary),
          TypeOfHP: h.houseProperty ? (h.houseProperty < 0 ? "L" : "S") : undefined,
          TotalIncomeOfHP: R(h.houseProperty),
          IncomeOthSrc: R(h.otherSources),
          GrossTotIncome: R(comp.grossTotalIncome),
          DeductUndChapVIA: chapVIA,
          TotalChapVIADeductions: R(totalChapVIA),
          TotalIncome: R(comp.totalIncome),
        },
        ITR1_TaxComputation: {
          TotalTaxPayable: R(comp.taxBeforeRebate),
          Rebate87A: R(comp.rebate87A + comp.rebateMarginalRelief),
          TaxPayableOnRebate: R(Math.max(0, comp.taxBeforeRebate - comp.rebate87A - comp.rebateMarginalRelief)),
          Surcharge: R(Math.max(0, comp.surcharge - comp.surchargeMarginalRelief)),
          EducationCess: R(comp.cess),
          GrossTaxLiability: R(comp.totalTaxLiability),
          NetTaxLiability: R(comp.totalTaxLiability),
          TotalTaxPlusInterstPayable: R(comp.totalTaxLiability),
        },
        TaxPaid: {
          TaxesPaid: {
            TDS: R(comp.taxesPaid),
            TCS: 0,
            AdvanceTax: 0,
            SelfAssessmentTax: 0,
            TotalTaxesPaid: R(comp.taxesPaid),
          },
          BalTaxPayable: R(Math.max(0, comp.netPayable)),
        },
        Refund: {
          RefundDue: R(Math.max(0, -comp.netPayable)),
          BankAccountDtls: { BankDtlsFlag: "Y", AddtnlBankDetails: [] },
        },
      },
    },
  };

  return { eligible: true, json, status };
}
