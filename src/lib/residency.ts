/**
 * Batch 89 — residential status (s.6) + gift taxability (s.56(2)(x)).
 * The two questions NRIs and their families ask before anything else.
 */

export interface ResidencyInput {
  /** Days in India during FY 2025-26. */
  daysThisYear: number;
  /** Total days in India during the 4 preceding FYs. */
  days4PrecedingYears: number;
  /** Indian citizen or Person of Indian Origin? */
  citizenOrPIO: boolean;
  /** Citizen/PIO living abroad, VISITING India this year? */
  visitingIndia: boolean;
  /** Left India for employment abroad / as crew this year? */
  leftForEmployment: boolean;
  /** India-sourced income (excl. foreign sources) > ₹15L? */
  indianIncomeOver15L: boolean;
  /** Not liable to tax in ANY other country (for deemed residency)? */
  notTaxedAnywhere: boolean;
  /** Resident in at least 2 of the 10 preceding FYs? */
  residentIn2of10: boolean;
  /** ≥ 730 days in India in the 7 preceding FYs? */
  days730In7: boolean;
}

export function residentialStatus(i: ResidencyInput): { status: "ROR" | "RNOR" | "NR"; reasons: string[] } {
  const r: string[] = [];
  let resident = false;
  let forcedRNOR = false;

  if (i.daysThisYear >= 182) {
    resident = true;
    r.push("≥182 days in India this FY → resident under s.6(1)(a).");
  } else {
    // Second limb: 60 + 365-in-4. Relaxations:
    let limb2Threshold = 60;
    if (i.leftForEmployment) { limb2Threshold = 182; r.push("Left India for employment/as crew → the 60-day limb relaxes to 182 days (Expl. 1(a))."); }
    else if (i.citizenOrPIO && i.visitingIndia) {
      limb2Threshold = i.indianIncomeOver15L ? 120 : 182;
      r.push(i.indianIncomeOver15L
        ? "Citizen/PIO visiting India with Indian income > ₹15L → the 60-day limb relaxes to 120 days (Expl. 1(b))."
        : "Citizen/PIO visiting India (Indian income ≤ ₹15L) → the 60-day limb relaxes to 182 days.");
    }
    if (i.daysThisYear >= limb2Threshold && i.days4PrecedingYears >= 365) {
      resident = true;
      r.push(`≥${limb2Threshold} days this FY AND ≥365 days across the 4 preceding FYs → resident under s.6(1)(c).`);
      if (i.citizenOrPIO && i.visitingIndia && i.indianIncomeOver15L && i.daysThisYear < 182) {
        forcedRNOR = true;
        r.push("Resident only via the 120-day rule → automatically RNOR (s.6(6)(c)).");
      }
    }
  }

  if (!resident && i.citizenOrPIO && i.indianIncomeOver15L && i.notTaxedAnywhere) {
    resident = true;
    forcedRNOR = true;
    r.push("Deemed resident u/s 6(1A): Indian citizen, Indian income > ₹15L, not liable to tax anywhere → automatically RNOR (s.6(6)(d)).");
  }

  if (!resident) {
    r.push("Neither day-count limb met → NON-RESIDENT. Only India-sourced/received income is taxable; foreign income stays out.");
    return { status: "NR", reasons: r };
  }
  if (forcedRNOR) {
    r.push("RNOR: foreign income stays outside Indian tax (unless from a business controlled in India); no foreign-asset Schedule FA burden of an ROR.");
    return { status: "RNOR", reasons: r };
  }
  if (!i.residentIn2of10 || !i.days730In7) {
    r.push(!i.residentIn2of10
      ? "Resident in fewer than 2 of the 10 preceding FYs → RNOR u/s 6(6)(a)."
      : "Fewer than 730 days in the 7 preceding FYs → RNOR u/s 6(6)(a).");
    r.push("RNOR: foreign income generally not taxable in India.");
    return { status: "RNOR", reasons: r };
  }
  r.push("Both additional conditions met → ROR: WORLDWIDE income taxable + Schedule FA foreign-asset reporting applies.");
  return { status: "ROR", reasons: r };
}

/* ------------------------- Gifts — s.56(2)(x) ------------------------- */

export interface GiftInput {
  kind: "money" | "immovable" | "movable";
  /** Money received / stamp-duty value / fair market value (aggregate for the year). */
  value: number;
  fromRelative: boolean;
  onMarriage: boolean;
  byWillOrInheritance: boolean;
}

export function giftTaxability(i: GiftInput): { taxable: number; verdict: string; notes: string[] } {
  const notes: string[] = [];
  if (i.fromRelative || i.onMarriage || i.byWillOrInheritance) {
    const why = i.fromRelative ? "from a specified relative" : i.onMarriage ? "on the occasion of your marriage" : "under a will/inheritance";
    notes.push(`Fully EXEMPT — gifts ${why} are outside s.56(2)(x) with no upper limit.`);
    notes.push("'Relative' = spouse, siblings (yours & spouse's), parents' siblings, lineal ascendants/descendants of you or spouse, and their spouses. Friends are NOT relatives.");
    if (i.fromRelative) notes.push("Watch clubbing: income FROM assets gifted to a spouse or minor child clubs back u/s 64.");
    return { taxable: 0, verdict: "Exempt", notes };
  }
  if (i.value <= 50_000) {
    notes.push("Aggregate value ≤ ₹50,000 in the FY → not taxable. Cross ₹50,000 and the WHOLE amount becomes taxable, not just the excess.");
    return { taxable: 0, verdict: "Not taxable (within ₹50k)", notes };
  }
  notes.push("Taxable as 'Income from other sources' at slab rates — the ENTIRE value once the ₹50,000 aggregate is crossed.");
  if (i.kind === "immovable") notes.push("For property received at inadequate consideration: taxed if stamp value exceeds consideration by BOTH ₹50k and 10%.");
  return { taxable: i.value, verdict: "Taxable", notes };
}
