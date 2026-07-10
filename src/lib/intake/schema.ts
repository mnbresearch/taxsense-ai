/**
 * Intake extraction schema (Session 3).
 * The LLM returns a PARTIAL profile update + a confidence map; the intake
 * engine merges it into the running TaxProfile. Zod validates every LLM
 * response — a malformed extraction can never corrupt the profile.
 */
import { z } from "zod";

// coerce: LLMs sometimes emit numbers as strings ("960000") — accept both.
const money = z.coerce
  .number()
  .min(0)
  .max(10_000_000_000)
  .describe("Amount in whole rupees per YEAR (annualise monthly figures)");

export const ExtractionSchema = z.object({
  /** Fields the model confidently extracted from the user's last message. */
  updates: z
    .object({
      age: z.coerce.number().min(18).max(110).optional(),
      salary: z
        .object({
          grossSalary: money.optional(),
          basicPlusDA: money.optional(),
          hraReceived: money.optional(),
          rentPaid: money.optional(),
          isMetroCity: z.boolean().optional(),
          employerNpsContribution: money.optional(),
          professionalTax: money.optional(),
        })
        .optional(),
      houseProperty: z
        .object({
          use: z.enum(["self-occupied", "let-out"]).optional(),
          annualRent: money.optional(),
          municipalTaxes: money.optional(),
          homeLoanInterest: money.optional(),
        })
        .optional(),
      capitalGains: z
        .object({
          stcg111A: money.optional(),
          stcgOther: money.optional(),
          ltcg112A: money.optional(),
          ltcgOther: money.optional(),
        })
        .optional(),
      business: z
        .object({ netIncome: money.optional(), presumptive: z.boolean().optional() })
        .optional(),
      otherSources: z
        .object({
          savingsInterest: money.optional(),
          fdInterest: money.optional(),
          dividends: money.optional(),
          familyPension: money.optional(),
          other: money.optional(),
        })
        .optional(),
      deductions: z
        .object({
          section80C: money.optional(),
          section80CCD1B: money.optional(),
          section80D_selfFamily: money.optional(),
          section80D_parents: money.optional(),
          parentsAreSenior: z.boolean().optional(),
          section80E: money.optional(),
          section80G: money.optional(),
        })
        .optional(),
      taxesPaid: money.optional(),
    })
    .catch({}),
  /**
   * Sections the user explicitly said DON'T apply ("no I don't own a house",
   * "no stocks") — the engine stops asking about them.
   * .catch: a malformed value degrades THIS field, never the whole extraction.
   */
  notApplicable: z
    .array(
      z.enum(["salary", "houseProperty", "capitalGains", "business", "otherSources", "deductions"])
    )
    .catch([]),
  /** Estimated figures the user was unsure about ("around 80k a month"). */
  estimates: z.array(z.string()).catch([]),
  /** Anything ambiguous the assistant should clarify next. */
  clarify: z.string().nullable().catch(null),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
