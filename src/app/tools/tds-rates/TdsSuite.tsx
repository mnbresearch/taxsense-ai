"use client";

/** Batch 86 — TDS rate finder + interest/fee calculators + calendar. */
import { useState } from "react";
import Link from "next/link";
import { TDS_CALENDAR, TDS_SECTIONS, tdsInterest, tdsLateFee } from "@/lib/tdsRates";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";

export default function TdsSuite() {
  const [q, setQ] = useState("");
  const rows = TDS_SECTIONS.filter((s) => (s.section + s.nature + s.note).toLowerCase().includes(q.toLowerCase()));

  const [tds, setTds] = useState(50_000);
  const [m1, setM1] = useState(0);
  const [m2, setM2] = useState(2);
  const [daysLate, setDaysLate] = useState(30);
  const interest = tdsInterest({ tds, monthsNotDeducted: m1, monthsNotDeposited: m2 });
  const fee = tdsLateFee({ tds, daysLate });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">📑 TDS Desk — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">Post-Budget-2025 thresholds (including the new s.194T on partner payments), the interest every notice quotes, and the deductor's calendar.</p>

      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">Rate & threshold finder</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: rent, contractor, professional, 194J…" className={field} />
        <div className="mt-3 space-y-2">
          {rows.map((s) => (
            <div key={s.section} className="rounded-lg border border-stone-200 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-brand-700">s.{s.section} — {s.nature}</span>
                <span className="whitespace-nowrap text-sm font-semibold text-stone-800">{typeof s.ratePct === "number" ? s.ratePct + "%" : s.ratePct}</span>
              </div>
              <div className="mt-0.5 text-xs text-stone-600">Threshold: <strong>{s.threshold}</strong></div>
              <div className="mt-0.5 text-[11px] text-stone-500">{s.note}</div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-xs text-stone-400">No section matches — try "rent" or "194".</p>}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">Deducted late? Deposited late? — s.201(1A) + s.234E</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-stone-600">TDS amount (₹)
            <input type="number" value={tds || ""} onChange={(e) => setTds(Number(e.target.value))} className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Months deducted late
            <input type="number" value={m1 || ""} onChange={(e) => setM1(Number(e.target.value))} className={field} placeholder="0" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Months deposited late
            <input type="number" value={m2 || ""} onChange={(e) => setM2(Number(e.target.value))} className={field} placeholder="0" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Return filed late (days)
            <input type="number" value={daysLate || ""} onChange={(e) => setDaysLate(Number(e.target.value))} className={field} />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">Interest @1% (late deduction)</div><div className="text-lg font-bold">{inr(interest.leg1)}</div></div>
          <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">Interest @1.5% (late deposit)</div><div className="text-lg font-bold">{inr(interest.leg2)}</div></div>
          <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">234E fee (capped at TDS)</div><div className="text-lg font-bold">{inr(fee.fee)}</div></div>
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{[...interest.notes, ...fee.notes].map((n) => <li key={n}>• {n}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">The deductor's calendar</h2>
        <table className="mt-2 w-full text-xs">
          <tbody className="divide-y divide-stone-100">
            {TDS_CALENDAR.map((d) => (
              <tr key={d.what}><td className="py-2 font-semibold text-brand-700">{d.due}</td><td className="py-2 text-stone-700">{d.what}</td><td className="py-2 text-stone-500">{d.note}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        Reconciling what was actually deducted against the return? Use the <Link href="/tools/tds" className="font-semibold text-brand-700 underline">26AS Reconciliation tool</Link> (Pro).
      </p>
    </main>
  );
}
