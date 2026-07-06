/**
 * TaxSense AI — Rules engine (pure functions).
 * FY 2025-26 (AY 2026-27). See constants.ts for statutory figures & sources.
 */
import {
  CESS_PCT,
  CG_RATES,
  DEDUCTION_CAPS,
  FAMILY_PENSION_DEDUCTION_CAP,
  HP_LOSS_SETOFF_CAP,
  NEW_REGIME_SLABS,
  REBATE_87A,
  SELF_OCCUPIED_INTEREST_CAP,
  STANDARD_DEDUCTION,
  SURCHARGE_BANDS,
  SURCHARGE_CAP_SPECIAL_PCT,
  basicExemptionLimit,
  oldRegimeSlabs,
  round10,
  roundRupee,
  SlabDef,
} from "./constants";
import type {
  ComparisonResult,
  Regime,
  RegimeComputation,
  SlabLine,
  TaxProfile,
} from "./types";

const clamp0 = (n: number) => Math.max(0, n);

/* ----------------------------- Head: salary ----------------------------- */

/**
 * s.10(13A) + Rule 2A — HRA exemption = min of:
 *   (a) HRA actually received
 *   (b) rent paid − 10% of (basic+DA)
 *   (c) 50% (metro) / 40% (non-metro) of (basic+DA)
 * OLD regime only — s.115BAC(2) disallows it in the new regime.
 */
export function hraExemption(s: NonNullable<TaxProfile["salary"]>): number {
  if (s.hraReceived <= 0 || s.rentPaid <= 0) return 0;
  const a = s.hraReceived;
  const b = s.rentPaid - 0.1 * s.basicPlusDA;
  const c = (s.isMetroCity ? 0.5 : 0.4) * s.basicPlusDA;
  return clamp0(Math.min(a, b, c));
}

function salaryHead(profile: TaxProfile, regime: Regime) {
  const s = profile.salary;
  if (!s || s.grossSalary <= 0)
    return { income: 0, hraExempt: 0, standardDeduction: 0, professionalTax: 0 };
  const hraExempt = regime === "old" ? hraExemption(s) : 0;
  const standardDeduction = Math.min(
    s.grossSalary - hraExempt,
    STANDARD_DEDUCTION[regime]
  );
  const professionalTax = regime === "old" ? Math.min(s.professionalTax, 2_500) : 0; // Art. 276 cap ₹2,500
  const income = clamp0(s.grossSalary - hraExempt - standardDeduction - professionalTax);
  return { income, hraExempt, standardDeduction, professionalTax };
}

/* ------------------------- Head: house property ------------------------- */

/**
 * s.22-24. Self-occupied: NAV = 0, interest deductible up to ₹2L (OLD only —
 * s.115BAC(2)(i) read with 24(b) disallows SOP interest in the new regime).
 * Let-out: (rent − municipal taxes) − 30% std deduction − full interest.
 * Net loss set-off against other heads capped at ₹2L (s.71(3A)) in the OLD
 * regime; NOT allowed at all in the new regime (excess carried forward).
 */
function housePropertyHead(profile: TaxProfile, regime: Regime, notes: string[]) {
  let total = 0;
  let sopInterest = 0;
  for (const hp of profile.houseProperties) {
    if (hp.use === "self-occupied") {
      sopInterest += hp.homeLoanInterest;
    } else {
      const nav = clamp0(hp.annualRent - hp.municipalTaxes);
      total += nav - 0.3 * nav - hp.homeLoanInterest;
    }
  }
  if (regime === "old" && sopInterest > 0) {
    const allowed = Math.min(sopInterest, SELF_OCCUPIED_INTEREST_CAP);
    total -= allowed;
    if (sopInterest > allowed)
      notes.push(
        `Self-occupied home-loan interest capped at ₹2,00,000 (claimed ₹${sopInterest.toLocaleString("en-IN")}).`
      );
  } else if (regime === "new" && sopInterest > 0) {
    notes.push(
      "Self-occupied home-loan interest is not deductible in the new regime (s.115BAC)."
    );
  }
  if (total < 0) {
    if (regime === "old") {
      const setOff = Math.min(-total, HP_LOSS_SETOFF_CAP);
      if (-total > setOff)
        notes.push(
          `House-property loss of ₹${(-total).toLocaleString("en-IN")} capped: ₹2,00,000 set off this year, balance carried forward (s.71(3A)).`
        );
      return -setOff;
    }
    notes.push(
      "House-property loss cannot be set off against other income in the new regime; carried forward within the head."
    );
    return 0;
  }
  return total;
}

/* ------------------------- Head: other sources ------------------------- */

function otherSourcesHead(profile: TaxProfile, regime: Regime) {
  const o = profile.otherSources;
  if (!o) return 0;
  const fpDeduction = Math.min(
    o.familyPension / 3,
    FAMILY_PENSION_DEDUCTION_CAP[regime]
  );
  return clamp0(
    o.savingsInterest + o.fdInterest + o.dividends + o.other + o.familyPension - fpDeduction
  );
}

/* --------------------------- Chapter VI-A --------------------------- */

function chapterVIA(
  profile: TaxProfile,
  regime: Regime,
  gtiExcludingSpecial: number,
  notes: string[]
): { allowed: Record<string, number>; total: number } {
  const d = profile.deductions;
  const allowed: Record<string, number> = {};

  // 80CCD(2) — employer NPS. Available in BOTH regimes; capped at 10% (old) /
  // 14% (new) of basic+DA.
  const npsCapPct = DEDUCTION_CAPS.employerNpsPctOfBasic[regime];
  const employerNps = profile.salary?.employerNpsContribution ?? 0;
  const basic = profile.salary?.basicPlusDA ?? 0;
  if (employerNps > 0) {
    allowed["80CCD(2)"] = Math.min(employerNps, (npsCapPct / 100) * basic);
    if (employerNps > allowed["80CCD(2)"])
      notes.push(`80CCD(2) capped at ${npsCapPct}% of basic+DA.`);
  }

  if (regime === "old") {
    // 80C + 80CCC + 80CCD(1) combined cap ₹1.5L (s.80CCE).
    allowed["80C"] = Math.min(d.section80C, DEDUCTION_CAPS.section80C);
    // 80CCD(1B) — additional ₹50k self NPS.
    allowed["80CCD(1B)"] = Math.min(d.section80CCD1B, DEDUCTION_CAPS.section80CCD1B);
    // 80D
    const selfCap =
      profile.age >= 60
        ? DEDUCTION_CAPS.section80D_selfFamily_senior
        : DEDUCTION_CAPS.section80D_selfFamily_below60;
    const parentCap = d.parentsAreSenior
      ? DEDUCTION_CAPS.section80D_parents_senior
      : DEDUCTION_CAPS.section80D_parents_below60;
    allowed["80D"] =
      Math.min(d.section80D_selfFamily, selfCap) + Math.min(d.section80D_parents, parentCap);
    // 80E (no cap), 80G (taken post-qualifying-limit).
    allowed["80E"] = clamp0(d.section80E);
    allowed["80G"] = clamp0(d.section80G);
    // 80TTA / 80TTB
    const o = profile.otherSources;
    if (o) {
      if (profile.age >= 60) {
        allowed["80TTB"] = Math.min(
          o.savingsInterest + o.fdInterest,
          DEDUCTION_CAPS.section80TTB
        );
      } else {
        allowed["80TTA"] = Math.min(o.savingsInterest, DEDUCTION_CAPS.section80TTA);
      }
    }
  } else if (
    d.section80C > 0 ||
    d.section80D_selfFamily + d.section80D_parents > 0 ||
    d.section80CCD1B > 0
  ) {
    notes.push(
      "80C / 80D / 80CCD(1B) etc. are not deductible in the new regime — only 80CCD(2) employer NPS survives (s.115BAC(2))."
    );
  }

  // VI-A cannot be claimed against special-rate capital gains (ss.112(2),
  // 112A(4), 111A(2)) — cap the aggregate at GTI excluding those gains.
  let total = Object.values(allowed).reduce((a, b) => a + b, 0);
  if (total > gtiExcludingSpecial) {
    notes.push(
      "Chapter VI-A deductions restricted: they cannot be set against special-rate capital gains."
    );
    total = clamp0(gtiExcludingSpecial);
  }
  return { allowed, total };
}

/* ----------------------------- Slab tax ----------------------------- */

export function slabTax(income: number, slabs: SlabDef[]): { tax: number; lines: SlabLine[] } {
  let tax = 0;
  let prev = 0;
  const lines: SlabLine[] = [];
  for (const s of slabs) {
    const upper = s.upTo ?? Infinity;
    const inSlab = clamp0(Math.min(income, upper) - prev);
    const t = (inSlab * s.ratePct) / 100;
    if (inSlab > 0)
      lines.push({ from: prev, to: s.upTo, ratePct: s.ratePct, taxableInSlab: inSlab, tax: t });
    tax += t;
    prev = upper;
    if (income <= upper) break;
  }
  return { tax, lines };
}

function slabsFor(regime: Regime, age: number): SlabDef[] {
  return regime === "new" ? NEW_REGIME_SLABS : oldRegimeSlabs(age);
}

/* --------------------------- Main computation --------------------------- */

export function computeRegime(profile: TaxProfile, regime: Regime): RegimeComputation {
  const notes: string[] = [];

  /* 1 — Income under each head */
  const sal = salaryHead(profile, regime);
  const hp = housePropertyHead(profile, regime, notes);
  const cg = profile.capitalGains ?? { stcg111A: 0, stcgOther: 0, ltcg112A: 0, ltcgOther: 0 };
  const cgTotal = cg.stcg111A + cg.stcgOther + cg.ltcg112A + cg.ltcgOther;
  const biz = profile.business?.netIncome ?? 0;
  const os = otherSourcesHead(profile, regime);

  const grossTotalIncome = clamp0(sal.income + hp + cgTotal + biz + os);

  /* 2 — Special-rate income (taxed outside the slabs) */
  // s.112A: first ₹1.25L of STT-paid equity LTCG is taxed at 0%. It remains
  // part of total income (for rebate/surcharge thresholds) but must be kept
  // OUT of slab-rate income.
  const exempt112A = Math.min(cg.ltcg112A, CG_RATES.ltcg112A_exemption);
  const ltcg112A_taxableRaw = clamp0(cg.ltcg112A - CG_RATES.ltcg112A_exemption);
  if (exempt112A > 0) notes.push("₹1,25,000 LTCG exemption applied u/s 112A.");
  const specialGross = cg.stcg111A + ltcg112A_taxableRaw + cg.ltcgOther;

  /* 3 — Chapter VI-A (not against ANY special-rate gains, incl. the exempt slice) */
  const gtiExcludingSpecial = clamp0(grossTotalIncome - specialGross - exempt112A);
  const via = chapterVIA(profile, regime, gtiExcludingSpecial, notes);

  const totalIncome = round10(clamp0(grossTotalIncome - via.total)); // s.288A
  let normalIncome = clamp0(totalIncome - specialGross - exempt112A);

  /* 4 — Unexhausted basic exemption against special-rate gains (residents;
     provisos to ss.111A(1), 112(1), 112A(2)). Applied in taxpayer-favourable
     order: highest-rate bucket last. */
  let stcgTaxable = cg.stcg111A;
  let ltcgATaxable = ltcg112A_taxableRaw;
  let ltcgOtherTaxable = cg.ltcgOther;
  let basicExemptionAdjustment = 0;
  if (profile.residentialStatus === "resident") {
    let shortfall = clamp0(basicExemptionLimit(regime, profile.age) - normalIncome);
    const eat = (amt: number) => {
      const used = Math.min(amt, shortfall);
      shortfall -= used;
      basicExemptionAdjustment += used;
      return amt - used;
    };
    ltcgOtherTaxable = eat(ltcgOtherTaxable); // 12.5%
    ltcgATaxable = eat(ltcgATaxable); // 12.5%
    stcgTaxable = eat(stcgTaxable); // 20% — reduced last
    if (basicExemptionAdjustment > 0)
      notes.push(
        `Unused basic exemption of ₹${basicExemptionAdjustment.toLocaleString("en-IN")} adjusted against special-rate gains.`
      );
  }

  /* 5 — Tax on normal (slab) income */
  const { tax: taxOnNormalIncome, lines: slabLines } = slabTax(
    normalIncome,
    slabsFor(regime, profile.age)
  );

  /* 6 — Tax on special-rate income */
  const specialRateTax = {
    stcg111A: {
      taxable: stcgTaxable,
      ratePct: CG_RATES.stcg111A_pct,
      tax: (stcgTaxable * CG_RATES.stcg111A_pct) / 100,
    },
    ltcg112A: {
      taxable: ltcgATaxable,
      ratePct: CG_RATES.ltcg112A_pct,
      tax: (ltcgATaxable * CG_RATES.ltcg112A_pct) / 100,
    },
    ltcgOther: {
      taxable: ltcgOtherTaxable,
      ratePct: CG_RATES.ltcgOther_pct,
      tax: (ltcgOtherTaxable * CG_RATES.ltcgOther_pct) / 100,
    },
  };
  const specialTax =
    specialRateTax.stcg111A.tax + specialRateTax.ltcg112A.tax + specialRateTax.ltcgOther.tax;
  const taxBeforeRebate = taxOnNormalIncome + specialTax;

  /* 7 — s.87A rebate (residents only) */
  let rebate87A = 0;
  let rebateMarginalRelief = 0;
  if (profile.residentialStatus === "resident") {
    if (regime === "old") {
      // Old regime: TI ≤ ₹5L → rebate up to ₹12,500. Not available against
      // 112A LTCG (s.112A(6) analogue — rebate excludes 112A tax).
      if (totalIncome <= REBATE_87A.old.incomeLimit) {
        rebate87A = Math.min(
          REBATE_87A.old.maxRebate,
          taxBeforeRebate - specialRateTax.ltcg112A.tax
        );
        rebate87A = clamp0(rebate87A);
      }
    } else {
      // New regime (FA 2025): TI ≤ ₹12L → rebate up to ₹60k, but ONLY against
      // tax on slab-rate income — special-rate CG stays taxable.
      if (totalIncome <= REBATE_87A.new.incomeLimit) {
        rebate87A = Math.min(REBATE_87A.new.maxRebate, taxOnNormalIncome);
        if (specialTax > 0 && taxOnNormalIncome > 0)
          notes.push("s.87A rebate applied to slab-rate tax only; capital-gains tax remains payable.");
      } else {
        // Marginal relief: slab tax cannot exceed the amount by which TI
        // exceeds ₹12L (computed on the slab-rate component).
        const excess = totalIncome - REBATE_87A.new.incomeLimit;
        if (taxOnNormalIncome > excess && normalIncome > REBATE_87A.new.incomeLimit) {
          rebateMarginalRelief = taxOnNormalIncome - excess;
          notes.push("s.87A marginal relief applied (income marginally above ₹12,00,000).");
        }
      }
    }
  }
  const taxAfterRebate = clamp0(taxBeforeRebate - rebate87A - rebateMarginalRelief);

  /* 8 — Surcharge, with 15% cap on special-rate CG + marginal relief */
  const { surcharge, surchargeMarginalRelief } = computeSurcharge(
    regime,
    profile.age,
    totalIncome,
    normalIncome,
    taxAfterRebate,
    specialTax > 0 ? Math.min(specialTax, taxAfterRebate) : 0,
    notes
  );

  /* 9 — Cess */
  const preCess = clamp0(taxAfterRebate + surcharge - surchargeMarginalRelief);
  const cess = (preCess * CESS_PCT) / 100;
  const totalTaxLiability = roundRupee(preCess + cess);

  const heads = {
    salary: sal.income,
    houseProperty: hp,
    capitalGains: cgTotal,
    business: biz,
    otherSources: os,
  };

  return {
    regime,
    heads,
    salaryExemptions: {
      hraExempt: sal.hraExempt,
      standardDeduction: sal.standardDeduction,
      professionalTax: sal.professionalTax,
    },
    grossTotalIncome,
    deductionsAllowed: via.allowed,
    totalDeductions: via.total,
    totalIncome,
    normalIncome,
    basicExemptionAdjustment,
    slabLines,
    taxOnNormalIncome: roundRupee(taxOnNormalIncome),
    specialRateTax,
    taxBeforeRebate: roundRupee(taxBeforeRebate),
    rebate87A: roundRupee(rebate87A),
    rebateMarginalRelief: roundRupee(rebateMarginalRelief),
    surcharge: roundRupee(surcharge),
    surchargeMarginalRelief: roundRupee(surchargeMarginalRelief),
    cess: roundRupee(cess),
    totalTaxLiability,
    taxesPaid: profile.taxesPaid,
    netPayable: totalTaxLiability - profile.taxesPaid,
    effectiveRatePct:
      totalIncome > 0 ? Math.round((totalTaxLiability / totalIncome) * 10000) / 100 : 0,
    notes,
  };
}

/**
 * Surcharge with (a) the 15% cap on tax attributable to 111A/112A/112 gains
 * and (b) marginal relief: increase in (tax+surcharge) over the threshold
 * cannot exceed the income above the threshold.
 */
function computeSurcharge(
  regime: Regime,
  age: number,
  totalIncome: number,
  normalIncome: number,
  taxAfterRebate: number,
  specialTaxPortion: number,
  notes: string[]
): { surcharge: number; surchargeMarginalRelief: number } {
  const bands = SURCHARGE_BANDS[regime];
  const band = bands.find((b) => totalIncome > b.above);
  if (!band || taxAfterRebate <= 0) return { surcharge: 0, surchargeMarginalRelief: 0 };

  const generalPct = band.pct;
  const specialPct = Math.min(generalPct, SURCHARGE_CAP_SPECIAL_PCT);
  const normalTaxPortion = clamp0(taxAfterRebate - specialTaxPortion);
  const surcharge =
    (normalTaxPortion * generalPct) / 100 + (specialTaxPortion * specialPct) / 100;
  if (generalPct > SURCHARGE_CAP_SPECIAL_PCT && specialTaxPortion > 0)
    notes.push("Surcharge on capital-gains tax capped at 15%.");

  // Marginal relief (approximation documented in tests): compare against tax
  // at the threshold assuming the excess is slab-rate income — the common
  // case. (tax + surcharge) ≤ tax@threshold × (1 + pct@threshold) + (TI − threshold).
  const threshold = band.above;
  const excessIncome = totalIncome - threshold;
  const normalAtThreshold = clamp0(normalIncome - excessIncome);
  const { tax: slabTaxAtThreshold } = slabTax(
    normalAtThreshold,
    regime === "new" ? NEW_REGIME_SLABS : oldRegimeSlabs(age)
  );
  const taxAtThreshold = slabTaxAtThreshold + specialTaxPortion;
  const lowerBand = bands.find((b) => threshold > b.above);
  const surchargeAtThreshold = lowerBand
    ? (clamp0(taxAtThreshold - specialTaxPortion) * lowerBand.pct) / 100 +
      (specialTaxPortion * Math.min(lowerBand.pct, SURCHARGE_CAP_SPECIAL_PCT)) / 100
    : 0;
  const maxPayable = taxAtThreshold + surchargeAtThreshold + excessIncome;
  const payable = taxAfterRebate + surcharge;
  const relief = clamp0(payable - maxPayable);
  if (relief > 0) notes.push("Marginal relief on surcharge applied.");
  return { surcharge, surchargeMarginalRelief: relief };
}

/** Compute both regimes and recommend. */
export function computeBoth(profile: TaxProfile): ComparisonResult {
  const o = computeRegime(profile, "old");
  const n = computeRegime(profile, "new");
  const recommended: Regime = n.totalTaxLiability <= o.totalTaxLiability ? "new" : "old";
  return {
    old: o,
    new: n,
    recommended,
    savings: Math.abs(o.totalTaxLiability - n.totalTaxLiability),
  };
}
