/**
 * Salary Structure Optimizer — "CTC Designer" (feature batch 8).
 *
 * The differentiator: every tax tool computes tax on the structure you HAVE.
 * This searches the structure you SHOULD ASK HR FOR.
 *
 * Given CTC, rent and city, it sweeps:
 *   - basic+DA as a % of CTC (35% … 60%)
 *   - employer NPS routed under 80CCD(2) (0 … 14% of basic)
 * models HRA as the common 50%-of-basic component, computes BOTH regimes for
 * every combination through the real rules engine, and returns the frontier.
 *
 * Honest modelling notes (also surfaced to the user):
 *   - HRA component assumed at 50% of basic (typical corporate structure).
 *   - Employer NPS is part of CTC but escapes tax via 80CCD(2) — the engine
 *     caps it at 10%/14% of basic (old/new) automatically.
 *   - Higher basic raises EPF outflow (12%+12%) — better retirement savings,
 *     lower monthly cash-in-hand. We flag it; we don't hide it.
 *   - Wage Code direction: basic ≥ 50% of total pay — structures below that
 *     are marked accordingly.
 */
import { computeBoth } from "../tax-engine";
import type { TaxProfile } from "../tax-engine";

export interface StructureInput {
  ctc: number;
  rentPaid: number;
  isMetroCity: boolean;
  age: number;
  /** Current structure, for the savings comparison (optional). */
  currentBasicPct?: number; // % of CTC
  currentEmployerNpsPct?: number; // % of basic
  /** Existing chapter VI-A deductions to keep in the model. */
  deductions?: TaxProfile["deductions"];
}

export interface StructureOption {
  basicPct: number;
  employerNpsPct: number;
  basicPlusDA: number;
  employerNps: number;
  hraComponent: number;
  oldTax: number;
  newTax: number;
  bestTax: number;
  bestRegime: "old" | "new";
  wageCodeAligned: boolean;
}

export interface StructureReport {
  options: StructureOption[]; // sorted best-first
  best: StructureOption;
  current: StructureOption | null;
  savingsVsCurrent: number | null;
  notes: string[];
}

const BASIC_STEPS = [35, 40, 45, 50, 55, 60];
const ENPS_STEPS = [0, 5, 10, 14];

function buildProfile(input: StructureInput, basicPct: number, enpsPct: number): TaxProfile {
  const basic = Math.round((basicPct / 100) * input.ctc);
  const enps = Math.round((enpsPct / 100) * basic);
  return {
    age: input.age,
    residentialStatus: "resident",
    houseProperties: [],
    salary: {
      grossSalary: input.ctc,
      basicPlusDA: basic,
      hraReceived: Math.round(basic * 0.5),
      rentPaid: input.rentPaid,
      isMetroCity: input.isMetroCity,
      employerNpsContribution: enps,
      professionalTax: 2_400,
    },
    deductions:
      input.deductions ?? {
        section80C: 0, section80CCD1B: 0, section80D_selfFamily: 0,
        section80D_parents: 0, parentsAreSenior: false, section80E: 0, section80G: 0,
      },
    taxesPaid: 0,
  };
}

function evaluate(input: StructureInput, basicPct: number, enpsPct: number): StructureOption {
  const p = buildProfile(input, basicPct, enpsPct);
  const cmp = computeBoth(p);
  const oldTax = cmp.old.totalTaxLiability;
  const newTax = cmp.new.totalTaxLiability;
  const bestRegime = newTax <= oldTax ? "new" : "old";
  return {
    basicPct,
    employerNpsPct: enpsPct,
    basicPlusDA: p.salary!.basicPlusDA,
    employerNps: p.salary!.employerNpsContribution,
    hraComponent: p.salary!.hraReceived,
    oldTax,
    newTax,
    bestTax: Math.min(oldTax, newTax),
    bestRegime,
    wageCodeAligned: basicPct >= 50,
  };
}

export function optimizeStructure(input: StructureInput): StructureReport {
  const options: StructureOption[] = [];
  for (const b of BASIC_STEPS)
    for (const e of ENPS_STEPS) options.push(evaluate(input, b, e));
  options.sort((a, b) => a.bestTax - b.bestTax || b.basicPct - a.basicPct);
  const best = options[0];

  const current =
    input.currentBasicPct != null
      ? evaluate(input, input.currentBasicPct, input.currentEmployerNpsPct ?? 0)
      : null;
  const savingsVsCurrent = current ? Math.max(0, current.bestTax - best.bestTax) : null;

  const notes: string[] = [
    "HRA component modelled at 50% of basic — the most common corporate structure. Your employer's template may differ.",
    "Employer NPS (80CCD(2)) is your own CTC routed pre-tax into retirement — it lowers take-home now, locked till 60. The engine caps it at 10%/14% of basic (old/new regime) automatically.",
    "Higher basic also raises EPF contributions (12% employee + 12% employer) — more savings, less monthly cash. Factor your liquidity.",
  ];
  if (!best.wageCodeAligned)
    notes.push("The mathematically best structure has basic below 50% of CTC — the Wage Code pushes employers toward ≥50% basic, so HR may not accept it.");
  if (input.rentPaid <= 0)
    notes.push("You pay no rent, so HRA is dead weight in your structure — the optimizer leans on employer NPS instead.");

  return { options, best, current, savingsVsCurrent, notes };
}
