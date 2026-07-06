"use client";

/** Admin dashboard (Session 5) — aggregates only; raw financial data never leaves RLS. */
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e)));
  }, []);

  const s = data?.stats ?? {};
  const cards: [string, any][] = [
    ["Users", s.users],
    ["Tax profiles", s.profiles],
    ["Computed profiles", s.computed],
    ["Chat messages", s.messages],
    ["PDFs generated", s.pdfs],
    ["Signups (7d)", s.signups_7d],
    ["Pending deletions", s.pending_deletions],
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-stone-500">
            Aggregates only — user financial data stays behind row-level security.
            {data?.mode === "demo" && " (Demo mode: connect Supabase for live metrics.)"}
          </p>
        </div>
        <Link href="/app" className="text-sm text-brand-700 hover:underline">← Back to app</Link>
      </header>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err === "forbidden"
            ? "You're not on the ADMIN_EMAILS list. Set it in your environment to access this page."
            : err}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cards.map(([label, v]) => (
              <div key={label} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="text-3xl font-bold text-brand-700">{v ?? 0}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-stone-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Regime recommendations</h2>
            {s.regime_split && Object.keys(s.regime_split).length > 0 ? (
              <div className="mt-3 flex gap-6">
                {Object.entries(s.regime_split).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-2xl font-bold">{String(v)}</span>
                    <span className="ml-2 text-sm text-stone-500">{k} regime</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No computed profiles yet.</p>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            <h2 className="font-semibold text-stone-900">Operational runbook</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Deletion queue: run <code>select public.execute_pending_deletions()</code> daily (pg_cron).</li>
              <li>Transcript retention: <code>select public.purge_stale_intake_messages()</code> monthly (18-month window).</li>
              <li>Rules-engine year rollover: swap <code>src/lib/tax-engine/constants.ts</code> when Budget 2026 figures are notified.</li>
            </ul>
          </div>
        </>
      )}
    </main>
  );
}
