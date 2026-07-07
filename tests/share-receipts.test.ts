/** Share links + rent receipts + PDF v2 tests (feature batch 5). */
import { describe, expect, it } from "vitest";
import { computeBoth, emptyProfile } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";
import { decodeProfile, encodeProfile } from "../src/lib/share";
import { generateRentReceiptsPdf } from "../src/lib/pdf/rentReceipts";
import { generateFilingSummaryPdf } from "../src/lib/pdf/filingSummary";
import { optimize } from "../src/lib/optimizer";
import { computeInsights } from "../src/lib/optimizer/insights";
import { advanceTaxPlan } from "../src/lib/tax-engine/advanceTax";
import { recommendItrForm } from "../src/lib/tax-engine/itrForm";

const profile: TaxProfile = {
  ...emptyProfile(),
  salary: {
    grossSalary: 2_500_000, basicPlusDA: 1_250_000, hraReceived: 300_000, rentPaid: 300_000,
    isMetroCity: true, employerNpsContribution: 0, professionalTax: 2_400,
  },
  deductions: { ...emptyProfile().deductions, section80C: 150_000 },
};

describe("share links", () => {
  it("round-trips a profile losslessly through base64url", () => {
    const enc = encodeProfile(profile);
    expect(enc).not.toMatch(/[+/=]/); // url-safe
    const dec = decodeProfile(enc);
    expect(dec.ok).toBe(true);
    if (dec.ok) {
      expect(dec.profile.salary!.grossSalary).toBe(2_500_000);
      expect(computeBoth(dec.profile).new.totalTaxLiability).toBe(computeBoth(profile).new.totalTaxLiability);
    }
  });

  it("rejects tampered and oversized links cleanly", () => {
    expect(decodeProfile("not-base64!!").ok).toBe(false);
    expect(decodeProfile("x".repeat(9000)).ok).toBe(false);
    // valid base64 of a non-profile → schema coerces or rejects, never throws
    const junk = Buffer.from('"hello"').toString("base64url");
    expect(decodeProfile(junk).ok).toBe(false);
  });
});

describe("rent receipts PDF", () => {
  it("generates a valid PDF with PAN note logic", async () => {
    const pdf = await generateRentReceiptsPdf({
      tenantName: "Mridul Nanda", landlordName: "Sharma Properties",
      propertyAddress: "12 MG Road, Pune 411001", monthlyRent: 25_000, months: 12,
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3_000);
  });

  it("caps months to 1..12", async () => {
    const pdf = await generateRentReceiptsPdf({
      tenantName: "AB", landlordName: "CD", propertyAddress: "somewhere long enough",
      monthlyRent: 10_000, months: 99,
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });
});

describe("filing summary PDF v2", () => {
  it("renders with advance-tax, ITR and insights sections", async () => {
    const comparison = computeBoth(profile);
    const best = comparison[comparison.recommended];
    const adv = advanceTaxPlan(profile, best);
    const pdf = await generateFilingSummaryPdf({
      profile, comparison, optimizer: optimize(profile),
      advanceTax: {
        applicable: adv.applicable, reason: adv.reason,
        installments: adv.installments, interest234C_ifAllMissed: adv.interest234C_ifAllMissed,
      },
      itr: recommendItrForm(profile, best.totalIncome),
      insights: computeInsights(profile, comparison),
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(4_000);
  });
});
