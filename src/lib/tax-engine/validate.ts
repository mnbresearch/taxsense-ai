/**
 * Runtime validation for TaxProfile (robustness batch).
 * Every API route parses untrusted JSON through this schema before the
 * engine sees it — malformed payloads return a clean 400, never a crash.
 */
import { z } from "zod";
import type { TaxProfile } from "./types";

const money = z.number().finite().min(0).max(100_000_000_000);

export const TaxProfileSchema = z.object({
  name: z.string().max(120).optional(),
  age: z.number().int().min(18).max(110).catch(30),
  residentialStatus: z.enum(["resident", "nri"]).catch("resident"),
  salary: z
    .object({
      grossSalary: money.catch(0),
      basicPlusDA: money.catch(0),
      hraReceived: money.catch(0),
      rentPaid: money.catch(0),
      isMetroCity: z.boolean().catch(false),
      employerNpsContribution: money.catch(0),
      professionalTax: money.catch(0),
    })
    .optional(),
  houseProperties: z
    .array(
      z.object({
        use: z.enum(["self-occupied", "let-out"]).catch("self-occupied"),
        annualRent: money.catch(0),
        municipalTaxes: money.catch(0),
        homeLoanInterest: money.catch(0),
      })
    )
    .max(10)
    .catch([]),
  capitalGains: z
    .object({
      stcg111A: money.catch(0),
      stcgOther: money.catch(0),
      ltcg112A: money.catch(0),
      ltcgOther: money.catch(0),
    })
    .optional(),
  business: z.object({ netIncome: money.catch(0), presumptive: z.boolean().catch(false) }).optional(),
  otherSources: z
    .object({
      savingsInterest: money.catch(0),
      fdInterest: money.catch(0),
      dividends: money.catch(0),
      familyPension: money.catch(0),
      other: money.catch(0),
    })
    .optional(),
  deductions: z
    .object({
      section80C: money.catch(0),
      section80CCD1B: money.catch(0),
      section80D_selfFamily: money.catch(0),
      section80D_parents: money.catch(0),
      parentsAreSenior: z.boolean().catch(false),
      section80E: money.catch(0),
      section80G: money.catch(0),
    })
    .catch({
      section80C: 0, section80CCD1B: 0, section80D_selfFamily: 0,
      section80D_parents: 0, parentsAreSenior: false, section80E: 0, section80G: 0,
    }),
  taxesPaid: money.catch(0),
});

/** Parse untrusted input → safe TaxProfile, or throw a ZodError with details. */
export function parseProfile(input: unknown): TaxProfile {
  return TaxProfileSchema.parse(input) as TaxProfile;
}

/** Non-throwing variant. */
export function safeParseProfile(input: unknown): { ok: true; profile: TaxProfile } | { ok: false; error: string } {
  const r = TaxProfileSchema.safeParse(input);
  if (r.success) return { ok: true, profile: r.data as TaxProfile };
  return { ok: false, error: r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
