import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "What's new — the TaxSense AI build log | TaxSense AI",
  description: "Every feature we've shipped, dated and honest — from the conversational tax engine to the Professional Suite for lawyers, CAs and students.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/whats-new" },
};

export default function WhatsNew() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <h1 className="mt-3 text-3xl font-bold text-stone-800">What&apos;s new</h1>
        <p className="mt-2 text-sm text-stone-600">
          We ship fast and in the open. Everything below is live right now — no roadmap promises, only shipped software.
        </p>
      </header>

      <div className="space-y-8">
        {CHANGELOG.map((c) => (
          <section key={c.date} className="relative border-l-2 border-brand-100 pl-6">
            <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-brand-600" />
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {new Date(c.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <h2 className="mt-1 text-lg font-bold text-stone-800">{c.title}</h2>
            <ul className="mt-2 space-y-1.5">
              {c.items.map((it) => (
                <li key={it} className="flex gap-2 text-sm text-stone-600">
                  <span className="text-brand-600">✓</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-brand-200 bg-brand-50/60 p-5 text-sm">
        <p className="text-stone-700">
          <strong>Want these in your inbox?</strong> Finish the{" "}
          <Link href="/tools/quiz" className="font-semibold text-brand-700 underline">tax-law quiz</Link> and join the
          list, or just <Link href="/app" className="font-semibold text-brand-700 underline">start using the app</Link> — it updates itself.
        </p>
      </div>
    </main>
  );
}
