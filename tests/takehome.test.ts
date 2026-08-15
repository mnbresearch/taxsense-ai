/** Batch 79 — CTC → in-hand sanity. */
import { describe, expect, it } from "vitest";
import { takeHome } from "../src/lib/takehome";

const base = { basicPct: 0.4, includesEmployerPf: true, includesGratuity: false, monthlyRent: 0, isMetroCity: false };

describe("take-home", () => {
  it("CTC anatomy: employer PF removed before gross", () => {
    const r = takeHome({ ...base, ctc: 1_000_000 });
    expect(r.basic).toBe(400_000);
    expect(r.employerPf).toBe(48_000);
    expect(r.gross).toBe(952_000);
    expect(r.employeePf).toBe(48_000);
  });

  it("₹12L CTC → near-zero tax in new regime (87A)", () => {
    const r = takeHome({ ...base, ctc: 1_200_000 });
    expect(r.annualTax.new).toBe(0);
    expect(r.recommended).toBe("new");
  });

  it("in-hand is monotonic in CTC", () => {
    const a = takeHome({ ...base, ctc: 1_500_000 });
    const b = takeHome({ ...base, ctc: 2_500_000 });
    expect(b.monthlyInHand[b.recommended]).toBeGreaterThan(a.monthlyInHand[a.recommended]);
  });

  it("rent + metro can flip the winner toward old regime at high rent", () => {
    const withRent = takeHome({ ...base, ctc: 2_000_000, monthlyRent: 40_000, isMetroCity: true });
    const noRent = takeHome({ ...base, ctc: 2_000_000 });
    expect(withRent.annualTax.old).toBeLessThan(noRent.annualTax.old);
  });

  it("gratuity reduces gross when included", () => {
    const g = takeHome({ ...base, ctc: 1_000_000, includesGratuity: true });
    expect(g.gross).toBe(952_000 - Math.round(400_000 * 0.0481));
  });
});
