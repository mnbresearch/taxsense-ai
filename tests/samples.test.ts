import { describe, expect, it } from "vitest";
import { SAMPLES } from "@/app/app/samples";
import { computeBoth } from "@/lib/tax-engine";
import { safeParseProfile } from "@/lib/tax-engine/validate";

describe("sample profiles (Batch 32)", () => {
  it("ships exactly three curated samples", () => {
    expect(SAMPLES.length).toBe(3);
  });

  for (const s of SAMPLES) {
    it(`"${s.id}" passes API validation and computes sane taxes`, () => {
      const parsed = safeParseProfile(s.profile);
      expect(parsed.ok).toBe(true);
      const cmp = computeBoth(s.profile);
      expect(cmp.old.totalTaxLiability).toBeGreaterThanOrEqual(0);
      // ₹12L salaried & ₹7.5L presumptive legitimately hit ₹0 under the
      // new regime (87A rebate) — a selling point, not a bug.
      expect(cmp.new.totalTaxLiability).toBeGreaterThanOrEqual(0);
      expect(["old", "new"]).toContain(cmp.recommended);
    });
  }

  it("the ₹28L engineer owes real tax under both regimes", () => {
    const s = SAMPLES.find((x) => x.id === "senior28")!;
    const cmp = computeBoth(s.profile);
    expect(cmp.new.totalTaxLiability).toBeGreaterThan(100_000);
    expect(cmp.old.totalTaxLiability).toBeGreaterThan(100_000);
  });

  it("the ₹12L metro renter benefits from HRA in the old regime", () => {
    const s = SAMPLES.find((x) => x.id === "salaried12")!;
    const cmp = computeBoth(s.profile);
    expect(cmp.old.salaryExemptions.hraExempt).toBeGreaterThan(0);
  });
});
