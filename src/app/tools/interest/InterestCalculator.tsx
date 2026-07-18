"use client";

/**
 * Batch 37 — s.234 interest calculator (Pro). Inputs are open to everyone;
 * results blur without an activated Pro plan.
 */
import { useState } from "react";
import Link from "next/link";
import { computeInterest234 } from "@/lib/tax-engine/interest";
import { useEntitlements } from "../../app/Account";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function InterestCalculator() {
  const ent = useEntitlements();
  const unlocked = !!ent?.features.proTools;
  const [assessed, setAssessed] = useState(500_000);
  const [tds, setTds] = useState(100_000);
  const [q, setQ] = useState<[number, number, number, number]>([0, 0, 0, 200_000]);
  const [lateMonths, setLateMonths] = useState(0);
  const [months234B, setMonths234B] = useState(4);
  const [presumptive, setPresumptive] = useState(false);

  const r = computeInterest234({
    assessedTax: assessed, tdsCredits: tds, advanceByQuarter: q,
    monthsLateFiling: lateMonths, monthsTo234BSettlement: months234B, presumptive,
  });

  const num = (label: string, value: number, set: (n: number) => void, suffix = "") => (
    <label className="block">
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
        <input type="number" min={0} value={value || ""} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none" />
        {suffix && <span className="pr-3 text-xs text-stone-400">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Interest Calculator — s.234A / 234B / 234C</h1>
        <p className="mt-2 text-sm text-stone-600">
          Rule 119A rounding (base down to ₹100), months rounded up, 12%/36% safe harbour on the first two
          installments, single-installment schedule for presumptive payers. FY 2025-26 / AY 2026-27.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
          {num("Assessed tax (incl. cess)", assessed, setAssessed, "₹")}
          {num("TDS / TCS credits", tds, setTds, "₹")}
          <div className="pt-1 text-xs font-semibold text-stone-600">Cumulative advance tax paid by…</div>
          <div className="grid grid-cols-2 gap-2">
            {(["15 Jun", "15 Sep", "15 Dec", "15 Mar"] as const).map((d, i) => (
              <label key={d} className="block">
                <span className="text-[11px] text-stone-500">{d}</span>
                <input type="number" min={0} value={q[i] || ""} disabled={presumptive && i < 3}
                  onChange={(e) => { const c = [...q] as typeof q; c[i] = Math.max(0, Number(e.target.value) || 0); setQ(c); }}
                  className="mt-0.5 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-brand-600 disabled:bg-stone-100" />
              </label>
            ))}
          </div>
          {num("Return filed late by (months)", lateMonths, setLateMonths, "months")}
          {num("Months from 1 Apr to settlement (234B)", months234B, setMonths234B, "months")}
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={presumptive} onChange={(e) => setPresumptive(e.target.checked)} className="accent-brand-600" />
            Presumptive taxpayer (44AD / 44ADA)
          </label>
        </section>

        <section className="relative rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className={unlocked ? "" : "pointer-events-none select-none blur-[5px]"} aria-hidden={!unlocked}>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Total interest payable</div>
            <div className="mt-1 text-4xl font-bold text-brand-700">{inr(r.total)}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              {[["234A", r.i234A], ["234B", r.i234B], ["234C", r.i234C]].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-white p-2">
                  <div className="text-[11px] font-semibold text-stone-500">s.{k}</div>
                  <div className="font-bold text-stone-800">{inr(v as number)}</div>
                </div>
              ))}
            </div>
            {!r.i234B_applicable && r.netTaxDue > 0 && (
              <p className="mt-2 text-[11px] text-green-700">✓ 234B not attracted — credits reach 90% of assessed tax.</p>
            )}
            {r.i234C_rows.length > 0 && (
              <table className="mt-4 w-full text-xs">
                <thead>
                  <tr className="text-left text-stone-400">
                    <th className="py-1 font-medium">Due</th><th className="font-medium">Req.</th>
                    <th className="text-right font-medium">Shortfall</th><th className="text-right font-medium">Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {r.i234C_rows.map((row) => (
                    <tr key={row.due} className="border-t border-brand-100 text-stone-600">
                      <td className="py-1">{row.due}</td><td>{row.requiredPct}%</td>
                      <td className="text-right">{inr(row.shortfall)}</td>
                      <td className={"text-right " + (row.interest > 0 ? "font-semibold text-red-700" : "")}>{inr(row.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl p-6 text-center">
              <div className="text-3xl">🔒</div>
              <p className="mt-2 text-sm font-semibold text-stone-800">Results unlock with Pro</p>
              <p className="mt-1 text-xs text-stone-600">Play with the inputs freely — the computed interest, section split and quarter-wise 234C table need an activated plan.</p>
              <Link href="/pricing" className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Get Pro — ₹399/mo</Link>
              <p className="mt-2 text-[11px] text-stone-400">Already paid? Sign in from the workspace.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
