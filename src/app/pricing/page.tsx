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

export default function Pricing() {
  return (
    <main>
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
            Launch offer: comment <strong>&quot;Tax Bachao&quot;</strong> on our LinkedIn post and get one month of Pro free.
          </p>
        </div>

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
            <div className="mt-4 text-4xl font-bold">₹499<span className="text-base font-medium text-stone-400"> / year</span></div>
            <Feat items={[
              "Everything in Starter",
              "Unlimited filing-summary PDFs",
              "₹-quantified deduction insights, ranked by savings",
              "CTC Designer — the salary structure to ask HR for",
              "What-if planner, 3 saved scenarios & share links",
              "Email-me-my-results snapshots",
              "Saved profiles across devices (secure account)",
            ]} />
            <div className="mt-auto pt-6"><PlanRequest plan="Pro (₹499/yr)" /></div>
          </div>

          {/* Business */}
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold">Business</h2>
            <p className="mt-1 text-sm text-stone-500">Freelancers, consultants & business owners.</p>
            <div className="mt-4 text-4xl font-bold">₹1,499<span className="text-base font-medium text-stone-400"> / year</span></div>
            <Feat items={[
              "Everything in Pro",
              "44AD / 44ADA presumptive taxation guidance",
              "Advance-tax calendar with 234B/234C interest",
              "Tax Jar — how much to set aside every month",
              "GST registration & audit-trigger pointers",
              "Rent-receipt generator (12 months, PAN-ready)",
              "ITR form recommendation with reasons",
            ]} />
            <div className="mt-auto pt-6"><PlanRequest plan="Business (₹1,499/yr)" /></div>
          </div>

          {/* Filed For You */}
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-brand-900 p-6 text-white">
            <h2 className="text-lg font-bold">Filed For You</h2>
            <p className="mt-1 text-sm text-brand-100">We prepare and file your return with you.</p>
            <div className="mt-4 text-4xl font-bold">₹2,999<span className="text-base font-medium text-brand-100"> / return</span></div>
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
            <div className="mt-auto pt-6"><PlanRequest plan="Filed For You (₹2,999/return)" cta="Request expert filing" /></div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-stone-400">
          Paid plans are activated personally during launch — request a plan and we contact you to complete setup and payment.
          Prices include GST. TaxSense AI + your CA, not instead of your CA. An MNB Research product, in collaboration with Abrobot.ai.
        </p>
      </section>
    </main>
  );
}
