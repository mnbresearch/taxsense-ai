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
  { date: "2026-07-31", label: "ITR filing due date (ITR-1 / ITR-2)", detail: "Last date to file ITR-1/ITR-2 for FY 2025-26 (AY 2026-27) without late fee u/s 234F." },
  { date: "2026-08-31", label: "ITR due date (ITR-3 / ITR-4, non-audit)", detail: "Business/professional returns not requiring audit, FY 2025-26 (AY 2026-27)." },
  { date: "2026-09-15", label: "Advance tax — Q2 installment (45%)", detail: "Cumulative 45% of estimated advance tax due." },
  { date: "2026-10-21", label: "Tax audit report due (extended)", detail: "Tax audit report u/s 44AB for AY 2026-27 — extended by CBDT from 30 Sep to 21 Oct 2026." },
  { date: "2026-11-21", label: "ITR due date (audit cases, extended)", detail: "ITR for taxpayers requiring audit u/s 44AB — extended by CBDT from 31 Oct to 21 Nov 2026." },
  { date: "2026-11-30", label: "ITR due date (transfer-pricing cases)", detail: "Returns of taxpayers required to furnish a transfer-pricing report (s.92E)." },
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

/** The single next deadline with whole days remaining (IST), or null if none are listed. */
export function nextDeadline(today: Date = new Date()): (TaxDeadline & { days: number }) | null {
  const d = upcomingDeadlines(today, 1)[0];
  if (!d) return null;
  const days = Math.max(0, Math.ceil((new Date(d.date + "T23:59:59+05:30").getTime() - today.getTime()) / 86_400_000));
  return { ...d, days };
}
