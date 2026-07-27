import type { Metadata } from "next";
import Link from "next/link";
import { PRO_TOOLS } from "@/lib/pro";

export const metadata: Metadata = {
  title: "Free Indian Income-Tax Calculators & Tools FY 2025-26 | TaxSense AI",
  description:
    "Every TaxSense AI tool in one place: HRA, 80GG, gratuity, LTCG harvesting, slab explorer, tax-law quiz, s.234 interest, 26AS reconciliation, notice playbooks and more — all on one tested engine.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools" },
};

/** Batch 66 — the tools hub: one canonical index for humans and crawlers. */
export default function ToolsHub() {
  const free = PRO_TOOLS.filter((t) => t.tier === "free" && t.href.startsWith("/tools"));
  const paid = PRO_TOOLS.filter((t) => t.tier !== "free");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <h1 className="mt-3 text-3xl font-bold text-stone-800">Tax tools & calculators — FY 2025-26</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Every tool runs the same deterministic engine as the main app — 147 automated checks, section-cited math,
          no rules of thumb.
        </p>
      </header>

      <h2 className="text-lg font-bold text-stone-800">Free — no signup</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {free.map((t) => (
          <Link key={t.id} href={t.href} className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-brand-600 hover:shadow-sm">
            <span className="text-xl">{t.icon}</span>
            <span className="mt-1 block text-sm font-semibold text-stone-800">{t.title}</span>
            <span className="mt-0.5 block text-xs text-stone-500">{t.desc}</span>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold text-stone-800">Professional — with a plan</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {paid.map((t) => (
          <Link key={t.id} href={t.href} className="rounded-xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-400">
            <div className="flex items-start justify-between">
              <span className="text-xl">{t.icon}</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{t.tier === "pro" ? "Pro" : "Business"}</span>
            </div>
            <span className="mt-1 block text-sm font-semibold text-stone-800">{t.title}</span>
            <span className="mt-0.5 block text-xs text-stone-500">{t.desc}</span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-stone-600">
        Lawyer, CA or student? See how the tiers fit together on the{" "}
        <Link href="/professional" className="font-semibold text-brand-700 underline">Professional Suite</Link> page.
      </p>
    </main>
  );
}
