"use client";

/** Batch 87 — audit applicability + partnership + company entity math. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { auditApplicability, companyTax, firmTax, partnerRemuneration } from "@/lib/audit44ab";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";
const Check = ({ v, set, children }: any) => (
  <label className="flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-brand-600" /> {children}</label>
);

export default function AuditSuite() {
  const [kind, setKind] = useState<"business" | "profession">("business");
  const [turnover, setTurnover] = useState(15_000_000);
  const [cash5, setCash5] = useState(true);
  const [presumptive, setPresumptive] = useState(true);
  const [belowFloor, setBelowFloor] = useState(false);
  const [aboveExempt, setAboveExempt] = useState(true);
  const [optedOut, setOptedOut] = useState(false);
  const audit = useMemo(
    () => auditApplicability({ kind, turnover, cashWithin5pct: cash5, presumptive, belowPresumptiveFloor: belowFloor, incomeAboveExemption: aboveExempt, optedOut44ADRecently: optedOut }),
    [kind, turnover, cash5, presumptive, belowFloor, aboveExempt, optedOut]
  );

  const [bookProfit, setBookProfit] = useState(1_000_000);
  const rem = partnerRemuneration(bookProfit);
  const ftax = firmTax(Math.max(bookProfit - rem.limit, 0));

  const [cIncome, setCIncome] = useState(10_000_000);
  const [under400, setUnder400] = useState(true);
  const [newMfg, setNewMfg] = useState(false);
  const co = companyTax({ income: cIncome, turnoverUnder400cr: under400, newManufacturing: newMfg });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">⚖️ Audit & Entity Desk — AY 2026-27</h1>
      <p className="mt-1 text-sm text-stone-600">The three questions every practice answers weekly: audit or not, how much can partners draw, which company regime.</p>

      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">1 · Tax audit u/s 44AB — required?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">Nature
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={field}>
              <option value="business">Business</option><option value="profession">Profession</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600">Turnover / gross receipts (₹)
            <input type="number" value={turnover || ""} onChange={(e) => setTurnover(Number(e.target.value))} className={field} />
          </label>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <Check v={cash5} set={setCash5}>Cash receipts AND payments ≤ 5% each</Check>
          <Check v={presumptive} set={setPresumptive}>Declaring under 44AD / 44ADA</Check>
          <Check v={belowFloor} set={setBelowFloor}>Declaring BELOW the presumptive floor</Check>
          <Check v={aboveExempt} set={setAboveExempt}>Total income above basic exemption</Check>
          <Check v={optedOut} set={setOptedOut}>Opted out of 44AD in the last 5 years</Check>
        </div>
        <div className={"mt-3 rounded-lg p-3 text-sm font-semibold " + (audit.required ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800")}>
          {audit.required ? "AUDIT REQUIRED — engage before 30 September" : "No tax audit required on these facts"}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{audit.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">2 · Partnership — s.40(b) remuneration ceiling</h2>
        <label className="mt-2 block text-xs font-semibold text-stone-600">Book profit before partner remuneration (₹)
          <input type="number" value={bookProfit || ""} onChange={(e) => setBookProfit(Number(e.target.value))} className={field} />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-brand-50 p-3"><div className="text-xs text-brand-600">Max deductible remuneration</div><div className="text-xl font-bold text-brand-700">{inr(rem.limit)}</div></div>
          <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">Firm tax if fully drawn (30% + cess)</div><div className="text-xl font-bold text-stone-800">{inr(ftax.total)}</div></div>
        </div>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">{rem.notes.map((r) => <li key={r}>• {r}</li>)}</ul>
      </section>

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-bold text-stone-800">3 · Company — which regime?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-stone-600">Total income (₹)
            <input type="number" value={cIncome || ""} onChange={(e) => setCIncome(Number(e.target.value))} className={field} />
          </label>
          <div className="flex flex-col justify-end gap-1.5 pb-1 sm:col-span-2">
            <Check v={under400} set={setUnder400}>Turnover ≤ ₹400cr in FY 2023-24</Check>
            <Check v={newMfg} set={setNewMfg}>New manufacturing co. (115BAB conditions)</Check>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {co.options.map((o) => (
            <div key={o.regime} className={"rounded-lg border p-3 " + (o.regime === co.best ? "border-brand-600 bg-brand-50/60" : "border-stone-200")}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-stone-800">{o.regime} {o.regime === co.best && "✓ lowest"}</span>
                <span className="text-sm font-bold text-brand-700">{o.effectivePct}% → {inr(o.tax)}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-stone-500">{o.note}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        Signed audit reports (3CA/3CB-3CD) and company returns remain professional engagements — this desk gives you the applicability call and the numbers in seconds.
        Running the partners' personal returns? That's the <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link> + <Link href="/pro/clients" className="font-semibold text-brand-700 underline">Client Workbook</Link>.
      </p>
    </main>
  );
}
