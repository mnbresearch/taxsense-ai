"use client";

/** Batch 90 — standalone advance-tax scheduler. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { advanceSchedule } from "@/lib/advtax";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";

export default function AdvanceTaxTool() {
  const [tax, setTax] = useState(120_000);
  const [presumptive, setPresumptive] = useState(false);
  const r = useMemo(() => advanceSchedule(tax, presumptive), [tax, presumptive]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">🗓️ Advance Tax Planner — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">Miss a quarter and 234C bills you 1%/month. Here's your exact calendar.</p>

      <div className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-stone-600">Expected tax for the year, AFTER TDS (₹)
          <input type="number" value={tax || ""} onChange={(e) => setTax(Number(e.target.value))} className={field} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-stone-600">
          <input type="checkbox" checked={presumptive} onChange={(e) => setPresumptive(e.target.checked)} className="h-4 w-4 accent-brand-600" /> I file under 44AD / 44ADA
        </label>
      </div>

      {r.applicable ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-50 text-left text-xs uppercase text-stone-500"><th className="px-4 py-2">Due date</th><th className="px-4 py-2">Cumulative</th><th className="px-4 py-2">Pay this instalment</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {r.rows.map((row) => (
                <tr key={row.due}><td className="px-4 py-2.5 font-semibold text-brand-700">{row.due}</td><td className="px-4 py-2.5 text-stone-600">{row.pct}% → {inr(row.cumulative)}</td><td className="px-4 py-2.5 font-bold text-stone-800">{inr(row.instalment)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">Advance tax not applicable.</div>
      )}
      <ul className="mt-3 space-y-1.5 text-xs text-stone-600">{r.notes.map((n) => <li key={n}>• {n}</li>)}</ul>

      <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        Don't know your expected tax? The <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link> computes it — and the Planner tab already carries this schedule with 234B/234C amounts.
        Pay via e-Pay Tax → challan 280 → advance tax (100). Add the dates to your phone with the <Link href="/tools/calendar" className="font-semibold text-brand-700 underline">deadline calendar</Link>.
      </p>
    </main>
  );
}
