"use client";

/** Batch 37 — searchable statute quick-reference (free, for students). */
import { useMemo, useState } from "react";
import Link from "next/link";
import { SECTIONS } from "@/lib/sections";

const TAGS = ["all", "deduction", "exemption", "capital-gains", "interest", "notice", "procedure", "new-regime", "old-regime", "salary", "penalty"];

export default function SectionBrowser() {
  const [qtext, setQ] = useState("");
  const [tag, setTag] = useState("all");

  const list = useMemo(() => {
    const t = qtext.trim().toLowerCase();
    return SECTIONS.filter((s) => {
      if (tag !== "all" && !s.tags.includes(tag)) return false;
      if (!t) return true;
      return (s.sec + " " + s.title + " " + s.plain + " " + s.note).toLowerCase().includes(t);
    });
  }, [qtext, tag]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Section Quick-Reference</h1>
        <p className="mt-2 text-sm text-stone-600">
          The Income-tax Act sections that actually come up — a plain-language line for the exam,
          a practice note for the file. Positions as amended for FY 2025-26.
        </p>
      </header>

      <input
        value={qtext}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search: 87A, HRA, reassessment, presumptive…"
        className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-brand-600"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TAGS.map((t) => (
          <button key={t} onClick={() => setTag(t)}
            className={"rounded-full px-3 py-1 text-xs font-medium " + (tag === t ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {list.map((s) => (
          <details key={s.sec} className="rounded-xl border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer">
              <span className="font-bold text-brand-700">s.{s.sec}</span>
              <span className="ml-2 font-semibold text-stone-800">{s.title}</span>
            </summary>
            <p className="mt-2 text-sm text-stone-700">{s.plain}</p>
            <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900"><strong>Practice note:</strong> {s.note}</p>
            <div className="mt-2 flex gap-1">
              {s.tags.map((t) => <span key={t} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">{t}</span>)}
            </div>
          </details>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-sm text-stone-400">Nothing matches — try a broader term.</p>}
      </div>
      <p className="mt-6 text-[11px] text-stone-400">
        Educational summaries, not legal advice. Verify against the bare Act and current circulars before relying on any position.
      </p>
    </main>
  );
}
