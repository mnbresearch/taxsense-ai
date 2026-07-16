import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | TaxSense AI",
  description: "How TaxSense AI collects, uses, protects and deletes your data.",
};

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-bold text-brand-700">← TaxSense AI</Link>
      <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-stone-500">Effective 13 July 2026 · TaxSense AI is operated by MNB Research, New Delhi, India.</p>

      <div className="prose-sm mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-bold text-stone-900">What we collect</h2>
          <p className="mt-2 leading-relaxed">
            <strong>Tax inputs</strong> you type or paste into the chat (income figures, deductions, rent, etc.) — processed to compute your result.
            If you use the app without signing in, these stay in your browser session and our servers process them transiently.
            If you sign in and save, they're stored against your account.
            <strong> Contact details</strong> (email, optional name and phone) when you request access, request a plan, or subscribe to deadline reminders.
            <strong> Technical telemetry</strong> that is deliberately minimal and PII-free: anonymous error events, feature-usage counters and feedback clicks. We do not use advertising trackers.
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
            We use a small set of processors to run the service: Vercel (hosting), Supabase (database and authentication),
            Groq and Anthropic (the AI that reads your chat messages to structure them — messages only, never your stored profile database),
            and Resend (transactional email). Each receives only what it needs to perform its function. We do not sell or rent personal data to anyone.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">Retention & your rights</h2>
          <p className="mt-2 leading-relaxed">
            Chat transcripts are purged after 18 months; account deletion (available in-app) queues permanent removal of your profile and data, executed automatically.
            You can export your full profile as JSON at any time, unsubscribe from reminder emails by replying STOP, and request access, correction or erasure of anything we hold by writing to
            {" "}<a className="font-semibold text-brand-700" href="mailto:contact@mnbresearch.com">contact@mnbresearch.com</a>.
            We comply with the Digital Personal Data Protection Act, 2023.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-stone-900">Changes</h2>
          <p className="mt-2 leading-relaxed">
            If this policy changes materially, we'll note it here and, for signed-in users, by email. Continued use after changes means acceptance.
          </p>
        </section>
      </div>
      <p className="mt-10 text-xs text-stone-400">© {new Date().getFullYear()} MNB Research · See also our <Link href="/terms" className="underline">Terms of Service</Link>.</p>
    </main>
  );
}
