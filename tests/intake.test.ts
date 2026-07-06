/**
 * Intake engine tests (Session 3) — merge logic, messy-answer handling,
 * question sequencing, and the zero-key mock provider path.
 */
import { describe, expect, it } from "vitest";
import { ExtractionSchema } from "../src/lib/intake/schema";
import { mergeExtraction, newIntakeState, nextQuestion, runIntakeTurn } from "../src/lib/intake/engine";
import { mockExtract } from "../src/lib/intake/provider";

describe("extraction schema", () => {
  it("accepts a partial update and defaults the rest", () => {
    const ex = ExtractionSchema.parse({ updates: { salary: { grossSalary: 960000 } } });
    expect(ex.notApplicable).toEqual([]);
    expect(ex.clarify).toBeNull();
  });

  it("rejects negative amounts and absurd ages", () => {
    expect(() => ExtractionSchema.parse({ updates: { taxesPaid: -5 } })).toThrow();
    expect(() => ExtractionSchema.parse({ updates: { age: 5 } })).toThrow();
  });
});

describe("mock extractor — messy real-world answers", () => {
  it("'I get around 80k a month plus a bonus sometimes' → ₹9.6L estimate", () => {
    const out = JSON.parse(mockExtract("My salary is around 80k a month plus a bonus sometimes"));
    expect(out.updates.salary.grossSalary).toBe(960000);
    expect(out.estimates.length).toBeGreaterThan(0);
  });

  it("'12 LPA' → ₹12,00,000", () => {
    const out = JSON.parse(mockExtract("my ctc is 12 lpa"));
    expect(out.updates.salary.grossSalary).toBe(1200000);
  });

  it("'no house' marks the section not applicable", () => {
    const out = JSON.parse(mockExtract("no house, I rent"));
    expect(out.notApplicable).toContain("houseProperty");
  });

  it("'1.5 lakh in PPF' → 80C 150000", () => {
    const out = JSON.parse(mockExtract("I put 1.5 lakh in PPF this year"));
    expect(out.updates.deductions.section80C).toBe(150000);
  });
});

describe("merge + sequencing", () => {
  it("merges salary and defaults basic to 50% of gross (flagged path)", () => {
    let s = newIntakeState();
    s = mergeExtraction(s, ExtractionSchema.parse({ updates: { salary: { grossSalary: 1200000 } } }));
    expect(s.profile.salary?.basicPlusDA).toBe(600000);
  });

  it("asks income first, then walks the plan; completes when sections covered", () => {
    let s = newIntakeState();
    expect(nextQuestion(s)).toMatch(/how do you earn/);
    s = mergeExtraction(s, ExtractionSchema.parse({ updates: { salary: { grossSalary: 1200000, rentPaid: 240000 } } }));
    s = mergeExtraction(s, ExtractionSchema.parse({ notApplicable: ["houseProperty", "capitalGains", "otherSources"] }));
    expect(s.complete).toBe(false); // deductions still missing
    s = mergeExtraction(s, ExtractionSchema.parse({ updates: { deductions: { section80C: 50000 } } }));
    expect(s.complete).toBe(true);
  });

  it("later messages refine, not clobber, earlier ones", () => {
    let s = newIntakeState();
    s = mergeExtraction(s, ExtractionSchema.parse({ updates: { salary: { grossSalary: 1000000 } } }));
    s = mergeExtraction(s, ExtractionSchema.parse({ updates: { salary: { hraReceived: 200000 } } }));
    expect(s.profile.salary?.grossSalary).toBe(1000000);
    expect(s.profile.salary?.hraReceived).toBe(200000);
  });
});

describe("full turn (mock provider, zero keys)", () => {
  it("runs end-to-end and returns a reply + updated state", async () => {
    process.env.INTAKE_PROVIDER = "mock";
    const t = await runIntakeTurn(newIntakeState(), [], "I earn about 80k a month salary");
    expect(t.state.profile.salary?.grossSalary).toBe(960000);
    expect(t.reply.length).toBeGreaterThan(10);
    expect(t.providerName).toBe("mock/deterministic");
  });
});
