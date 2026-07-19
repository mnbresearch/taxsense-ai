"use client";

/** Batch 46 — 80GG calculator (free): rent relief when salary has no HRA. */
import { useState } from "react";
import Link from "next/link";
import { compute80GG } from "@/lib/rent80gg";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function Gg80Calculator() {
  const [ati, setAti] = useState(800_000);
  const [rentMonthly, setRentMonthly] = useState(15_000);
  const r = compute80GG({ adjustedTotalIncome: ati, rentPaid: rentMonthly * 12 });

  const rows = [
    { key: "cap", label: "₹5,000 per month", value: r.limbs.cap },
    { key: "pctIncome", label: "25% of adjusted total income", value: r.limbs.pctIncome },
    { key: "rentExcess", label: "Rent paid − 10% of income", value: r.limbs.rentExcess },
  ] as const;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Section 80GG — rent deduction without HRA</h1>
        <p className="mt-2 text-sm text-stone-600">
          Freelancer, or salaried with no HRA component? s.80GG (old regime) still rewards your rent —
          the <strong>least of three limbs</strong>, capped at ₹60,000 a year.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <label className="block">
            <span className="text-xs font-semibold text-stone-600">Adjusted total income (annual)</span>
            <span className="block text-[11px] text-stone-400">Gross total income minus capital gains and other VI-A deductions</span>
            <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
              <span className="pl-3 text-sm text-stone-400">₹</span>
              <input type="number" min={0} value={ati || ""} onChange={(e) => setAti(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg px-2 py-2.5 text-sm outline-none" />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-600">Rent you pay</span>
            <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
              <span className="pl-3 text-sm text-stone-400">₹</span>
              <input type="number" min={0} value={rentMonthly || ""} onChange={(e) => setRentMonthly(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg px-2 py-2.5 text-sm outline-none" />
              <span className="pr-3 text-xs text-stone-400">/month</span>
            </div>
          </label>
        </section>

        <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">80GG deduction (annual)</div>
          <div className="mt-1 text-4xl font-bold text-brand-700">{inr(r.deduction)}</div>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={"border-t border-brand-100 " + (r.binding === row.key ? "font-bold text-brand-700" : "text-stone-600")}>
                  <td className="py-1.5 pr-2 text-xs">{row.label}{r.binding === row.key && " ← lowest"}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">{inr(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.deduction === 0 && rentMonthly > 0 && (
            <p className="mt-3 text-[11px] text-amber-700">Rent must exceed 10% of income before 80GG gives anything.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-800">The conditions that trip people up</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li><strong>Form 10BA must be filed before the return</strong> — the claim fails at CPC without it.</li>
          <li>No HRA received at ANY point in the year — even one month of HRA kills 80GG for the whole year.</li>
          <li>You, your spouse or minor child must not own a house in your city of work — and no self-occupied claim elsewhere.</li>
          <li>Old regime only, like most rent reliefs. Got HRA instead? Use the <Link href="/tools/hra" className="font-semibold text-brand-700 underline">HRA calculator</Link>.</li>
        </ul>
      </section>
    </main>
  );
}
