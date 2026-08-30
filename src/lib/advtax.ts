/**
 * Batch 90 — standalone advance-tax scheduler (ss.208-211).
 * Give it the expected net tax (after TDS) and it returns the instalment
 * calendar with cumulative targets — presumptive filers get the one-shot
 * 15 March schedule.
 */
export interface AdvTaxRow { due: string; pct: number; cumulative: number; instalment: number }

export function advanceSchedule(netTaxAfterTds: number, presumptive: boolean): { applicable: boolean; rows: AdvTaxRow[]; notes: string[] } {
  const notes: string[] = [];
  if (netTaxAfterTds < 10_000) {
    return { applicable: false, rows: [], notes: ["Net tax after TDS is below ₹10,000 — advance tax does not apply (s.208). Resident seniors with no business income are exempt regardless (s.207(2))."] };
  }
  const r10 = (n: number) => Math.round(n / 10) * 10;
  if (presumptive) {
    notes.push("44AD/44ADA filers pay the WHOLE liability in one instalment by 15 March (s.211(1)(b)); miss it and 234C charges 1% for one month.");
    return { applicable: true, rows: [{ due: "15 Mar 2026", pct: 100, cumulative: r10(netTaxAfterTds), instalment: r10(netTaxAfterTds) }], notes };
  }
  const pts: [string, number][] = [["15 Jun 2025", 15], ["15 Sep 2025", 45], ["15 Dec 2025", 75], ["15 Mar 2026", 100]];
  let prev = 0;
  const rows = pts.map(([due, pct]) => {
    const cumulative = r10((netTaxAfterTds * pct) / 100);
    const row = { due, pct, cumulative, instalment: cumulative - prev };
    prev = cumulative;
    return row;
  });
  notes.push("Shortfall in any quarter → 234C interest at 1%/month for 3 months (1 month for the March leg). Safe harbour: 12%/36% paid by Jun/Sep avoids 234C for those legs.");
  notes.push("Unpaid 90% by 31 March → 234B at 1%/month from 1 April until payment.");
  return { applicable: true, rows, notes };
}
