import type { Metadata } from "next";
import Link from "next/link";
import PlanRequest from "./PlanRequest";

export const metadata: Metadata = {
  title: "Pricing — TaxSense AI | Free tax copilot, Pro plans & expert filing",
  description:
    "Start free with India's conversational income-tax copilot. Upgrade to Pro for unlimited PDFs and the CTC Designer, Business for 44AD/44ADA tools, or let our experts file for you.",
};

const check = (
  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none fill-brand-600"><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"/></svg>
);

function Feat({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm text-stone-600">
      {items.map((f) => (
        <li key={f} className="flex gap-2">{check}<span>{f}</span></li>
      ))}
    </ul>
  );
}

const FAQ: [string, string][] = [
  ["Why pay when the Starter plan is free?", "Starter computes your tax honestly and always will. Paid plans exist for people optimising all year: unlimited PDFs, the CTC Designer, saved profiles, business tooling, and — on Concierge — a human expert managing everything. One found deduction typically pays for a year of Pro."],
  ["How do I pay?", "During launch, plans are activated personally: request a plan, we call you, set you up and take payment by UPI or bank transfer with a GST invoice. Online self-serve payments are coming."],
  ["Can I cancel anytime?", "Yes. Monthly plans stop at the end of the paid month, no questions. Annual plans are refunded pro-rata in the first 30 days."],
  ["Is my financial data safe?", "Your numbers are isolated per-user with database row-level security, encrypted in transit, and never used to train any model. You can export or delete everything, any time."],
  ["Do you replace my CA?", "No — we do the tedious 90% (intake, regime math, optimisation, document prep) and pair you with a professional when it matters. Filed For You and Concierge include one."],
];

export default function Pricing() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const productLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TaxSense AI",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://taxsense-ai.vercel.app",
    offers: [
      { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "INR" },
      { "@type": "Offer", name: "Pro", price: "399", priceCurrency: "INR", description: "per month" },
      { "@type": "Offer", name: "Business", price: "999", priceCurrency: "INR", description: "per month" },
      { "@type": "Offer", name: "Filed For You", price: "4999", priceCurrency: "INR", description: "per return" },
      { "@type": "Offer", name: "Concierge", price: "2499", priceCurrency: "INR", description: "per month" },
    ],
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/guide" className="text-stone-600 hover:text-brand-700">Tax Guide</Link>
          <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Open the app</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Pricing</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold leading-tight">Start free. Upgrade when it saves you more than it costs.</h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-600">
            A single missed deduction costs more than a year of Pro. Launch offer: comment{" "}
            <strong>&quot;Tax Bachao&quot;</strong> on our LinkedIn post and get one month of Pro free.
          </p>
        </div>

        <p className="mt-4 text-center text-xs font-semibold uppercase tracking-wide text-stone-400">
          🏆 Shark Tank India featured &nbsp;·&nbsp; 📋 DPIIT-recognised startup &nbsp;·&nbsp; MNB Research × Abrobot.ai
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold">Starter</h2>
            <p className="mt-1 text-sm text-stone-500">Try the copilot. No signup needed.</p>
            <div className="mt-4 text-4xl font-bold">₹0<span className="text-base font-medium text-stone-400"> / forever</span></div>
            <Feat items={[
              "Conversational tax intake (English + Hinglish)",
              "Old vs new regime, computed live & section-cited",
              "87A rebate, HRA, capital gains, surcharge — all handled",
              "60-second Tax Guide for freelancers & business owners",
              "Tax glossary & notice decoder",
              "1 filing-summary PDF per month",
            ]} />
            <div className="mt-auto pt-6">
              <Link href="/app" className="block w-full rounded-lg border border-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Start free →
              </Link>
            </div>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border-2 border-brand-600 bg-white p-6 shadow-lg">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-bold text-white">Most popular</span>
            <h2 className="text-lg font-bold">Pro</h2>
            <p className="mt-1 text-sm text-stone-500">For salaried professionals who optimise.</p>
            <div className="mt-4 text-4xl font-bold">₹399<span className="text-base font-medium text-stone-400"> / month</span></div>
            <p className="mt-1 text-xs text-stone-500">or ₹3,999/year — 2 months free</p>
            <Feat items={[
              "Everything in Starter",
              "Unlimited filing-summary PDFs",
              "₹-quantified deduction insights, ranked by savings",
              "CTC Designer — the salary structure to ask HR for",
              "What-if planner, 3 saved scenarios & share links",
              "Email-me-my-results snapshots",
              "Saved profiles across devices (secure account)",
            ]} />
            <div className="mt-auto pt-6"><PlanRequest plan="Pro (₹399/mo or ₹3,999/yr)" /></div>
          </div>

          {/* Business */}
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold">Business</h2>
            <p className="mt-1 text-sm text-stone-500">Freelancers, consultants & business owners.</p>
            <div className="mt-4 text-4xl font-bold">₹999<span className="text-base font-medium text-stone-400"> / month</span></div>
            <p className="mt-1 text-xs text-stone-500">or ₹9,999/year — 2 months free</p>
            <Feat items={[
              "Everything in Pro",
              "44AD / 44ADA presumptive taxation guidance",
              "Advance-tax calendar with 234B/234C interest",
              "Tax Jar — how much to set aside every month",
              "GST registration & audit-trigger pointers",
              "Rent-receipt generator (12 months, PAN-ready)",
              "ITR form recommendation with reasons",
            ]} />
            <div className="mt-auto pt-6"><PlanRequest plan="Business (₹999/mo or ₹9,999/yr)" /></div>
          </div>

          {/* Filed For You */}
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-brand-900 p-6 text-white">
            <h2 className="text-lg font-bold">Filed For You</h2>
            <p className="mt-1 text-sm text-brand-100">We prepare and file your return with you.</p>
            <div className="mt-4 text-4xl font-bold">₹4,999<span className="text-base font-medium text-brand-100"> / return</span></div>
            <p className="mt-1 text-xs text-brand-100">Pro subscribers pay ₹3,999</p>
            <ul className="mt-5 space-y-2.5 text-sm text-brand-100">
              {[
                "Everything in Business, for the full year",
                "A tax expert reviews your TaxSense computation",
                "Regime choice validated before filing",
                "Your ITR prepared & filed with you on a call",
                "Post-filing support: 143(1) intimations & notices",
                "Priority WhatsApp support",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none fill-emerald-300"><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"/></svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6"><PlanRequest plan="Filed For You (₹4,999/return)" cta="Request expert filing" /></div>
          </div>
        </div>

        {/* Concierge anchor tier */}
        <div className="mt-10 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-700 to-brand-900 p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Concierge</h2>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-200">Limited seats</span>
              </div>
              <p className="mt-2 text-sm text-brand-100">
                A dedicated tax expert on WhatsApp, all year. Quarterly planning reviews, advance-tax managed for you,
                up to <strong className="text-white">4 family PANs</strong>, every return filed, and any notice handled end-to-end —
                on top of everything in Business.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">₹2,499<span className="text-base font-medium text-brand-100"> / month</span></div>
              <p className="mt-1 text-xs text-brand-100">or ₹24,999/year — billed annually</p>
              <div className="mt-4 w-56"><PlanRequest plan="Concierge (₹2,499/mo or ₹24,999/yr)" cta="Request a seat" /></div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-center text-2xl font-bold">Fair questions</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-stone-200 bg-white p-5 open:border-brand-600">
                <summary className="cursor-pointer list-none font-semibold group-open:text-brand-700">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center">
          <a
            href="https://wa.me/919711488480?text=Hi%20MNB%20Research!%20I%20have%20a%20question%20about%20TaxSense%20AI%20plans."
            target="_blank" rel="noopener"
            className="inline-block rounded-full border border-green-500 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            💬 Questions? WhatsApp us — we reply fast
          </a>
        </p>
        <p className="mt-6 text-center text-xs text-stone-400">
          Paid plans are activated personally during launch — request a plan and we contact you to complete setup and payment.
          Prices include GST. TaxSense AI + your CA, not instead of your CA. An MNB Research product, in collaboration with Abrobot.ai.
        </p>
      </section>
    </main>
  );
}
