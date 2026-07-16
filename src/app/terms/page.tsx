import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | TaxSense AI",
  description: "The terms that govern your use of TaxSense AI.",
};

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-bold text-brand-700">← TaxSense AI</Link>
      <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-1 text-sm text-stone-500">Effective 13 July 2026 · TaxSense AI is operated by MNB Research, New Delhi, India ("we").</p>

      <div className="mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-bold text-stone-900">1. What TaxSense AI is (and isn't)</h2>
          <p className="mt-2 leading-relaxed">
            TaxSense AI computes Indian income-tax estimates under the Income-tax Act, 1961 (as amended by Finance Act 2025), suggests optimisations, and produces summary documents.
            It provides <strong>information, not professional advice</strong>. Outputs depend on the accuracy of what you enter, and figures marked as estimates must be verified before filing.
            You remain responsible for your tax filings. Where a plan includes expert assistance, that assistance is provided by qualified professionals engaged by us.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">2. Accounts & acceptable use</h2>
          <p className="mt-2 leading-relaxed">
            You may use the free tier without an account. Signing in uses email magic links; keep your inbox secure.
            You agree not to abuse the service — no scraping at scale, probing security, submitting others&apos; personal data without authority, or using outputs to mislead.
            We may rate-limit or suspend abusive usage.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">3. Plans, payment & refunds</h2>
          <p className="mt-2 leading-relaxed">
            Paid plans (Pro, Business, Concierge, Filed For You) are currently activated personally: you request a plan, we contact you, and payment is collected by UPI or bank transfer with a GST invoice.
            Prices are listed on the <Link href="/pricing" className="font-semibold text-brand-700 underline">pricing page</Link> and include GST unless stated otherwise.
            Monthly plans can be cancelled any time and end at the close of the paid month. Annual plans are refundable pro-rata within the first 30 days. Filed For You fees are refundable in full until work on your return begins.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">4. Beta status & availability</h2>
          <p className="mt-2 leading-relaxed">
            The service is in active development. We aim for high availability but do not guarantee uninterrupted service, and features may change.
            Tax rules themselves change; we update the engine for notified amendments but the authoritative source is always the Act and official notifications.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">5. Liability</h2>
          <p className="mt-2 leading-relaxed">
            To the maximum extent permitted by law, our aggregate liability for any claim arising from the service is limited to the amount you paid us in the twelve months preceding the claim.
            We are not liable for indirect or consequential losses, or for filings made without verifying estimated figures.
            Nothing in these terms limits liability that cannot be limited under Indian law.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">6. Intellectual property, privacy & governing law</h2>
          <p className="mt-2 leading-relaxed">
            The service, its engine and content are the property of MNB Research. Your data remains yours — our use of it is governed by the{" "}
            <Link href="/privacy" className="font-semibold text-brand-700 underline">Privacy Policy</Link>.
            These terms are governed by the laws of India with courts at New Delhi having exclusive jurisdiction.
            Questions: <a className="font-semibold text-brand-700" href="mailto:contact@mnbresearch.com">contact@mnbresearch.com</a>.
          </p>
        </section>
      </div>
      <p className="mt-10 text-xs text-stone-400">© {new Date().getFullYear()} MNB Research · TaxSense AI, in collaboration with Abrobot.ai</p>
    </main>
  );
}
