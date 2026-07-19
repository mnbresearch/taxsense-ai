"use client";

/**
 * Batch 41 — 26AS reconciliation (Pro). The first step of every filing
 * engagement: does the client's TDS claim match the department's records?
 * Parsing is 100% client-side — the statement never leaves the browser.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { parse26AS, reconcile } from "@/lib/tds";
import { useEntitlements } from "../../app/Account";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function TdsReconciler() {
  const ent = useEntitlements();
  const unlocked = !!ent?.features.proTools;
  const [text, setText] = useState("");
  const [claimed, setClaimed] = useState(0);

  const parsed = useMemo(() => parse26AS(text), [text]);
  const rec = useMemo(() => reconcile(parsed, claimed), [parsed, claimed]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">26AS TDS Reconciliation</h1>
        <p className="mt-2 text-sm text-stone-600">
          Open the client's Form 26AS, select-all, copy, paste below. Entries are extracted, de-duplicated
          and totalled by section — <strong>entirely in this browser tab</strong>; the statement is never uploaded.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste 26AS text here…\ne.g.\nACME TECHNOLOGIES PVT LTD MUMB01234A 192 31-Mar-2026 1,20,000.00 12,000.00 12,000.00"}
            className="h-72 w-full rounded-xl border border-stone-300 p-3 font-mono text-xs outline-none focus:border-brand-600"
          />
          <label className="block">
            <span className="text-xs font-semibold text-stone-600">TDS the return currently claims</span>
            <div className="mt-1 flex max-w-xs items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
              <span className="pl-3 text-sm text-stone-400">₹</span>
              <input type="number" min={0} value={claimed || ""} onChange={(e) => setClaimed(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg px-2 py-2 text-sm outline-none" />
            </div>
          </label>
        </section>

        <section className="relative rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className={unlocked ? "" : "pointer-events-none select-none blur-[5px]"} aria-hidden={!unlocked}>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">TDS found in 26AS</div>
            <div className="mt-1 text-4xl font-bold text-brand-700">{inr(parsed.total)}</div>
            <div className="mt-1 text-xs text-stone-600">{parsed.entries.length} unique entries across {Object.keys(parsed.bySection).length} sections</div>

            {Object.keys(parsed.bySection).length > 0 && (
              <table className="mt-3 w-full text-xs">
                <tbody>
                  {Object.entries(parsed.bySection).map(([sec, amt]) => (
                    <tr key={sec} className="border-t border-brand-100 text-stone-600">
                      <td className="py-1 font-semibold">s.{sec}</td>
                      <td className="text-right">{inr(amt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {claimed > 0 && parsed.total > 0 && (
              <div className={"mt-4 rounded-lg p-3 text-sm font-semibold " +
                (rec.verdict === "match" ? "bg-green-100 text-green-800" : rec.verdict === "claim-more" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>
                {rec.verdict === "match" && "✓ Return matches the department's records."}
                {rec.verdict === "claim-more" && `26AS shows ${inr(rec.difference)} MORE than the return claims — client is leaving credit on the table.`}
                {rec.verdict === "claim-less" && `Return claims ${inr(-rec.difference)} MORE than 26AS shows — expect a 143(1) adjustment; trace the missing deposit first.`}
              </div>
            )}

            {parsed.entries.length > 0 && (
              <details className="mt-3 text-xs text-stone-600">
                <summary className="cursor-pointer font-semibold">All entries ({parsed.entries.length})</summary>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                  {parsed.entries.map((e, i) => (
                    <li key={i} className="flex justify-between gap-2 border-t border-brand-100 py-0.5">
                      <span className="truncate">s.{e.section} · {e.deductor}</span>
                      <span className="whitespace-nowrap font-semibold">{inr(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {text && parsed.entries.length === 0 && (
              <p className="mt-3 text-xs text-stone-500">No TDS rows recognised yet — make sure the pasted text includes the section numbers (192, 194A…) and amounts.</p>
            )}
          </div>
          {!unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl p-6 text-center">
              <div className="text-3xl">🔒</div>
              <p className="mt-2 text-sm font-semibold text-stone-800">Reconciliation unlocks with Pro</p>
              <p className="mt-1 text-xs text-stone-600">Paste freely — parsing runs locally. The extracted totals, section split and match verdict need an activated plan.</p>
              <Link href="/pricing" className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Get Pro — ₹399/mo</Link>
              <p className="mt-2 text-[11px] text-stone-400">Already paid? Sign in from the workspace.</p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-[11px] text-stone-400">
        Heuristic text parser — always verify against the original statement. Amounts are read as the last
        figure per row (26AS column order). AIS copy-paste generally works too.
      </p>
    </main>
  );
}
