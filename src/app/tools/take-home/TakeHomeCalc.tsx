"use client";

/** Batch 79 — CTC → in-hand. The offer-letter reality check. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { takeHome } from "@/lib/takehome";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function TakeHomeCalc() {
  const [ctc, setCtc] = useState(1200000);
  const [basicPct, setBasicPct] = useState(40);
  const [pf, setPf] = useState(true);
  const [grat, setGrat] = useState(false);
  const [rent, setRent] = useState(0);
  const [metro, setMetro] = useState(false);

  const r = useMemo(
    () => takeHome({ ctc, basicPct: basicPct / 100, includesEmployerPf: pf, includesGratuity: grat, monthlyRent: rent, isMetroCity: metro }),
    [ctc, basicPct, pf, grat, rent, metro]
  );
  const best = r.monthlyInHand[r.recommended];
  const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">💸 In-Hand Salary Calculator — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">
        The offer says CTC. Your bank account says otherwise. Here's the honest monthly number, both regimes.
      </p>

      <div className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-stone-600">Annual CTC (₹)
          <input type="number" value={ctc || ""} onChange={(e) => setCtc(Number(e.target.value))} className={field} />
        </label>
        <label className="text-xs font-semibold text-stone-600">Basic as % of CTC — check your offer letter
          <input type="number" value={basicPct || ""} onChange={(e) => setBasicPct(Number(e.target.value))} min={20} max={70} className={field} />
        </label>
        <label className="text-xs font-semibold text-stone-600">Monthly rent you pay (0 if none)
          <input type="number" value={rent || ""} onChange={(e) => setRent(Number(e.target.value))} className={field} />
        </label>
        <div className="flex flex-col justify-end gap-1.5 pb-1 text-xs text-stone-600">
          <label className="flex items-center gap-2"><input type="checkbox" checked={pf} onChange={(e) => setPf(e.target.checked)} className="h-4 w-4 accent-brand-600" /> CTC includes employer PF (usually yes)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={grat} onChange={(e) => setGrat(e.target.checked)} className="h-4 w-4 accent-brand-600" /> CTC includes gratuity accrual</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={metro} onChange={(e) => setMetro(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Metro city (Delhi/Mumbai/Kolkata/Chennai)</label>
        </div>
      </div>

      {ctc > 0 && (
        <>
          <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-5 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Monthly in-hand ({r.recommended} regime)</div>
            <div className="mt-1 text-4xl font-extrabold text-brand-700">{inr(best)}</div>
            <div className="mt-1 text-xs text-stone-500">from a CTC of {inr(ctc)} — that's {Math.round((best * 12 / ctc) * 100)}% of the headline number</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["new", "old"] as const).map((k) => (
              <div key={k} className={"rounded-lg border p-4 " + (r.recommended === k ? "border-brand-600 bg-brand-50/50" : "border-stone-200 bg-white")}>
                <div className="text-xs uppercase text-stone-500">{k} regime {r.recommended === k && "✓"}</div>
                <div className="mt-1 text-xl font-bold">{inr(r.monthlyInHand[k])}<span className="text-xs font-normal text-stone-500">/mo</span></div>
                <div className="mt-0.5 text-[11px] text-stone-500">tax {inr(r.annualTax[k])}/yr</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
            <div className="text-sm font-bold text-stone-700">Where the CTC goes (annual)</div>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-stone-100 text-stone-700">
                <tr><td className="py-1.5">Basic (+DA) — {basicPct}%</td><td className="text-right font-semibold">{inr(r.basic)}</td></tr>
                {r.employerPf > 0 && <tr><td className="py-1.5">Employer PF — in CTC, never in your account</td><td className="text-right text-stone-500">−{inr(r.employerPf)}</td></tr>}
                {r.gratuity > 0 && <tr><td className="py-1.5">Gratuity accrual — paid only after 5 years</td><td className="text-right text-stone-500">−{inr(r.gratuity)}</td></tr>}
                <tr><td className="py-1.5 font-semibold">Gross salary (payslip)</td><td className="text-right font-semibold">{inr(r.gross)}</td></tr>
                <tr><td className="py-1.5">Employee PF (goes to your PF account, counts in 80C)</td><td className="text-right text-stone-500">−{inr(r.employeePf)}</td></tr>
                {r.professionalTax > 0 && <tr><td className="py-1.5">Professional tax</td><td className="text-right text-stone-500">−{inr(r.professionalTax)}</td></tr>}
                <tr><td className="py-1.5">Income tax ({r.recommended} regime)</td><td className="text-right text-stone-500">−{inr(r.annualTax[r.recommended])}</td></tr>
                <tr className="font-bold text-brand-700"><td className="py-1.5">In your bank account</td><td className="text-right">{inr(best * 12)} <span className="font-normal text-stone-400">({inr(best)}/mo)</span></td></tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
            💡 This assumes a typical structure (HRA = {metro ? "50" : "40"}% of basic, PF at statutory rates, no bonus/variable timing).
            Your exact numbers — with 80C beyond PF, NPS, home loan and more — take 3 minutes in the{" "}
            <Link href="/app" className="font-semibold text-brand-700 underline">conversational workspace</Link>.
            Structuring the CTC itself (basic %, NPS, HRA jointly) is what the <Link href="/pricing" className="font-semibold text-brand-700 underline">CTC Designer (Pro)</Link> does.
          </p>
        </>
      )}
    </main>
  );
}
