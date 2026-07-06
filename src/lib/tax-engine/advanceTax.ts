/**
 * Advance tax (ss.207-211) + interest estimates (ss.234B/234C).
 *
 * Rules implemented (FY 2025-26):
 *  - Advance tax applies when (total tax − TDS) ≥ ₹10,000 (s.208).
 *  - Resident senior citizens (60+) with NO business income are exempt (s.207(2)).
 *  - Regular schedule (s.211): 15% by 15 Jun, 45% by 15 Sep, 75% by 15 Dec, 100% by 15 Mar.
 *  - Presumptive taxpayers (44AD/44ADA): single installment, 100% by 15 Mar.
 *  - s.234C: 1%/month simple interest on installment shortfall — 3 months per
 *    deferment (1 month for the March installment). Tolerance: no interest on
 *    the Jun/Sep installments if ≥12%/36% actually paid.
 *  - s.234B: if advance tax paid < 90% of assessed tax → 1%/month from 1 Apr
 *    of the AY until payment (we estimate months as a parameter, default 4 —
 *    i.e., paying at the July filing peak).
 *
 * These are ESTIMATES for planning — the statute computes on "returned
 * income" with credit timing nuances a planner cannot know in advance.
 */
import type { TaxProfile, RegimeComputation } from "./types";

export interface Installment {
  label: string;
  dueDate: string; // ISO date within FY 2025-26
  cumulativePct: number;
  cumulativeAmount: number;
  installmentAmount: number;
}

export interface AdvanceTaxPlan {
  applicable: boolean;
  reason: string;
  /** Net tax after TDS the schedule is built on. */
  netTaxAfterTds: number;
  presumptiveSchedule: boolean;
  installments: Installment[];
  /** Estimated s.234C interest if EVERY installment were missed (worst case). */
  interest234C_ifAllMissed: number;
  /** Estimated s.234B interest if nothing were paid until `monthsLate` after 1 Apr. */
  interest234B_ifUnpaid: (monthsLate?: number) => number;
  notes: string[];
}

const round100 = (n: number) => Math.round(n / 100) * 100;

export function advanceTaxPlan(
  profile: TaxProfile,
  computation: RegimeComputation
): AdvanceTaxPlan {
  const notes: string[] = [];
  const netTax = Math.max(0, computation.totalTaxLiability - profile.taxesPaid);

  // s.207(2): resident senior citizen without business income
  const isSeniorNoBiz =
    profile.age >= 60 && profile.residentialStatus === "resident" && !(profile.business?.netIncome);

  if (netTax < 10_000) {
    return {
      applicable: false,
      reason: `Net tax after TDS is ₹${netTax.toLocaleString("en-IN")} — below the ₹10,000 threshold (s.208). No advance tax due.`,
      netTaxAfterTds: netTax,
      presumptiveSchedule: false,
      installments: [],
      interest234C_ifAllMissed: 0,
      interest234B_ifUnpaid: () => 0,
      notes,
    };
  }
  if (isSeniorNoBiz) {
    return {
      applicable: false,
      reason:
        "Resident senior citizens (60+) with no business income are exempt from advance tax (s.207(2)). Pay as self-assessment tax when filing.",
      netTaxAfterTds: netTax,
      presumptiveSchedule: false,
      installments: [],
      interest234C_ifAllMissed: 0,
      interest234B_ifUnpaid: () => 0,
      notes,
    };
  }

  const presumptive = !!profile.business?.presumptive;
  const schedule: { label: string; dueDate: string; pct: number }[] = presumptive
    ? [{ label: "Single installment (44AD/44ADA)", dueDate: "2026-03-15", pct: 100 }]
    : [
        { label: "1st installment", dueDate: "2025-06-15", pct: 15 },
        { label: "2nd installment", dueDate: "2025-09-15", pct: 45 },
        { label: "3rd installment", dueDate: "2025-12-15", pct: 75 },
        { label: "4th installment", dueDate: "2026-03-15", pct: 100 },
      ];
  if (presumptive)
    notes.push("Presumptive scheme (44AD/44ADA): the entire advance tax is due in one installment by 15 March (s.211(1)(b)).");

  let prevCum = 0;
  const installments: Installment[] = schedule.map((s) => {
    const cum = round100((netTax * s.pct) / 100);
    const inst = cum - prevCum;
    prevCum = cum;
    return {
      label: s.label,
      dueDate: s.dueDate,
      cumulativePct: s.pct,
      cumulativeAmount: cum,
      installmentAmount: inst,
    };
  });

  // s.234C worst case: nothing paid all year.
  // Interest = 1% × months × shortfall at each due date (3 months each, 1 for March).
  let i234c = 0;
  for (const s of schedule) {
    const shortfall = (netTax * s.pct) / 100;
    const months = s.pct === 100 ? 1 : 3;
    i234c += 0.01 * months * shortfall;
  }
  i234c = Math.round(i234c);
  notes.push(
    "s.234C tolerance not triggered in the worst case shown; paying ≥12% by June and ≥36% by September avoids interest on those installments."
  );

  const interest234B_ifUnpaid = (monthsLate = 4) =>
    Math.round(netTax * 0.01 * Math.max(1, monthsLate));

  return {
    applicable: true,
    reason: `Net tax after TDS is ₹${netTax.toLocaleString("en-IN")} (≥ ₹10,000) — advance tax applies (s.208).`,
    netTaxAfterTds: netTax,
    presumptiveSchedule: presumptive,
    installments,
    interest234C_ifAllMissed: i234c,
    interest234B_ifUnpaid,
    notes,
  };
}
