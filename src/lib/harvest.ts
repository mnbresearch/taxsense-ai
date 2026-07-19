/**
 * Batch 45 — s.112A LTCG harvesting planner. The ₹1.25L annual exemption
 * is use-it-or-lose-it; harvesting = selling (and optionally rebuying) to
 * consume it, stepping up cost basis tax-free.
 */
export const LTCG_EXEMPTION = 125_000;
export const LTCG_RATE = 0.125;

export interface HarvestInput {
  /** LTCG already realized (booked) this FY on listed equity/equity MF. */
  realized: number;
  /** Unrealized LTCG currently sitting in holdings eligible u/s 112A (held > 12 months). */
  unrealized: number;
}

export interface HarvestPlan {
  exemptionLeft: number;
  /** How much MORE gain to book this year at zero tax. */
  harvestNow: number;
  /** Tax avoided if that gain would otherwise be taxed later at 12.5%. */
  taxSaved: number;
  /** Tax already due on realized gains above the exemption. */
  taxOnExcess: number;
  fullyUsed: boolean;
}

export function planHarvest(inp: HarvestInput): HarvestPlan {
  const realized = Math.max(0, inp.realized);
  const unrealized = Math.max(0, inp.unrealized);
  const exemptionLeft = Math.max(0, LTCG_EXEMPTION - realized);
  const harvestNow = Math.min(exemptionLeft, unrealized);
  const taxOnExcess = Math.round(Math.max(0, realized - LTCG_EXEMPTION) * LTCG_RATE);
  return {
    exemptionLeft,
    harvestNow,
    taxSaved: Math.round(harvestNow * LTCG_RATE),
    taxOnExcess,
    fullyUsed: exemptionLeft === 0,
  };
}
