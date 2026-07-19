import { describe, expect, it } from "vitest";
import { compute80GG } from "@/lib/rent80gg";

describe("s.80GG (Batch 46)", () => {
  it("caps at ₹60,000/year", () => {
    const r = compute80GG({ adjustedTotalIncome: 1_000_000, rentPaid: 300_000 });
    expect(r.deduction).toBe(60_000);
    expect(r.binding).toBe("cap");
  });

  it("binds on rent − 10% of ATI for modest rents", () => {
    const r = compute80GG({ adjustedTotalIncome: 600_000, rentPaid: 100_000 });
    // 100k − 60k = 40k < 60k cap < 150k (25%)
    expect(r.deduction).toBe(40_000);
    expect(r.binding).toBe("rentExcess");
  });

  it("is zero when rent ≤ 10% of income", () => {
    const r = compute80GG({ adjustedTotalIncome: 1_200_000, rentPaid: 100_000 });
    expect(r.deduction).toBe(0);
  });

  it("binds on 25% of ATI at low incomes", () => {
    const r = compute80GG({ adjustedTotalIncome: 100_000, rentPaid: 90_000 });
    // limbs: 60k · 25k · 80k → 25k
    expect(r.deduction).toBe(25_000);
    expect(r.binding).toBe("pctIncome");
  });
});
