/** Tax Guide knowledge-engine tests (feature batch 6). */
import { describe, expect, it } from "vitest";
import { buildGuide } from "../src/lib/guide";

const flat = (r: ReturnType<typeof buildGuide>) =>
  r.sections.map((s) => s.title + " :: " + s.points.join(" ")).join("\n");

describe("business owners", () => {
  it("small digital shop → 44AD + ITR-4 + single March installment", () => {
    const r = buildGuide({
      earns: ["business"], entity: "individual", turnoverBand: "upto2cr",
      mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "12to50L",
    });
    expect(r.itrForm).toBe("ITR-4 (Sugam)");
    expect(flat(r)).toMatch(/44AD/);
    expect(flat(r)).toMatch(/6% of digital/);
    expect(r.deadlines.some((d) => d.what.includes("single 100%"))).toBe(true);
  });

  it("₹2-3cr turnover qualifies for 44AD ONLY when digital", () => {
    const digital = buildGuide({ earns: ["business"], entity: "individual", turnoverBand: "2to3cr", mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "12to50L" });
    expect(digital.itrForm).toBe("ITR-4 (Sugam)");
    const cash = buildGuide({ earns: ["business"], entity: "individual", turnoverBand: "2to3cr", mostlyDigital: false, sellsGoods: true, soldAssets: false, incomeBand: "12to50L" });
    expect(cash.itrForm).toBe("ITR-3");
    expect(flat(cash)).toMatch(/out of reach/);
    expect(flat(cash)).toMatch(/audit u\/s 44AB applies/);
  });

  it("LLP is excluded from 44AD", () => {
    const r = buildGuide({ earns: ["business"], entity: "llp", turnoverBand: "upto2cr", mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "12to50L" });
    expect(flat(r)).toMatch(/LLPs are expressly excluded/);
    expect(r.itrForm).toBe("ITR-3");
  });

  it(">₹10cr → audit mandatory; ₹3-10cr digital → no audit", () => {
    const big = buildGuide({ earns: ["business"], entity: "individual", turnoverBand: "above10cr", mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "above50L" });
    expect(flat(big)).toMatch(/mandatory, full stop/);
    expect(big.deadlines.some((d) => d.date.includes("31 Oct"))).toBe(true);
    const mid = buildGuide({ earns: ["business"], entity: "individual", turnoverBand: "3to10cr", mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "12to50L" });
    expect(flat(mid)).toMatch(/NO tax audit/);
  });

  it("GST threshold flips with goods vs services", () => {
    const goods = buildGuide({ earns: ["business"], entity: "individual", turnoverBand: "upto2cr", mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "12to50L" });
    expect(flat(goods)).toMatch(/₹40 lakh/);
    const services = buildGuide({ earns: ["professional"], entity: "individual", receiptsBand: "upto50L", mostlyDigital: true, sellsGoods: false, soldAssets: false, incomeBand: "12to50L" });
    expect(flat(services)).toMatch(/₹20 lakh/);
  });
});

describe("professionals", () => {
  it("freelancer ≤50L → 44ADA, 50% presumption, ITR-4", () => {
    const r = buildGuide({ earns: ["professional"], entity: "individual", receiptsBand: "upto50L", mostlyDigital: true, sellsGoods: false, soldAssets: false, incomeBand: "12to50L" });
    expect(r.itrForm).toBe("ITR-4 (Sugam)");
    expect(flat(r)).toMatch(/50% of gross receipts/);
  });

  it("50-75L needs digital; above 75L is out + audit", () => {
    const cash = buildGuide({ earns: ["professional"], entity: "individual", receiptsBand: "50to75L", mostlyDigital: false, sellsGoods: false, soldAssets: false, incomeBand: "12to50L" });
    expect(flat(cash)).toMatch(/out of reach/);
    const big = buildGuide({ earns: ["professional"], entity: "individual", receiptsBand: "above75L", mostlyDigital: true, sellsGoods: false, soldAssets: false, incomeBand: "above50L" });
    expect(flat(big)).toMatch(/audit/i);
    expect(big.itrForm).toBe("ITR-3");
  });

  it("presumptive + capital gains bumps ITR-4 → ITR-3 with an explanation", () => {
    const r = buildGuide({ earns: ["professional"], entity: "individual", receiptsBand: "upto50L", mostlyDigital: true, sellsGoods: false, soldAssets: true, incomeBand: "12to50L" });
    expect(r.itrForm).toBe("ITR-3");
    expect(flat(r)).toMatch(/Why ITR-3/);
  });
});

describe("simpler filers", () => {
  it("plain salaried ≤12L → ITR-1 + zero-tax framing + Form 16 doc", () => {
    const r = buildGuide({ earns: ["salaried"], soldAssets: false, incomeBand: "upto12L" });
    expect(r.itrForm).toBe("ITR-1 (Sahaj)");
    expect(flat(r)).toMatch(/ZERO/);
    expect(r.documents.join()).toMatch(/Form 16/);
  });

  it("salaried + sold shares → ITR-2 with CG homework", () => {
    const r = buildGuide({ earns: ["salaried", "investor"], soldAssets: true, incomeBand: "12to50L" });
    expect(r.itrForm).toBe("ITR-2");
    expect(flat(r)).toMatch(/capital-gains homework/);
  });

  it("Form 10-IEA warning shows for business, not for salaried", () => {
    const biz = buildGuide({ earns: ["business"], entity: "individual", turnoverBand: "upto2cr", mostlyDigital: true, sellsGoods: true, soldAssets: false, incomeBand: "12to50L" });
    expect(flat(biz)).toMatch(/10-IEA/);
    const sal = buildGuide({ earns: ["salaried"], soldAssets: false, incomeBand: "12to50L" });
    expect(flat(sal)).not.toMatch(/10-IEA/);
    expect(flat(sal)).toMatch(/switch regimes every year/);
  });
});
