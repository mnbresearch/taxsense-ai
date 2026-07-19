import Link from "next/link";
import RequestAccess from "./RequestAccess";
import InstallApp from "./InstallApp";

/** Landing page (Session 8 copy) — MNB Research / founder-building-in-public voice. */
export default function Landing() {
  return (
    <main>
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="text-lg font-bold text-brand-700">
          TaxSense <span className="text-stone-400 font-normal">AI</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/guide" className="text-stone-600 hover:text-brand-700">Tax Guide</Link>
          <Link href="/pricing" className="text-stone-600 hover:text-brand-700">Pricing</Link>
          <Link href="/deadlines" className="text-stone-600 hover:text-brand-700">Deadlines</Link>
          <Link href="/learn" className="text-stone-600 hover:text-brand-700">Learn</Link>
          <Link href="/professional" className="text-stone-600 hover:text-brand-700">For professionals</Link>
          <InstallApp />
          <a href="#how" className="text-stone-600 hover:text-brand-700">How it works</a>
          <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
            Try it free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-14 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
          An MNB Research product · FY 2025-26 ready
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Your taxes, figured out in one conversation.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
          TaxSense AI talks to you like a sharp CA — not a 40-field form. Tell it how you earn,
          it computes your tax under <em>both</em> regimes, finds the deductions you&apos;re leaving on
          the table, and hands you a filing-ready summary PDF.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/app" className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Start the conversation →
          </Link>
          <a href="#how" className="rounded-lg border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-brand-600">
            See how it works
          </a>
        </div>
        <p className="mt-6 text-sm text-stone-500">
          ⚖️ Lawyer, CA or law student? Explore the{" "}
          <Link href="/professional" className="font-semibold text-brand-700 underline hover:no-underline">Professional Suite</Link>
          {" "}— s.234 interest, 26AS reconciliation, regime breakevens, statute quick-reference and a client workbook.
        </p>
        <p className="mt-4 text-sm text-stone-500">
          Free while in beta. No signup needed to try. Your numbers never train anyone&apos;s model.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          🏆 Shark Tank India featured &nbsp;·&nbsp; 📋 DPIIT-recognised startup &nbsp;·&nbsp; MNB Research × Abrobot.ai
        </p>

        {/* Live chat preview */}
        <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-stone-900 p-5 text-left shadow-2xl">
          <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"></span>
            <span className="text-xs font-semibold text-emerald-100">TaxSense AI — live session</span>
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
            I make around <strong>80k a month</strong>, pay 25k rent in Pune, put 1.5L in PPF.
          </div>
          <div className="mt-2.5 max-w-[85%] rounded-2xl rounded-bl-sm bg-white/95 px-4 py-2.5 text-sm text-stone-800">
            Got it — salary ₹9.6L annualised, HRA under Rule 2A, 80C at cap.{" "}
            <strong className="text-brand-700">Old: ₹58,240 · New: ₹42,900 → new regime saves ₹15,340.</strong>{" "}
            And I found 2 more moves worth ₹18,700. Want the PDF?
          </div>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Business owner or freelancer?{" "}
          <Link href="/guide" className="font-semibold text-brand-700 underline">
            Take the 60-second Tax Guide
          </Link>{" "}
          — learn exactly what you must file before you compute a single number.
        </p>
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <p className="mb-3 text-sm font-semibold text-brand-700">
            🚀 Launching Monday, 13 July — request early access
          </p>
          <RequestAccess compact />
          <p className="mt-2 text-xs text-stone-500">No spam. One email with your access details at launch.</p>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-10 text-center sm:grid-cols-3">
          {[
            ["Old vs New", "Every rupee computed under both regimes — section-cited, never a black box."],
            ["₹-quantified advice", "Ranked moves with exact savings: NPS, 80C, LTCG harvesting — by savings-per-rupee."],
            ["CTC Designer", "The only tool that designs the salary structure you should ask HR for."],
            ["Business-ready", "44AD/44ADA guidance, audit triggers, GST pointers, advance-tax calendar, Tax Jar."],
            ["Tax Guide", "60 seconds of taps → exactly what YOU must file, before any numbers."],
            ["Filing-ready PDF", "Summary, insights, installment calendar and checklist — file it or hand it to your CA."],
          ].map(([h, s]) => (
            <div key={h}>
              <div className="text-2xl font-bold text-brand-700">{h}</div>
              <p className="mt-1 text-sm text-stone-600">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Talk, don't type into forms",
              d: "“I make around 80k a month, pay 25k rent in Pune, put 1.5L in PPF.” That's enough — TaxSense AI structures it, annualises it, and asks only what actually matters next.",
            },
            {
              n: "2",
              t: "See both regimes, honestly",
              d: "A transparent, auditable computation under the old and new regime — slabs, HRA, 87A rebate, surcharge, capital gains — with every rule cited, not a black box.",
            },
            {
              n: "3",
              t: "Walk away filing-ready",
              d: "Download your filing summary PDF with the regime recommendation, quantified deduction moves, and the exact list of documents you'll need.",
            },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{s.n}</div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-stone-600">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-stone-600">
          <strong>TaxSense AI + your CA, not instead of your CA.</strong> It does the tedious 90% —
          intake, regime math, document prep — so if you do work with a professional, they start
          from a clean, complete file instead of a shoebox of screenshots.
        </p>
      </section>

      {/* Access CTA */}
      <section className="bg-brand-700">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 className="text-3xl font-bold text-white">Be first in line.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100">
            We launch Monday, 13 July. Request access now and your invite — with a free month — lands the moment we go live.
          </p>
          <div className="mt-6">
            <RequestAccess />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></div>
              <p className="mt-2 text-xs text-stone-500">Your taxes, figured out in one conversation. An MNB Research product, in collaboration with Abrobot.ai.</p>
            </div>
            <div className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Product</div>
              <div className="mt-2 flex flex-col gap-1.5 text-stone-600">
                <Link href="/app" className="hover:text-brand-700">Open the app</Link>
                <Link href="/pricing" className="hover:text-brand-700">Pricing</Link>
                <Link href="/guide" className="hover:text-brand-700">60-second Tax Guide</Link>
                <Link href="/compare" className="hover:text-brand-700">vs DIY portals &amp; CAs</Link>
              </div>
            </div>
            <div className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Resources</div>
              <div className="mt-2 flex flex-col gap-1.5 text-stone-600">
                <Link href="/deadlines" className="hover:text-brand-700">Deadline calendar + reminders</Link>
                <Link href="/learn" className="hover:text-brand-700">Tax glossary (FY 2025-26)</Link>
                <a href="https://www.mnbresearch.com/taxsense-ai" className="hover:text-brand-700">About this product</a>
                <a href="https://www.mnbresearch.com" className="hover:text-brand-700">MNB Research</a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-stone-100 pt-4 text-center text-xs text-stone-400">
            © {new Date().getFullYear()} MNB Research · Computations per the Income-tax Act, 1961 (Finance Act 2025) · Not a substitute for professional advice ·{" "}
            <Link href="/privacy" className="underline hover:text-brand-700">Privacy</Link> ·{" "}
            <Link href="/terms" className="underline hover:text-brand-700">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
