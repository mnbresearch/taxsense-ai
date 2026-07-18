"use client";

/**
 * Batch 36 — the professional suite, explorable by everyone.
 * Locked tools are fully described (so people know what they're missing)
 * but only open on an activated plan — same entitlements as the app.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRO_TOOLS, SEGMENT_META, toolUnlocked, type Segment } from "@/lib/pro";
import { useEntitlements } from "../app/Account";

const TIER_BADGE = {
  free: { text: "Free", cls: "bg-green-100 text-green-800" },
  pro: { text: "Pro ₹399/mo", cls: "bg-brand-50 text-brand-700" },
  business: { text: "Business ₹999/mo", cls: "bg-amber-100 text-amber-800" },
} as const;

export default function ProCatalog() {
  const ent = useEntitlements();
  const router = useRouter();
  const [seg, setSeg] = useState<Segment>("student");
  const [locked, setLocked] = useState<string | null>(null);

  function open(id: string) {
    const t = PRO_TOOLS.find((x) => x.id === id)!;
    if (toolUnlocked(t, ent?.features)) router.push(t.href);
    else setLocked(id);
  }

  const lockedTool = PRO_TOOLS.find((x) => x.id === locked);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <h1 className="mt-3 text-3xl font-bold text-stone-800">The Professional Suite</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Every tool below runs on the same deterministic FY 2025-26 engine that powers the workspace —
          slabs, 87A with marginal relief, Rule 119A rounding, the lot. Explore everything; paid tools
          unlock the moment your plan is activated.
        </p>
        {ent?.active && (
          <p className="mt-2 text-xs font-semibold text-brand-700">✓ Signed in on {ent.features.label} — your unlocked tools open directly.</p>
        )}
      </header>

      <div className="mb-6 flex gap-1 rounded-lg bg-stone-100 p-1 text-sm font-medium">
        {(Object.keys(SEGMENT_META) as Segment[]).map((k) => (
          <button
            key={k}
            onClick={() => setSeg(k)}
            className={"flex-1 rounded-md px-3 py-2 " + (seg === k ? "bg-white text-brand-700 shadow-sm" : "text-stone-500 hover:text-stone-700")}
          >
            {SEGMENT_META[k].title}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm italic text-stone-500">{SEGMENT_META[seg].tagline}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PRO_TOOLS.filter((t) => t.segment === seg).map((t) => {
          const unlocked = toolUnlocked(t, ent?.features);
          const badge = TIER_BADGE[t.tier];
          return (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              className={
                "rounded-xl border p-5 text-left transition " +
                (unlocked ? "border-stone-200 bg-white hover:border-brand-600 hover:shadow-sm" : "border-stone-200 bg-stone-50 hover:border-amber-400")
              }
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{t.icon}</span>
                <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + badge.cls}>
                  {unlocked && t.tier !== "free" ? "✓ Unlocked" : badge.text}
                </span>
              </div>
              <h2 className="mt-2 font-semibold text-stone-800">
                {!unlocked && "🔒 "}{t.title}
              </h2>
              <p className="mt-1 text-sm text-stone-600">{t.desc}</p>
            </button>
          );
        })}
      </div>

      <section className="mt-10 rounded-xl border border-brand-200 bg-brand-50/60 p-5 text-sm">
        <h2 className="font-semibold text-stone-800">How access works</h2>
        <p className="mt-1 text-stone-600">
          Student tools are free forever. Practitioner tools come with <strong>Pro</strong>, the Client
          Workbook with <strong>Business</strong>. Request a plan on the <Link href="/pricing" className="font-semibold text-brand-700 underline">pricing page</Link> —
          we call you, you pay by UPI or bank transfer, and your email unlocks everything within minutes.
        </p>
      </section>

      {lockedTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLocked(null)}>
          <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl">{lockedTool.icon}</div>
            <h3 className="mt-1 text-base font-bold text-stone-800">{lockedTool.title} is a {lockedTool.tier === "pro" ? "Pro" : "Business"} tool</h3>
            <p className="mt-1 text-sm text-stone-600">{lockedTool.desc}</p>
            <Link href="/pricing" className="mt-4 block rounded-lg bg-brand-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700">
              {lockedTool.tier === "pro" ? "Get Pro — ₹399/mo" : "Get Business — ₹999/mo"}
            </Link>
            <button onClick={() => setLocked(null)} className="mt-2 w-full py-1 text-xs text-stone-500 hover:text-stone-700">Keep exploring</button>
            <p className="mt-2 text-center text-[11px] text-stone-400">Already paid? Sign in from the workspace with your plan email.</p>
          </div>
        </div>
      )}
    </main>
  );
}
