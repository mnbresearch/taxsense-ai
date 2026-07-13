import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Indian Income-Tax Glossary FY 2025-26 — 87A, 80C, HRA, 44AD Explained | TaxSense AI",
  description:
    "Plain-English answers to every income-tax term that matters for FY 2025-26: Section 87A rebate, 80C, 80D, HRA, LTCG 112A, 44AD/44ADA, advance tax, ITR notices and more.",
};

export default function LearnPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GLOSSARY.map((g) => ({
      "@type": "Question",
      name: `What is ${g.term}?`,
      acceptedAnswer: { "@type": "Answer", text: g.answer },
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/deadlines" className="text-stone-600 hover:text-brand-700">Deadlines</Link>
          <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Open the app</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Learn</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">The income-tax glossary, in plain English.</h1>
        <p className="mt-4 max-w-2xl text-stone-600">
          Every term below is FY 2025-26 accurate and mirrors the exact rules inside the TaxSense AI engine.
          Ask any of these in <Link href="/app" className="font-semibold text-brand-700 underline">the app</Link> and you get the same answer, instantly.
        </p>

        <div className="mt-10 space-y-4">
          {GLOSSARY.map((g) => (
            <details key={g.term} className="group rounded-xl border border-stone-200 bg-white p-5 open:border-brand-600">
              <summary className="cursor-pointer list-none text-base font-semibold text-stone-900 group-open:text-brand-700">
                {g.term}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{g.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-brand-700 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Now apply it to YOUR numbers.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-100">Definitions are nice. A section-cited computation of your own tax is better.</p>
          <Link href="/app" className="mt-5 inline-block rounded-lg bg-white px-6 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
            Start the conversation →
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center text-sm text-stone-500">
          © {new Date().getFullYear()} MNB Research · TaxSense AI · General information, not professional advice.
        </div>
      </footer>
    </main>
  );
}
