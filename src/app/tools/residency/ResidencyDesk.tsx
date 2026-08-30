"use client";

/** Batch 89 — residential status + gift taxability. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { giftTaxability, residentialStatus } from "@/lib/residency";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";
const Check = ({ v, set, children }: any) => (
  <label className="flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-brand-600" /> {children}</label>
);
const BADGE: Record<string, string> = { ROR: "bg-amber-100 text-amber-900", RNOR: "bg-brand-50 text-brand-700", NR: "bg-green-50 text-green-800" };
const LABEL: Record<string, string> = { ROR: "Resident & Ordinarily Resident — worldwide income taxable", RNOR: "Resident but NOT Ordinarily Resident — foreign income stays out", NR: "Non-Resident — only Indian income taxable" };

export default function ResidencyDesk() {
  const [days, setDays] = useState(150);
  const [days4, setDays4] = useState(400);
  const [pio, setPio] = useState(true);
  const [visiting, setVisiting] = useState(true);
  const [left, setLeft] = useState(false);
  const [over15, setOver15] = useState(false);
  const [notTaxed, setNotTaxed] = useState(false);
  const [r2of10, setR2of10] = useState(true);
  const [d730, setD730] = useState(true);
  const res = useMemo(
    () => residentialStatus({ daysThisYear: days, days4PrecedingYears: days4, citizenOrPIO: pio, visitingIndia: visiting, leftForEmployment: left, indianIncomeOver15L: over15, notTaxedAnywhere: notTaxed, residentIn2of10: r2of10, days730In7: d730 }),
    [days, days4, pio, visiting, left, over15, notTaxed, r2of10, d730]
  );

  const [gKind, setGKind] = useState<"money" | "immovable" | "movable">("money");
  const [gVal, setGVal] = useState(100_000);
  const [gRel, setGRel] = useState(false);
  const [gMar, setGMar] = useState(false);
  const [gWill, setGWill] = useState(false);
  const gift = giftTaxability({ kind: gKind, value: gVal, fromRelative: gRel, onMarriage: gMar, byWillOrInheritance: gWill });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">🌏 Status & Gifts Desk — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">Two questions every NRI family asks: what am I this year, and is this gift taxable?</p>

      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">1 · Residential status (s.6)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">Days in India, FY 2025-26
            <input type="number" value={days || ""} onChange={(e) => setDays(Number(e.target.value))} className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Days in India, 4 preceding FYs (total)
            <input type="number" value={days4 || ""} onChange={(e) => setDays4(Number(e.target.value))} className={field} />
          </label>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <Check v={pio} set={setPio}>Indian citizen / PIO</Check>
          <Check v={visiting} set={setVisiting}>Living abroad, visiting India</Check>
          <Check v={left} set={setLeft}>Left India for employment / as crew</Check>
          <Check v={over15} set={setOver15}>Indian income &gt; ₹15L</Check>
          <Check v={notTaxed} set={setNotTaxed}>Not liable to tax in any country</Check>
          <Check v={r2of10} set={setR2of10}>Resident in ≥2 of last 10 FYs</Check>
          <Check v={d730} set={setD730}>≥730 days in last 7 FYs</Check>
        </div>
        <div className={"mt-3 rounded-lg p-3 text-sm font-semibold " + BADGE[res.status]}>{res.status} — {LABEL[res.status]}</div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{res.reasons.map((x) => <li key={x}>• {x}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">2 · Gift received — taxable? (s.56(2)(x))</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">What was received
            <select value={gKind} onChange={(e) => setGKind(e.target.value as any)} className={field}>
              <option value="money">Money</option><option value="immovable">Immovable property</option><option value="movable">Shares / jewellery / art</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600">Value (aggregate this FY, ₹)
            <input type="number" value={gVal || ""} onChange={(e) => setGVal(Number(e.target.value))} className={field} />
          </label>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
          <Check v={gRel} set={setGRel}>From a specified relative</Check>
          <Check v={gMar} set={setGMar}>On your marriage</Check>
          <Check v={gWill} set={setGWill}>Will / inheritance</Check>
        </div>
        <div className={"mt-3 rounded-lg p-3 text-sm font-semibold " + (gift.taxable > 0 ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800")}>
          {gift.verdict}{gift.taxable > 0 && <> — {inr(gift.taxable)} added to income at slab</>}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{gift.notes.map((x) => <li key={x}>• {x}</li>)}</ul>
      </section>

      <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        RNOR windows after returning to India are planning gold — foreign income stays out while they last.
        Compute the whole year in the <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link>.
      </p>
    </main>
  );
}
