import { describe, it, expect } from "vitest";
import { newIntakeState, mergeExtraction } from "@/lib/intake/engine";
import { safeParseProfile } from "@/lib/tax-engine/validate";

describe("chat route state validation", () => {
  it("accepts a fresh intake state profile", () => {
    expect(safeParseProfile(newIntakeState().profile).ok).toBe(true);
  });
  it("accepts a profile after a salary extraction round-trips through JSON", () => {
    const s = mergeExtraction(newIntakeState(), {
      updates: { salary: { grossSalary: 1_800_000 } }, notApplicable: [], estimates: [], clarify: null,
    } as never);
    expect(safeParseProfile(JSON.parse(JSON.stringify(s.profile))).ok).toBe(true);
  });
  it("neutralises a tampered profile (bad numbers → 0, absurd values capped)", () => {
    const r = safeParseProfile({ salary: { grossSalary: "lots" }, taxesPaid: -5, age: 9999 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.salary?.grossSalary).toBe(0);
      expect(r.profile.taxesPaid).toBe(0);
      expect(r.profile.age).toBe(30);
    }
  });
});
