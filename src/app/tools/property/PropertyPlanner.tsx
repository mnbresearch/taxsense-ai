"use client";

/** Batch 88 — the property-sale conversation, computed. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { CII, propertySale } from "@/lib/cgProperty";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";

export default function PropertyPlanner() {
  const [salePrice, setSalePrice] = useState(10_000_000);
  const [cost, setCost] = useState(3_000_000);
  const [fy, setFy] = useState("2015-16");
  const [preJul24, setPreJul24] = useState(true);
  const [longTerm, setLongTerm] = useState(true);
  const [asset, setAsset] = useState<"residential-house" | "other-property">("residential-house");
  const [reinvest, setReinvest] = useState(0);
  const [bonds, setBonds] = useState(0);
  const [multiHouse, setMultiHouse] = useState(false);

  const r = useMemo(
    () => propertySale({ salePrice, purchaseCost: cost, purchaseFY: fy, acquiredBeforeJul2024: preJul24, longTerm, asset, reinvestHouse: reinvest, reinvestBonds: bonds, ownsMoreThanOneHouse: multiHouse }),
    [salePrice, cost, fy, preJul24, longTerm, asset, reinvest, bonds, multiHouse]
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">🏘️ Property Sale Tax Planner — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">The 12.5%-vs-indexed-20% call, then every exemption route — to one final number.</p>

      <div className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-stone-600">Sale consideration (₹)
          <input type="number" value={salePrice || ""} onChange={(e) => setSalePrice(Number(e.target.value))} className={field} />
        </label>
        <label className="text-xs font-semibold text-stone-600">Purchase cost (+ improvement) (₹)
          <input type="number" value={cost || ""} onChange={(e) => setCost(Number(e.target.value))} className={field} />
        </label>
        <label className="text-xs font-semibold text-stone-600">Purchase FY (for indexation)
          <select value={fy} onChange={(e) => setFy(e.target.value)} className={field}>{Object.keys(CII).map((k) => <option key={k}>{k}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-stone-600">Asset sold
          <select value={asset} onChange={(e) => setAsset(e.target.value as any)} className={field}>
            <option value="residential-house">Residential house (→ s.54)</option>
            <option value="other-property">Land / commercial / other (→ s.54F)</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-600">Reinvesting in a new house (₹)
          <input type="number" value={reinvest || ""} onChange={(e) => setReinvest(Number(e.target.value))} className={field} placeholder="0" />
        </label>
        <label className="text-xs font-semibold text-stone-600">54EC bonds (₹, max 50L)
          <input type="number" value={bonds || ""} onChange={(e) => setBonds(Number(e.target.value))} className={field} placeholder="0" />
        </label>
        <div className="flex flex-col justify-end gap-1.5 pb-1 text-xs text-stone-600 sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={longTerm} onChange={(e) => setLongTerm(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Held more than 24 months (long-term)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={preJul24} onChange={(e) => setPreJul24(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Acquired before 23-Jul-2024 (grandfather option)</label>
          {asset === "other-property" && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={multiHouse} onChange={(e) => setMultiHouse(e.target.checked)} className="h-4 w-4 accent-brand-600" /> I own more than one other house (blocks 54F)</label>
          )}
        </div>
      </div>

      {longTerm && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={"rounded-lg border p-3 " + (r.chosen.includes("12.5") ? "border-brand-600 bg-brand-50/60" : "border-stone-200 bg-white")}>
            <div className="text-xs text-stone-500">12.5% no indexation {r.chosen.includes("12.5") && "✓"}</div>
            <div className="text-lg font-bold">{inr(r.taxNoIndex)}</div>
            <div className="text-[11px] text-stone-500">on gain {inr(r.gainNoIndex)}</div>
          </div>
          <div className={"rounded-lg border p-3 " + (r.chosen.includes("20%") ? "border-brand-600 bg-brand-50/60" : "border-stone-200 bg-white")}>
            <div className="text-xs text-stone-500">20% with indexation {r.chosen.includes("20%") && "✓"}</div>
            <div className="text-lg font-bold">{r.taxIndexed !== null ? inr(r.taxIndexed) : "—"}</div>
            <div className="text-[11px] text-stone-500">{r.gainIndexed !== null ? "on indexed gain " + inr(r.gainIndexed) : "not available"}</div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-5">
        <div className="grid gap-3 sm:grid-cols-3 text-center">
          <div><div className="text-xs text-stone-500">Tax before exemptions</div><div className="text-lg font-bold text-stone-700">{longTerm ? inr(r.taxBeforeExemption) : "slab rate"}</div></div>
          <div><div className="text-xs text-stone-500">Exempt (54/54F + 54EC)</div><div className="text-lg font-bold text-brand-700">−{inr(r.exemption54 + r.exemption54EC)}</div></div>
          <div><div className="text-xs text-stone-500">Final LTCG tax (+cess)</div><div className="text-2xl font-extrabold text-brand-700">{longTerm ? inr(r.finalTax) : inr(r.taxableGainAfterExemptions) + " @ slab"}</div></div>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-stone-600">{r.notes.map((n) => <li key={n}>• {n}</li>)}</ul>

      <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        This plans the exemption BEFORE you sell — timelines (1/2/3 years, 6 months for bonds, CGAS by the ITR due date) decide everything.
        The full return with this gain inside it: the <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link> computes both regimes around it.
      </p>
    </main>
  );
}
