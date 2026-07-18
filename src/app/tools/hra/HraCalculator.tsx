"use client";

/**
 * Batch 33 — standalone HRA exemption calculator (SEO tool page).
 * Reuses the deterministic engine's Rule 2A implementation, so this page
 * can never disagree with the main app.
 */
import { useState } from "react";
import Link from "next/link";
import { hraExemption } from "@/lib/tax-engine";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function HraCalculator() {
  const [basic, setBasic] = useState(40_000);
  const [hra, setHra] = useState(20_000);
  const [rent, setRent] = useState(25_000);
  const [metro, setMetro] = useState(true);

  const s = {
    grossSalary: 0, basicPlusDA: basic * 12, hraReceived: hra * 12, rentPaid: rent * 12,
    isMetroCity: metro, employerNpsContribution: 0, professionalTax: 0,
  };
  const exempt = hraExemption(s);
  const a = s.hraReceived;
  const b = Math.max(0, s.rentPaid - 0.1 * s.basicPlusDA);
  const c = (metro ? 0.5 : 0.4) * s.basicPlusDA;
  const taxable = Math.max(0, s.hraReceived - exempt);

  const rows = [
    { label: "HRA actually received", value: a, hit: exempt === a },
    { label: "Rent paid − 10% of basic+DA", value: b, hit: exempt === b && exempt !== a },
    { label: `${metro ? "50%" : "40%"} of basic+DA (${metro ? "metro" : "non-metro"})`, value: c, hit: exempt === c && exempt !== a && exempt !== b },
  ];

  const field = (label: string, value: number, set: (n: number) => void) => (
    <label className="block">
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
        <span className="pl-3 text-sm text-stone-400">₹</span>
        <input
          type="number"
          min={0}
          value={value || ""}
          onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg px-2 py-2.5 text-sm outline-none"
        />
        <span className="pr-3 text-xs text-stone-400">/month</span>
      </div>
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <h1 className="mt-3 text-3xl font-bold text-stone-800">HRA Exemption Calculator — FY 2025-26</h1>
        <p className="mt-2 text-sm text-stone-600">
          Section 10(13A) read with Rule 2A: your tax-free HRA is the <strong>minimum of three amounts</strong>.
          This calculator runs the exact formula our filing engine uses.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          {field("Basic salary + DA", basic, setBasic)}
          {field("HRA received", hra, setHra)}
          {field("Rent you pay", rent, setRent)}
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={metro} onChange={(e) => setMetro(e.target.checked)} className="accent-brand-600" />
            I live in a metro (Delhi, Mumbai, Kolkata or Chennai)
          </label>
        </section>

        <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Tax-free HRA (annual)</div>
          <div className="mt-1 text-4xl font-bold text-brand-700">{inr(exempt)}</div>
          <div className="mt-1 text-xs text-stone-600">
            {inr(exempt / 12)}/month exempt · {inr(taxable)} of your HRA stays taxable
          </div>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={"border-t border-brand-100 " + (r.hit ? "font-bold text-brand-700" : "text-stone-600")}>
                  <td className="py-1.5 pr-2 text-xs">{r.label}{r.hit && " ← lowest"}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">{inr(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rent > 0 && rent * 12 > 100_000 && (
            <p className="mt-3 text-[11px] text-amber-700">Rent above ₹1L/year — your employer will ask for the landlord's PAN.</p>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-800">Three things people miss</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li><strong>HRA exemption exists only in the old regime.</strong> Under the new (default) regime it's zero — but the new regime's lower slabs often win anyway. You need both numbers to decide.</li>
          <li><strong>No HRA component in salary?</strong> You can still claim rent under section 80GG (old regime, capped at ₹60,000/year).</li>
          <li><strong>Paying rent to parents is legal</strong> — if the money actually moves and they declare it as income.</li>
        </ul>
        <Link
          href="/app"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Compare both regimes with your full numbers →
        </Link>
      </section>
    </main>
  );
}
