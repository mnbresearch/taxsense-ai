"use client";

/** Batch 91 — the Playbook UI: filterable strategies + shareable case studies. */
import { useState } from "react";
import Link from "next/link";
import { CASE_STUDIES, STRATEGIES, type Audience } from "@/lib/playbook";

const TABS: { key: Audience | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "salaried", label: "💼 Salaried" },
  { key: "business", label: "🧑‍💻 Business & freelance" },
  { key: "investor", label: "📈 Investors" },
  { key: "property", label: "🏠 Property" },
  { key: "family", label: "👨‍👩‍👧 Family" },
];

function shareLinks(text: string) {
  const t = encodeURIComponent(text);
  return {
    wa: `https://wa.me/?text=${t}`,
    li: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://taxsense.mnbresearch.com/playbook")}`,
  };
}

export default function PlaybookClient() {
  const [tab, setTab] = useState<Audience | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const list = STRATEGIES.filter((s) => tab === "all" || s.audience === tab);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-3xl font-bold text-stone-800">🎯 The Tax-Saving Playbook</h1>
      <p className="mt-2 text-sm text-stone-600">
        How tax is actually saved in India — the section, the ₹ math, and the part most people skip:
        <strong> what keeps it legal when someone looks.</strong> No grey tricks; the Act is generous enough when you know where it points.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={"rounded-full px-3 py-1.5 text-xs font-semibold " + (tab === t.key ? "bg-brand-600 text-white" : "border border-stone-300 text-stone-600 hover:border-brand-600")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.map((s) => (
          <div key={s.id} className="rounded-xl border border-stone-200 bg-white">
            <button onClick={() => setOpen(open === s.id ? null : s.id)} className="w-full p-4 text-left">
              <div className="text-sm font-bold text-stone-800">{s.title}</div>
              <div className="mt-1 text-xs font-semibold text-brand-700">{s.hook}</div>
            </button>
            {open === s.id && (
              <div className="border-t border-stone-100 p-4 pt-3">
                <p className="text-sm leading-relaxed text-stone-700">{s.how}</p>
                <p className="mt-2 text-xs font-semibold text-stone-500">Legal basis: <span className="font-normal">{s.sections}</span></p>
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900"><strong>Keep it clean:</strong> {s.watchOut}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-2xl font-bold text-stone-800">📚 Case studies — the math, verified</h2>
      <p className="mt-1 text-xs text-stone-500">
        Illustrative composites, not client testimonials — every number below is computed by the same engine that runs this site (200+ automated checks). Run your own facts and the figures are yours.
      </p>
      <div className="mt-4 space-y-4">
        {CASE_STUDIES.map((c) => {
          const links = shareLinks(c.share);
          return (
            <div key={c.id} className="rounded-xl border border-brand-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl">{c.emoji}</div>
                  <h3 className="mt-1 text-base font-bold text-stone-800">{c.title}</h3>
                  <p className="text-xs font-semibold text-stone-500">{c.persona}</p>
                </div>
                <div className="whitespace-nowrap rounded-lg bg-brand-50 px-3 py-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-brand-600">Saved</div>
                  <div className="text-sm font-extrabold text-brand-700">{c.saved}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{c.story}</p>
              <p className="mt-2 text-xs font-semibold text-stone-500">Method: <span className="font-normal">{c.method}</span></p>
              <div className="mt-3 flex gap-2">
                <a href={links.wa} target="_blank" rel="noopener" className="rounded-lg border border-green-500 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50">Share on WhatsApp</a>
                <a href={links.li} target="_blank" rel="noopener" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-brand-600">Share on LinkedIn</a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-brand-600 bg-brand-50 p-5 text-sm">
        <strong className="text-brand-700">Which of these fit YOUR year?</strong>{" "}
        <span className="text-stone-700">Describe your income in the <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link> — the engine computes both regimes, ranks your moves by ₹ saved, and builds your Filing Kit.</span>
      </div>
      <p className="mt-4 text-[11px] text-stone-400">
        Educational content, not personal tax advice — strategies depend on your facts and documentation. Scenarios are illustrative composites with engine-computed figures. TaxSense AI + your CA, not instead of your CA.
      </p>
    </main>
  );
}
