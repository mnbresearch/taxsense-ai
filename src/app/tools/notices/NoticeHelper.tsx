"use client";

/** Batch 43 — notice helper (Pro). Pick the notice, get the playbook. */
import { useState } from "react";
import Link from "next/link";
import { NOTICES } from "@/lib/notices";
import { useEntitlements } from "../../app/Account";

const FEAR = {
  1: { label: "Routine", cls: "bg-green-100 text-green-800" },
  2: { label: "Needs attention", cls: "bg-amber-100 text-amber-800" },
  3: { label: "Serious — get help", cls: "bg-red-100 text-red-800" },
} as const;

export default function NoticeHelper() {
  const ent = useEntitlements();
  const unlocked = !!ent?.features.proTools;
  const [sel, setSel] = useState<string | null>(null);
  const n = NOTICES.find((x) => x.id === sel);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Notice Helper</h1>
        <p className="mt-2 text-sm text-stone-600">
          Every notice starts a clock. Pick the one you (or your client) received — the meaning, the deadline
          and the response checklist are the same ones a practitioner works through.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        {NOTICES.map((x) => (
          <button
            key={x.id}
            onClick={() => setSel(x.id)}
            className={
              "rounded-xl border p-3 text-left transition " +
              (sel === x.id ? "border-brand-600 bg-brand-50" : "border-stone-200 bg-white hover:border-brand-600")
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-brand-700">s.{x.section}</span>
              <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + FEAR[x.fear].cls}>{FEAR[x.fear].label}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-stone-800">{x.title}</div>
          </button>
        ))}
      </div>

      {n && (
        <section className="relative mt-6 rounded-xl border border-brand-200 bg-white p-5">
          <div className={unlocked ? "" : "pointer-events-none select-none blur-[5px]"} aria-hidden={!unlocked}>
            <h2 className="text-lg font-bold text-stone-800">s.{n.section} — {n.title}</h2>
            <p className="mt-2 text-sm text-stone-700">{n.meaning}</p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">⏱ {n.deadline}</p>
            <h3 className="mt-4 text-sm font-bold text-stone-800">Response checklist</h3>
            <ol className="mt-2 space-y-2">
              {n.checklist.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">{i + 1}</span>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600"><strong>If it goes further:</strong> {n.escalation}</p>
          </div>
          {!unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl p-6 text-center">
              <div className="text-3xl">🔒</div>
              <p className="mt-2 text-sm font-semibold text-stone-800">The playbook unlocks with Pro</p>
              <p className="mt-1 text-xs text-stone-600">Meaning, deadline, response checklist and escalation path for each of the six notices.</p>
              <Link href="/pricing" className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Get Pro — ₹399/mo</Link>
              <p className="mt-2 text-[11px] text-stone-400">Already paid? Sign in from the workspace.</p>
            </div>
          )}
        </section>
      )}

      <p className="mt-6 text-[11px] text-stone-400">
        General guidance, not legal advice — notices turn on their specific facts. For scrutiny and reassessment
        matters, engage a professional; these checklists are the map, not the driver.
      </p>
    </main>
  );
}
