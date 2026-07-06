export * from "./types";
export * from "./constants";
export { computeRegime, computeBoth, hraExemption, slabTax } from "./engine";

import type { TaxProfile } from "./types";

/** A zeroed profile — useful for intake to fill incrementally. */
export function emptyProfile(): TaxProfile {
  return {
    age: 30,
    residentialStatus: "resident",
    houseProperties: [],
    deductions: {
      section80C: 0,
      section80CCD1B: 0,
      section80D_selfFamily: 0,
      section80D_parents: 0,
      parentsAreSenior: false,
      section80E: 0,
      section80G: 0,
    },
    taxesPaid: 0,
  };
}
