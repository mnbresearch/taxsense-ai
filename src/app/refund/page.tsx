import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | TaxSense AI",
  description: "How cancellations and refunds work for TaxSense AI plans.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/refund" },
};

const H = "text-lg font-bold text-stone-900";

export default function Refund() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-bold text-brand-700">← TaxSense AI</Link>
      <h1 className="mt-6 text-3xl font-bold">Refund &amp; Cancellation Policy</h1>
      <p className="mt-1 text-sm text-stone-500">
        Effective 4 October 2026 · TaxSense AI is operated by ABROBOT TECHNOLOGIES PRIVATE LIMITED (brand: MNB Research), New Delhi, India.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className={H}>Monthly plans (Pro, Business, Concierge)</h2>
          <p className="mt-2">
            Cancel any time by emailing us. Your plan stays active until the end of the month you paid for and is not renewed.
            Monthly fees already paid are not refunded, except for duplicate payments or a charge for a plan that never activated.
          </p>
        </section>
        <section>
          <h2 className={H}>Annual plans</h2>
          <p className="mt-2">
            Cancel within 30 days of payment for a pro-rata refund of the unused period. After 30 days the plan runs to the end of its term and is not renewed.
          </p>
        </section>
        <section>
          <h2 className={H}>Filed For You (one return)</h2>
          <p className="mt-2">
            Fully refundable until work on your return begins. Once preparation has started, no refund is due; if we cannot file your return for a reason on our side, we refund in full.
          </p>
        </section>
        <section>
          <h2 className={H}>Failed or duplicate payments</h2>
          <p className="mt-2">
            If money left your account but your plan did not activate, or you were charged twice, write to us with your order ID — we refund the full amount.
            Amounts auto-reversed by your bank or Cashfree usually return within 5–7 working days.
          </p>
        </section>
        <section>
          <h2 className={H}>How to request a cancellation or refund</h2>
          <p className="mt-2">
            Email <a className="font-semibold text-brand-700" href="mailto:contact@mnbresearch.com?subject=Refund%20request%20%E2%80%94%20TaxSense%20AI">contact@mnbresearch.com</a> (subject “Refund request”) or call +91 97114 88480 with the email you paid from and your order ID.
            We confirm within 2 working days. Approved refunds are issued to the original payment method within 7 working days of approval.
          </p>
        </section>
        <section>
          <h2 className={H}>No physical delivery</h2>
          <p className="mt-2">
            TaxSense AI is a digital service delivered online. Paid plans activate automatically right after successful payment; there is no shipping.
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-stone-400">
        © {new Date().getFullYear()} ABROBOT TECHNOLOGIES PRIVATE LIMITED · See also our{" "}
        <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
