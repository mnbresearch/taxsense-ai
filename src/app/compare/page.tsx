import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TaxSense AI vs DIY Tax Portals vs a Traditional CA — Honest Comparison | FY 2025-26",
  description:
    "How does TaxSense AI compare to filling forms on a DIY tax portal or hiring a traditional CA? An honest side-by-side on cost, speed, optimisation depth and when each option wins.",
};

const rows: [string, string, string, string][] = [
  ["How you provide your details", "40+ form fields you must map yourself", "WhatsApp messages / documents to your CA, then wait", "One conversation — plain English or Hinglish, or paste your Form 16"],
  ["Old vs new regime comparison", "Usually shown after full data entry", "Depends on the CA taking the time", "Computed live from the first message, section-cited"],
  ["Deduction optimisation", "Static checklists", "Good CAs do this; many don't have time in July", "Every move quantified in ₹ and ranked, incl. employer-NPS restructuring"],
  ["Salary-structure advice (CTC design)", "Not offered", "Rarely offered", "Built in — the structure to ask HR for"],
  ["Business-owner guidance (44AD/ADA, GST)", "Separate paid products", "Yes, at consulting rates", "Built in, with advance-tax calendar and Tax Jar"],
  ["Year-round deadline reminders", "Marketing emails", "If your CA remembers you", "Automatic — 7 days and 1 day before every date, free"],
  ["Typical cost", "₹0–2,000 per filing + upsells", "₹1,500–10,000+ per year", "Free to start · Pro ₹399/mo · experts from ₹4,999/return"],
  ["Where it wins", "Simple, single-source salary returns", "Complex cases: audits, notices, foreign income", "Optimisation + understanding + speed, then hand a clean file to a CA if needed"],
];

export default function ComparePage() {
  return (
    <main>
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/pricing" className="text-stone-600 hover:text-brand-700">Pricing</Link>
          <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Try it free</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Honest comparison</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight">DIY portal, traditional CA, or TaxSense AI?</h1>
        <p className="mt-4 max-w-2xl text-stone-600">
          Each option has a place. Here&apos;s where each one actually wins — including when we&apos;d tell you to use a CA instead of us.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="p-4 font-semibold text-stone-500"></th>
                <th className="p-4 font-semibold">DIY tax portal</th>
                <th className="p-4 font-semibold">Traditional CA</th>
                <th className="bg-brand-50/60 p-4 font-semibold text-brand-700">TaxSense AI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, a, b, c]) => (
                <tr key={k} className="border-b border-stone-100 align-top">
                  <td className="p-4 font-medium text-stone-500">{k}</td>
                  <td className="p-4 text-stone-600">{a}</td>
                  <td className="p-4 text-stone-600">{b}</td>
                  <td className="bg-brand-50/40 p-4 font-medium text-stone-800">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-600">
          <strong>Our honest take:</strong> if you have an audit, a notice beyond a simple 143(1), or foreign income — get a professional
          (our <Link href="/pricing" className="font-semibold text-brand-700 underline">Filed For You</Link> plan pairs you with one).
          For everyone else, compute first, understand your position, and file with confidence.
        </p>

        <div className="mt-10 text-center">
          <Link href="/app" className="inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            See your own numbers →
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-sm text-stone-500">
          © {new Date().getFullYear()} MNB Research · TaxSense AI · General information, not professional advice.
        </div>
      </footer>
    </main>
  );
}
