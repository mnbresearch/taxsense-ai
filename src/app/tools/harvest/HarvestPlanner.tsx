"use client";

/** Batch 45 — LTCG harvesting planner (free). */
import { useState } from "react";
import Link from "next/link";
import { LTCG_EXEMPTION, planHarvest } from "@/lib/harvest";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function HarvestPlanner() {
  const [realized, setRealized] = useState(0);
  const [unrealized, setUnrealized] = useState(300_000);
  const plan = planHarvest({ realized, unrealized });

  const field = (label: string, hint: string, value: number, set: (n: number) => void) => (
    <label className="block">
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      <span className="block text-[11px] text-stone-400">{hint}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
        <span className="pl-3 text-sm text-stone-400">₹</span>
        <input type="number" min={0} value={value || ""} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg px-2 py-2.5 text-sm outline-none" />
      </div>
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">LTCG Harvesting Planner</h1>
        <p className="mt-2 text-sm text-stone-600">
          s.112A taxes long-term listed-equity gains at 12.5% — but the first <strong>{inr(LTCG_EXEMPTION)} each year is exempt</strong>,
          and the allowance doesn't carry forward. Booking gains up to the limit (and rebuying if you wish)
          steps up your cost basis tax-free.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          {field("LTCG already booked this FY", "Gains realized since 1 April on equity held > 12 months", realized, setRealized)}
          {field("Unrealized LTCG in your portfolio", "Paper gains on holdings that are already long-term", unrealized, setUnrealized)}
        </section>

        <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          {plan.fullyUsed ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Exemption fully used</div>
              <div className="mt-1 text-2xl font-bold text-stone-800">Nothing more to harvest this year</div>
              {plan.taxOnExcess > 0 && (
                <p className="mt-2 text-sm text-stone-600">
                  Gains above the limit owe ≈ <strong>{inr(plan.taxOnExcess)}</strong> at 12.5%. Next exemption resets 1 April.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Harvest this much before 31 March</div>
              <div className="mt-1 text-4xl font-bold text-brand-700">{inr(plan.harvestNow)}</div>
              <p className="mt-2 text-sm text-stone-600">
                Exemption left: {inr(plan.exemptionLeft)}.{" "}
                {plan.harvestNow < plan.exemptionLeft && "Your unrealized gains are the binding limit — harvest all of them."}
              </p>
              <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                Tax permanently avoided: <strong className="text-brand-700">{inr(plan.taxSaved)}</strong>
                <span className="text-xs text-stone-500"> (12.5% that would otherwise apply on eventual sale)</span>
              </div>
            </>
          )}
          <ul className="mt-4 space-y-1.5 text-[11px] text-stone-500">
            <li>• Rebuying immediately is fine for listed shares — but the repurchase restarts the 12-month clock.</li>
            <li>• Mind exit loads and STT on the round trip; they're usually far below 12.5%.</li>
            <li>• The 87A rebate does NOT cover 112A gains — this exemption is the only shelter.</li>
          </ul>
        </section>
      </div>

      <Link href="/app" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        See capital gains inside your full computation →
      </Link>
      <p className="mt-4 text-[11px] text-stone-400">Educational tool, not investment advice. Verify positions before trading.</p>
    </main>
  );
}
