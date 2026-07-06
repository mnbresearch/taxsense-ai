/** PDF generation smoke tests (Session 4). */
import { describe, expect, it } from "vitest";
import { computeBoth, emptyProfile } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";
import { optimize } from "../src/lib/optimizer";
import { documentChecklist, generateFilingSummaryPdf } from "../src/lib/pdf/filingSummary";

const profile: TaxProfile = {
  ...emptyProfile(),
  name: "Test User",
  age: 32,
  salary: {
    grossSalary: 1_800_000,
    basicPlusDA: 900_000,
    hraReceived: 360_000,
    rentPaid: 300_000,
    isMetroCity: true,
    employerNpsContribution: 60_000,
    professionalTax: 2_400,
  },
  capitalGains: { stcg111A: 50_000, stcgOther: 0, ltcg112A: 200_000, ltcgOther: 0 },
  deductions: { ...emptyProfile().deductions, section80C: 150_000, section80D_selfFamily: 20_000 },
  taxesPaid: 150_000,
};

describe("filing summary PDF", () => {
  it("generates a valid, multi-section PDF", async () => {
    const comparison = computeBoth(profile);
    const pdf = await generateFilingSummaryPdf({
      profile,
      comparison,
      optimizer: optimize(profile),
      estimates: ["salary ≈ ₹18L — user said 'around 1.5L a month'"],
    });
    expect(pdf.length).toBeGreaterThan(3_000);
    const head = Buffer.from(pdf.slice(0, 5)).toString();
    expect(head).toBe("%PDF-");
  });

  it("checklist adapts to the profile", () => {
    const docs = documentChecklist(profile);
    expect(docs.join()).toMatch(/Form 16/);
    expect(docs.join()).toMatch(/capital-gains statement/);
    expect(docs.join()).toMatch(/Rent receipts/);
    const bare = documentChecklist(emptyProfile());
    expect(bare.join()).not.toMatch(/Form 16 from your employer/);
  });
});
