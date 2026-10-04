import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | TaxSense AI",
  description: "How TaxSense AI collects, uses, protects and deletes your data.",
};

/** Name shown as Grievance Officer — update here if the designated person changes. */
const GRIEVANCE_OFFICER = "Mridul Nanda";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-bold text-brand-700">← TaxSense AI</Link>
      <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-stone-500">Effective 4 October 2026 (updated) · TaxSense AI is operated by ABROBOT TECHNOLOGIES PRIVATE LIMITED (brand: MNB Research), New Delhi, India.</p>

      <div className="prose-sm mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-bold text-stone-900">What we collect</h2>
          <p className="mt-2 leading-relaxed">
            <strong>Tax inputs</strong> you type or paste into the chat (income figures, deductions, rent, etc.) — processed to compute your result.
            If you use the app without signing in, these stay in your browser session and our servers process them transiently.
            If you sign in and save, they're stored against your account.
            <strong> Documents you paste</strong> (Form 16, AIS/TIS) are read by our own rule-based parser on our server to pull out the amounts. They are <strong>not</strong> sent to any AI model, PAN/TAN/Aadhaar numbers are stripped from anything the AI sees, and we do not keep chat transcripts.
            <strong> Contact details</strong> (email, optional name and phone) when you request access, request or buy a plan, run the Tax Check, or subscribe to deadline reminders — collected only after you tick the consent box, and used only for that purpose.
            The weekly tax-tips email goes only to people who separately opt in.
            <strong> Payment details</strong> are entered on Cashfree's checkout; we receive the order status, amount and your email — never card or bank details.
            <strong> Technical telemetry</strong> that is deliberately minimal: error events, feature-usage counters, feedback clicks and a first-party page-view count. Campaign emails contain a one-pixel open counter so we can see whether an email was opened. We do not use advertising trackers.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">How your data is protected</h2>
          <p className="mt-2 leading-relaxed">
            Saved profiles live in a Postgres database (Supabase, hosted in Mumbai) behind <strong>row-level security</strong> — each account can only ever read its own rows, enforced at the database layer.
            All traffic is encrypted in transit (TLS). Admin views show aggregates only; your raw financial data is never displayed there.
            <strong> Your numbers are never used to train any AI model</strong> — ours or anyone else's.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">Who processes it</h2>
          <p className="mt-2 leading-relaxed">
            We use a small set of processors to run the service: Vercel (hosting), Supabase (database and authentication, Mumbai region),
            Groq — and Anthropic only as a backup if Groq is unavailable — (the AI that reads your typed chat messages to structure them; messages only, with ID numbers removed, never your stored profile database or pasted documents),
            Resend (email delivery) and Cashfree Payments (payment processing). Each receives only what it needs to perform its function and is bound not to use your data to train models.
            We will update this list before adding any other provider. We do not sell or rent personal data to anyone.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">Retention & your rights</h2>
          <p className="mt-2 leading-relaxed">
            Chat transcripts are not stored. Account deletion (available in-app) starts a 30-day grace period (sign in again to cancel); after that your profiles, PDFs, reminders, email history, lead records, audit entries and your login are permanently erased.
            Payment records are kept for the period required by tax and accounting law, unlinked from any account.
            You can export your data as JSON at any time, unsubscribe from any email in one click, withdraw consent, and request access, correction or erasure of anything we hold by writing to
            {" "}<a className="font-semibold text-brand-700" href="mailto:contact@mnbresearch.com">contact@mnbresearch.com</a>.
            We comply with the Digital Personal Data Protection Act, 2023.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">Grievance Officer</h2>
          <p className="mt-2 leading-relaxed">
            For any complaint about how your personal data is handled, contact our Grievance Officer, {GRIEVANCE_OFFICER}, ABROBOT TECHNOLOGIES PRIVATE LIMITED, New Delhi, India —
            {" "}<a className="font-semibold text-brand-700" href="mailto:contact@mnbresearch.com?subject=Grievance%20%E2%80%94%20TaxSense%20AI">contact@mnbresearch.com</a> (subject “Grievance”), +91 97114 88480.
            We acknowledge within 48 hours and resolve within 30 days. If you are not satisfied, you may approach the Data Protection Board of India.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">Changes</h2>
          <p className="mt-2 leading-relaxed">
            If this policy changes materially, we'll note it here and, for signed-in users, by email. Continued use after changes means acceptance.
          </p>
        </section>
      </div>
      <p className="mt-10 text-xs text-stone-400">© {new Date().getFullYear()} ABROBOT TECHNOLOGIES PRIVATE LIMITED · See also our <Link href="/terms" className="underline">Terms of Service</Link>.</p>
    </main>
  );
}
