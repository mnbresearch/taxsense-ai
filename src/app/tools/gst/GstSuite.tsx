"use client";

/** Batch 85 — the GST toolkit: registration, composition, late fee, interest, calendar. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { compositionCheck, gstCalendar, gstInterest, gstRegistration, gstrLateFee } from "@/lib/gst";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";
const STATES = ["Maharashtra","Delhi","Karnataka","Tamil Nadu","Gujarat","Uttar Pradesh","West Bengal","Telangana","Rajasthan","Kerala","Punjab","Haryana","Bihar","Madhya Pradesh","Assam","Uttarakhand","Puducherry","Sikkim","Meghalaya","Arunachal Pradesh","Manipur","Mizoram","Nagaland","Tripura","Other"];

export default function GstSuite() {
  const [turnover, setTurnover] = useState(3_000_000);
  const [supplies, setSupplies] = useState<"goods" | "services" | "both">("services");
  const [state, setState] = useState("Maharashtra");
  const [interState, setInterState] = useState(false);
  const [ecom, setEcom] = useState(false);
  const [kind, setKind] = useState<"manufacturer-trader" | "restaurant" | "services">("services");

  const reg = useMemo(() => gstRegistration({ turnover, supplies, state, interState, ecommerce: ecom }), [turnover, supplies, state, interState, ecom]);
  const comp = useMemo(() => compositionCheck({ turnover, kind, state, interState, ecommerce: ecom }), [turnover, kind, state, interState, ecom]);

  const [days, setDays] = useState(30);
  const [nil, setNil] = useState(false);
  const [cash, setCash] = useState(100_000);
  const fee = gstrLateFee({ daysLate: days, nilReturn: nil, turnover });
  const int50 = gstInterest({ taxCash: cash, daysLate: days });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">🧾 GST Toolkit — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">Registration, composition, late fees and s.50 interest — the checks a practice runs daily.</p>

      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">1 · Do you need registration?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">Aggregate turnover (₹/yr)
            <input type="number" value={turnover || ""} onChange={(e) => setTurnover(Number(e.target.value))} className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">You supply
            <select value={supplies} onChange={(e) => setSupplies(e.target.value as any)} className={field}>
              <option value="goods">Goods only</option><option value="services">Services (or mixed)</option><option value="both">Both</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600">State
            <select value={state} onChange={(e) => setState(e.target.value)} className={field}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <div className="flex flex-col justify-end gap-1.5 pb-1 text-xs text-stone-600">
            <label className="flex items-center gap-2"><input type="checkbox" checked={interState} onChange={(e) => setInterState(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Inter-state outward supplies</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={ecom} onChange={(e) => setEcom(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Sell via e-commerce operator</label>
          </div>
        </div>
        <div className={"mt-3 rounded-lg p-3 text-sm font-semibold " + (reg.required ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800")}>
          {reg.required ? "Registration REQUIRED" : "Registration not required (optional)"}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{reg.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">2 · Composition scheme — worth it?</h2>
        <label className="mt-2 block text-xs font-semibold text-stone-600">Business type
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={field}>
            <option value="manufacturer-trader">Manufacturer / trader (1%)</option>
            <option value="restaurant">Restaurant (5%)</option>
            <option value="services">Services u/s 10(2A) (6%)</option>
          </select>
        </label>
        <div className={"mt-3 rounded-lg p-3 text-sm " + (comp.eligible ? "bg-brand-50" : "bg-stone-50")}>
          {comp.eligible ? (
            <span className="font-semibold text-brand-700">Eligible — {comp.scheme}: {comp.ratePct}% ≈ {inr(comp.annualTax!)} tax/yr on this turnover.</span>
          ) : (
            <span className="font-semibold text-stone-700">Not eligible.</span>
          )}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{comp.notes.map((r) => <li key={r}>• {r}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">3 · Filed late? Fee + interest</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-stone-600">Days late
            <input type="number" value={days || ""} onChange={(e) => setDays(Number(e.target.value))} className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Tax paid by CASH ledger (₹)
            <input type="number" value={cash || ""} onChange={(e) => setCash(Number(e.target.value))} className={field} />
          </label>
          <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-stone-600">
            <input type="checkbox" checked={nil} onChange={(e) => setNil(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Nil return
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">Late fee (per return)</div><div className="text-xl font-bold text-stone-800">{inr(fee.fee)}</div></div>
          <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">s.50 interest @18% p.a.</div><div className="text-xl font-bold text-stone-800">{inr(int50.interest)}</div></div>
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{[...fee.notes, ...int50.notes].map((r) => <li key={r}>• {r}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">4 · The calendar</h2>
        <table className="mt-2 w-full text-xs">
          <tbody className="divide-y divide-stone-100">
            {gstCalendar(false).map((d) => (
              <tr key={d.what}><td className="py-2 font-semibold text-brand-700">{d.day}</td><td className="py-2 text-stone-700">{d.what}</td><td className="py-2 text-stone-500">{d.who}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        Thresholds and rates as amended to FY 2025-26. Filing itself happens on the GST portal — this toolkit prepares the numbers and the decisions.
        Income-tax side of your business? The <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link> handles 44AD/44ADA end to end.
      </p>
    </main>
  );
}
