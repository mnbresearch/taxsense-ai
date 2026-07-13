/**
 * FY 2025-26 / AY 2026-27 compliance calendar (batch 16).
 * Used by the reminders cron (D-7 and D-1 nudge emails) and the app UI.
 */

export interface TaxDeadline {
  date: string; // YYYY-MM-DD (IST)
  label: string;
  detail: string;
}

export const DEADLINES: TaxDeadline[] = [
  { date: "2026-06-15", label: "Advance tax — Q1 installment (15%)", detail: "First installment of advance tax for FY 2026-27 under s.211." },
  { date: "2026-07-31", label: "ITR filing due date (non-audit)", detail: "Last date to file ITR for FY 2025-26 (AY 2026-27) without late fee u/s 234F." },
  { date: "2026-09-15", label: "Advance tax — Q2 installment (45%)", detail: "Cumulative 45% of estimated advance tax due." },
  { date: "2026-10-31", label: "ITR due date (audit cases)", detail: "Filing due date for taxpayers requiring audit u/s 44AB." },
  { date: "2026-12-15", label: "Advance tax — Q3 installment (75%)", detail: "Cumulative 75% of estimated advance tax due." },
  { date: "2026-12-31", label: "Belated / revised ITR last date", detail: "Final chance to file belated or revised return for AY 2026-27 u/s 139(4)/(5)." },
  { date: "2027-03-15", label: "Advance tax — Q4 installment (100%)", detail: "Full advance tax due; also 100% deadline for presumptive (44AD/44ADA) taxpayers." },
];

/** Deadlines that are exactly `days` days away from `today` (IST date math). */
export function deadlinesInDays(today: Date, days: number): TaxDeadline[] {
  const ist = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  ist.setHours(0, 0, 0, 0);
  const target = new Date(ist);
  target.setDate(target.getDate() + days);
  const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
  return DEADLINES.filter((d) => d.date === key);
}

/** Next upcoming deadlines (for UI display). */
export function upcomingDeadlines(today: Date, count = 3): TaxDeadline[] {
  const key = today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return DEADLINES.filter((d) => d.date >= key).slice(0, count);
}
