/**
 * Batch 88 — property capital gains engine (post Finance (No.2) Act 2024).
 * LTCG on land/building at 12.5% without indexation — with the resident-
 * individual GRANDFATHER option (acquired before 23-Jul-2024): 20% WITH
 * indexation if that is lower. Plus the s.54 / s.54F / s.54EC exemption
 * planner every property sale conversation needs.
 */

/** Cost Inflation Index (notified). */
export const CII: Record<string, number> = {
  "2001-02": 100, "2002-03": 105, "2003-04": 109, "2004-05": 113, "2005-06": 117,
  "2006-07": 122, "2007-08": 129, "2008-09": 137, "2009-10": 148, "2010-11": 167,
  "2011-12": 184, "2012-13": 200, "2013-14": 220, "2014-15": 240, "2015-16": 254,
  "2016-17": 264, "2017-18": 272, "2018-19": 280, "2019-20": 289, "2020-21": 301,
  "2021-22": 317, "2022-23": 331, "2023-24": 348, "2024-25": 363, "2025-26": 376,
};

export interface PropertySaleInput {
  salePrice: number;
  purchaseCost: number;
  /** FY of purchase, e.g. "2015-16" (for CII). */
  purchaseFY: string;
  /** Acquired before 23-Jul-2024 → grandfather option available (resident individual/HUF). */
  acquiredBeforeJul2024: boolean;
  /** Held > 24 months → long-term. */
  longTerm: boolean;
  /** What was sold. */
  asset: "residential-house" | "other-property";
  /** Planned reinvestment in a new residential house (₹). */
  reinvestHouse: number;
  /** Planned 54EC bonds (₹, capped 50L). */
  reinvestBonds: number;
  /** For 54F: owns more than one other residential house on sale date? */
  ownsMoreThanOneHouse: boolean;
}

export interface PropertySaleResult {
  gainNoIndex: number;
  gainIndexed: number | null;
  taxNoIndex: number;
  taxIndexed: number | null;
  chosen: "12.5% (no indexation)" | "20% (indexed, grandfathered)";
  taxBeforeExemption: number;
  exemption54: number;
  exemption54EC: number;
  taxableGainAfterExemptions: number;
  finalTax: number;
  notes: string[];
}

export function propertySale(i: PropertySaleInput): PropertySaleResult {
  const notes: string[] = [];
  const gainNoIndex = Math.max(0, i.salePrice - i.purchaseCost);

  if (!i.longTerm) {
    const taxable = gainNoIndex;
    notes.push("Held ≤ 24 months → SHORT-term: the gain is added to total income and taxed at slab rates — none of the s.54 family exemptions apply.");
    return {
      gainNoIndex, gainIndexed: null, taxNoIndex: 0, taxIndexed: null,
      chosen: "12.5% (no indexation)", taxBeforeExemption: 0,
      exemption54: 0, exemption54EC: 0, taxableGainAfterExemptions: taxable, finalTax: 0, notes,
    };
  }

  const ciiBuy = CII[i.purchaseFY];
  const ciiSale = CII["2025-26"];
  let gainIndexed: number | null = null;
  if (i.acquiredBeforeJul2024 && ciiBuy) {
    gainIndexed = Math.max(0, Math.round(i.salePrice - (i.purchaseCost * ciiSale) / ciiBuy));
  }

  const taxNoIndex = Math.round(gainNoIndex * 0.125);
  const taxIndexed = gainIndexed !== null ? Math.round(gainIndexed * 0.20) : null;
  const useIndexed = taxIndexed !== null && taxIndexed < taxNoIndex;
  const chosen = useIndexed ? "20% (indexed, grandfathered)" : "12.5% (no indexation)";
  const gain = useIndexed ? (gainIndexed as number) : gainNoIndex;
  const rate = useIndexed ? 0.20 : 0.125;
  if (i.acquiredBeforeJul2024)
    notes.push(`Grandfather comparison (acquired pre-23-Jul-2024): 12.5% flat = ₹${taxNoIndex.toLocaleString("en-IN")} vs 20% indexed = ₹${(taxIndexed ?? 0).toLocaleString("en-IN")} — the LOWER applies for resident individuals/HUFs.`);
  else
    notes.push("Acquired on/after 23-Jul-2024 → only the 12.5% no-indexation rate applies.");

  // Exemptions — computed against the CHOSEN gain.
  let exemption54 = 0;
  if (i.reinvestHouse > 0) {
    const invest = Math.min(i.reinvestHouse, 100_000_000);
    if (i.reinvestHouse > 100_000_000) notes.push("New-house cost above ₹10 crore — s.54/54F benefit is capped at ₹10cr of investment (FA 2023).");
    if (i.asset === "residential-house") {
      exemption54 = Math.min(gain, invest);
      notes.push("s.54 (house → house): exemption = the amount of gain reinvested. Buy within 1 yr before / 2 yrs after, or construct within 3 yrs; park unutilised amounts in CGAS before the ITR due date.");
      if (gain <= 20_000_000) notes.push("Gain ≤ ₹2cr: the once-in-a-lifetime TWO-house option u/s 54 is available.");
    } else {
      if (i.ownsMoreThanOneHouse) {
        notes.push("s.54F blocked: you own more than one other residential house on the transfer date.");
      } else {
        exemption54 = Math.min(gain, Math.round((gain * invest) / Math.max(i.salePrice, 1)));
        notes.push("s.54F (other asset → house): exemption is PROPORTIONATE — gain × (amount invested ÷ net sale consideration). Invest the FULL consideration for full exemption.");
      }
    }
  }
  let exemption54EC = 0;
  if (i.reinvestBonds > 0) {
    exemption54EC = Math.min(i.reinvestBonds, 5_000_000, Math.max(0, gain - exemption54));
    if (i.reinvestBonds > 5_000_000) notes.push("s.54EC is capped at ₹50L per financial year.");
    notes.push("s.54EC: REC/PFC/IRFC capital-gain bonds within 6 months of transfer; 5-year lock-in; interest is taxable.");
  }

  const taxableGainAfterExemptions = Math.max(0, gain - exemption54 - exemption54EC);
  const finalTax = Math.round(taxableGainAfterExemptions * rate);
  notes.push("Buyer deducts TDS u/s 194-IA at 1% when consideration ≥ ₹50L — claim it in the return. Add 4% cess (and surcharge if applicable) to the tax shown.");

  return {
    gainNoIndex, gainIndexed, taxNoIndex, taxIndexed, chosen,
    taxBeforeExemption: Math.round(gain * rate),
    exemption54, exemption54EC, taxableGainAfterExemptions, finalTax, notes,
  };
}
