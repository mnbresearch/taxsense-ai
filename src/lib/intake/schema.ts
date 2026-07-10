/**
 * Intake extraction schema (Session 3).
 * The LLM returns a PARTIAL profile update + a confidence map; the intake
 * engine merges it into the running TaxProfile. Zod validates every LLM
 * response — a malformed extraction can never corrupt the profile.
 */
import { z } from "zod";

// LLMs emit money as 960000, "960000", "9,60,000", "₹9.6L" — normalise all.
const money = z.preprocess((v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return v;
  const s = v.replace(/[₹,\s]/g, "").toLowerCase();
  const m = s.match(/^([\d.]+)(k|l|lakh|lakhs|lac|lacs|cr|crore|crores)?$/);
  if (!m) return v;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  else if (m[2] && m[2].startsWith("l")) n *= 100_000;
  else if (m[2] && m[2].startsWith("cr")) n *= 10_000_000;
  return Math.round(n);
}, z.number().min(0).max(10_000_000_000))
  .describe("Amount in whole rupees per YEAR (annualise monthly figures)");

export const ExtractionSchema = z.object({
  /** Fields the model confidently extracted from the user's last message. */
  updates: z
    .object({
      age: z.coerce.number().min(18).max(110).optional().catch(undefined),
      salary: z
        .object({
          grossSalary: money.optional().catch(undefined),
          basicPlusDA: money.optional().catch(undefined),
          hraReceived: money.optional().catch(undefined),
          rentPaid: money.optional().catch(undefined),
          isMetroCity: z.boolean().optional().catch(undefined),
          employerNpsContribution: money.optional().catch(undefined),
          professionalTax: money.optional().catch(undefined),
        })
        .optional().catch(undefined),
      houseProperty: z
        .object({
          use: z.enum(["self-occupied", "let-out"]).optional().catch(undefined),
          annualRent: money.optional().catch(undefined),
          municipalTaxes: money.optional().catch(undefined),
          homeLoanInterest: money.optional().catch(undefined),
        })
        .optional().catch(undefined),
      capitalGains: z
        .object({
          stcg111A: money.optional().catch(undefined),
          stcgOther: money.optional().catch(undefined),
          ltcg112A: money.optional().catch(undefined),
          ltcgOther: money.optional().catch(undefined),
        })
        .optional().catch(undefined),
      business: z
        .object({ netIncome: money.optional(), presumptive: z.boolean().optional() })
        .optional().catch(undefined),
      otherSources: z
        .object({
          savingsInterest: money.optional().catch(undefined),
          fdInterest: money.optional().catch(undefined),
          dividends: money.optional().catch(undefined),
          familyPension: money.optional().catch(undefined),
          other: money.optional().catch(undefined),
        })
        .optional().catch(undefined),
      deductions: z
        .object({
          section80C: money.optional().catch(undefined),
          section80CCD1B: money.optional().catch(undefined),
          section80D_selfFamily: money.optional().catch(undefined),
          section80D_parents: money.optional().catch(undefined),
          parentsAreSenior: z.boolean().optional().catch(undefined),
          section80E: money.optional().catch(undefined),
          section80G: money.optional().catch(undefined),
        })
        .optional().catch(undefined),
      taxesPaid: money.optional().catch(undefined),
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
