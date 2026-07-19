"use client";

/**
 * Batch 47 — gratuity + s.10(10) exemption (free, self-contained).
 * Covered by the Gratuity Act: 15/26 × last drawn (basic+DA) × years
 * (part-year > 6 months rounds UP). Not covered: 1/2 × 10-month average
 * salary × completed years (no rounding up). Exemption = least of the
 * formula amount, ₹20,00,000, and gratuity actually received.
 * Government employees: fully exempt.
 */
import { useState } from "react";
import Link from "next/link";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const CAP = 2_000_000;

export default function GratuityCalculator() {
  const [covered, setCovered] = useState(true);
  const [salary, setSalary] = useState(50_000); // monthly basic+DA (or 10-mo avg if not covered)
  const [years, setYears] = useState(12);
  const [months, setMonths] = useState(7);
  const [received, setReceived] = useState(0);

  const serviceYears = covered
    ? years + (months > 6 ? 1 : 0)
    : years; // non-covered: completed years only
  const formula = covered
    ? (15 / 26) * salary * serviceYears
    : 0.5 * salary * serviceYears;
  const recv = received > 0 ? received : formula;
  const exempt = Math.max(0, Math.min(formula, CAP, recv));
  const taxable = Math.max(0, recv - exempt);
  const binding = exempt === recv && received > 0 ? "amount received" : exempt === CAP ? "₹20L statutory cap" : "the formula amount";

  const num = (label: string, hint: string, value: number, set: (n: number) => void, suffix = "") => (
    <label className="block">
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      {hint && <span className="block text-[11px] text-stone-400">{hint}</span>}
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
        <span className="pl-3 text-sm text-stone-400">₹</span>
        <input type="number" min={0} value={value || ""} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg px-2 py-2.5 text-sm outline-none" />
        {suffix && <span className="pr-3 text-xs text-stone-400">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Gratuity & its Tax Exemption — s.10(10)</h1>
        <p className="mt-2 text-sm text-stone-600">
          Two questions, one tool: what gratuity does the law say you've earned, and how much of what you
          actually get is <strong>tax-free</strong>.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={covered} onChange={(e) => setCovered(e.target.checked)} className="accent-brand-600" />
            Employer is covered by the Payment of Gratuity Act (10+ employees — most are)
          </label>
          {num(
            covered ? "Last drawn monthly basic + DA" : "Average monthly salary (last 10 months)",
            covered ? "Only basic and dearness allowance count — not HRA or allowances" : "Basic + DA + commission (if % of turnover)",
            salary, setSalary, "/month"
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-stone-600">Years of service</span>
              <input type="number" min={0} max={60} value={years || ""} onChange={(e) => setYears(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-stone-600">+ months</span>
              <input type="number" min={0} max={11} value={months || ""} onChange={(e) => setMonths(Math.max(0, Math.min(11, Number(e.target.value) || 0)))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600" />
            </label>
          </div>
          {num("Gratuity actually received (if known)", "Leave 0 to assume the formula amount", received, setReceived)}
        </section>

        <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Formula gratuity</div>
          <div className="mt-1 text-3xl font-bold text-stone-800">{inr(formula)}</div>
          <div className="mt-0.5 text-[11px] text-stone-500">
            {covered
              ? `15/26 × ${inr(salary)} × ${serviceYears} yrs${months > 6 ? ` (${years}y ${months}m rounds up)` : ""}`
              : `½ × ${inr(salary)} × ${serviceYears} completed yrs`}
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">Tax-free portion</div>
          <div className="mt-1 text-4xl font-bold text-brand-700">{inr(exempt)}</div>
          <div className="mt-0.5 text-[11px] text-stone-500">bound by {binding}</div>
          <div className={"mt-4 rounded-lg p-3 text-sm font-semibold " + (taxable > 0 ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800")}>
            {taxable > 0
              ? `${inr(taxable)} is taxable as salary — plan the year of receipt; s.89 relief may help.`
              : "✓ Fully exempt — nothing to add to taxable salary."}
          </div>
          <ul className="mt-4 space-y-1.5 text-[11px] text-stone-500">
            <li>• Government employees: gratuity is fully exempt regardless of amount.</li>
            <li>• The ₹20L cap is a LIFETIME limit across all employers, not per job.</li>
            <li>• Death gratuity to nominees is fully exempt in their hands.</li>
            <li>• 5 completed years of service are required to be entitled at all (waived on death/disablement).</li>
          </ul>
        </section>
      </div>

      <Link href="/app" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        Put the taxable part into your full computation →
      </Link>
    </main>
  );
}
