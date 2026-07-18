"use client";

/**
 * Batch 37 — regime breakeven matrix (Pro). For a grid of salary levels,
 * finds the deduction level at which the old regime overtakes the new by
 * running the actual engine, binary-searching the crossover.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { computeBoth, emptyProfile } from "@/lib/tax-engine";
import { useEntitlements } from "../../app/Account";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const lakh = (n: number) => "₹" + (n / 100_000).toFixed(n % 100_000 ? 1 : 0) + "L";

function taxes(gross: number, deductions: number, rentAnnual: number) {
  const p = {
    ...emptyProfile(),
    salary: {
      grossSalary: gross, basicPlusDA: gross * 0.4, hraReceived: gross * 0.2,
      rentPaid: rentAnnual, isMetroCity: true, employerNpsContribution: 0, professionalTax: 0,
    },
    deductions: {
      ...emptyProfile().deductions,
      section80C: Math.min(150_000, deductions),
      section80CCD1B: Math.min(50_000, Math.max(0, deductions - 150_000)),
      section80D_selfFamily: Math.min(75_000, Math.max(0, deductions - 200_000)),
    },
  };
  const cmp = computeBoth(p);
  return { oldTax: cmp.old.totalTaxLiability, newTax: cmp.new.totalTaxLiability };
}

/** Smallest deduction amount (₹0–2.75L) at which old ≤ new, else null. */
function breakevenDeduction(gross: number, rentAnnual: number): number | null {
  const MAX = 275_000;
  if (taxes(gross, MAX, rentAnnual).oldTax > taxes(gross, MAX, rentAnnual).newTax) return null;
  let lo = 0, hi = MAX;
  while (hi - lo > 1_000) {
    const mid = Math.round((lo + hi) / 2 / 1000) * 1000;
    const t = taxes(gross, mid, rentAnnual);
    if (t.oldTax <= t.newTax) hi = mid; else lo = mid;
  }
  return hi;
}

const INCOMES = [800_000, 1_000_000, 1_200_000, 1_500_000, 1_800_000, 2_100_000, 2_500_000, 3_000_000, 4_000_000, 5_000_000];

export default function Breakeven() {
  const ent = useEntitlements();
  const unlocked = !!ent?.features.proTools;
  const [rentMonthly, setRentMonthly] = useState(0);

  const rows = useMemo(
    () =>
      INCOMES.map((g) => {
        const be = breakevenDeduction(g, rentMonthly * 12);
        const zero = taxes(g, 0, rentMonthly * 12);
        return { gross: g, newTax: zero.newTax, oldTaxNoDed: zero.oldTax, breakeven: be };
      }),
    [rentMonthly]
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Regime Breakeven Matrix — FY 2025-26</h1>
        <p className="mt-2 text-sm text-stone-600">
          The question every client asks: <em>"how much do I need to invest for the old regime to be worth it?"</em>{" "}
          This table answers it per income level by binary-searching the actual engine — HRA included if rent is set.
        </p>
      </header>

      <label className="mb-6 block max-w-xs">
        <span className="text-xs font-semibold text-stone-600">Client's monthly rent (adds HRA to the old-regime side)</span>
        <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
          <span className="pl-3 text-sm text-stone-400">₹</span>
          <input type="number" min={0} value={rentMonthly || ""} onChange={(e) => setRentMonthly(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-lg px-2 py-2 text-sm outline-none" />
          <span className="pr-3 text-xs text-stone-400">/month</span>
        </div>
      </label>

      <section className="relative rounded-xl border border-stone-200 bg-white p-5">
        <div className={unlocked ? "" : "pointer-events-none select-none blur-[5px]"} aria-hidden={!unlocked}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400">
                <th className="py-2 font-medium">Gross salary</th>
                <th className="text-right font-medium">New-regime tax</th>
                <th className="text-right font-medium">Old (no deductions)</th>
                <th className="text-right font-medium">Deductions needed to break even</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.gross} className="border-t border-stone-100">
                  <td className="py-2 font-semibold text-stone-700">{lakh(r.gross)}</td>
                  <td className="text-right">{inr(r.newTax)}</td>
                  <td className="text-right text-stone-500">{inr(r.oldTaxNoDed)}</td>
                  <td className="text-right">
                    {r.breakeven === null
                      ? <span className="font-semibold text-stone-500">Never — stay in new</span>
                      : r.breakeven === 0
                        ? <span className="font-semibold text-green-700">Old wins already</span>
                        : <span className="font-semibold text-brand-700">{inr(r.breakeven)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-stone-500">
            Assumes 40% basic, 20% HRA component, metro city; deductions fill 80C → 80CCD(1B) → 80D in order (cap ₹2.75L).
            "Never" means even maxed-out deductions don't beat the new regime at that income.
          </p>
        </div>
        {!unlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl p-6 text-center">
            <div className="text-3xl">🔒</div>
            <p className="mt-2 text-sm font-semibold text-stone-800">The matrix unlocks with Pro</p>
            <p className="mt-1 text-xs text-stone-600">Ten income levels, engine-exact breakevens, HRA-aware. Set the rent and watch the whole table move.</p>
            <Link href="/pricing" className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Get Pro — ₹399/mo</Link>
            <p className="mt-2 text-[11px] text-stone-400">Already paid? Sign in from the workspace.</p>
          </div>
        )}
      </section>
    </main>
  );
}
