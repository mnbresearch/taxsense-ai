"use client";

/** Admin dashboard (Session 5) — aggregates only; raw financial data never leaves RLS. */
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any[] | null>(null);
  const [err, setErr] = useState<string>("");
  const [emails, setEmails] = useState<any[] | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [ops, setOps] = useState<any>(null);
  const [subs, setSubs] = useState<any[] | null>(null);

  function loadSubs() {
    fetch("/api/admin/reminders")
      .then((r) => r.json())
      .then((d) => !d.error && setSubs(d.subs ?? []))
      .catch(() => {});
  }

  async function deactivateSub(email: string) {
    if (!window.confirm(`Stop deadline reminders for ${email}?`)) return;
    await fetch(`/api/admin/reminders?email=${encodeURIComponent(email)}`, { method: "DELETE" }).catch(() => {});
    loadSubs();
  }

  function loadLeads() {
    fetch("/api/admin/access-requests")
      .then((r) => r.json())
      .then((d) => !d.error && setLeads(d.leads ?? []))
      .catch(() => {});
  }

  async function deleteLead(email: string) {
    if (!window.confirm(`Remove ${email} from the access-request list?`)) return;
    await fetch(`/api/admin/access-requests?email=${encodeURIComponent(email)}`, { method: "DELETE" }).catch(() => {});
    loadLeads();
  }

  function loadEmails() {
    fetch("/api/admin/emails")
      .then((r) => r.json())
      .then((d) => !d.error && setEmails(d.emails ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e)));
    loadLeads();
    loadEmails();
    loadSubs();
    fetch("/api/admin/ops")
      .then((r) => r.json())
      .then((d) => !d.error && setOps(d))
      .catch(() => {});
  }, []);

  async function sendCampaign() {
    const recipients = to.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (recipients.length === 0 || !subject.trim() || !body.trim()) {
      setSendMsg("Fill recipients, subject and body first.");
      return;
    }
    if (!window.confirm(`Send this email to ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}?`)) return;
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body, recipients }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "send failed");
      setSendMsg(`✓ Sent ${d.sent}${d.failed ? ` · ${d.failed} failed` : ""}`);
      if (d.sent > 0) { setSubject(""); setBody(""); }
      loadEmails();
    } catch (e: any) {
      setSendMsg(e.message ?? "send failed");
    } finally {
      setSending(false);
    }
  }

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

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Access requests {leads && <span className="ml-1 rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{leads.length}</span>}</h2>
              {leads && leads.length > 0 && (
                <button
                  onClick={() => {
                    const csv = "email,name,phone,plan,source,created_at\n" + leads.map((l) => [l.email, l.name ?? "", l.phone ?? "", l.plan ?? "", l.source, l.created_at].join(",")).join("\n");
                    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                    const a = document.createElement("a"); a.href = url; a.download = "taxsense-access-requests.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-brand-700 underline"
                >
                  Export CSV
                </button>
              )}
            </div>
            {leads && leads.length > 1 && (() => {
              const days: string[] = [];
              for (let i = 13; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                days.push(d.toLocaleDateString("en-CA"));
              }
              const counts = days.map((day) => leads.filter((l) => new Date(l.created_at).toLocaleDateString("en-CA") === day).length);
              const max = Math.max(...counts, 1);
              return (
                <div className="mt-3 flex h-12 items-end gap-1" title="Leads per day, last 14 days">
                  {counts.map((c, i) => (
                    <div key={i} className="flex-1 rounded-t bg-brand-600/80" style={{ height: `${Math.max((c / max) * 100, c > 0 ? 12 : 4)}%`, opacity: c > 0 ? 1 : 0.25 }} title={`${days[i]}: ${c}`} />
                  ))}
                </div>
              );
            })()}
            {!leads || leads.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No access requests yet — they appear here the moment someone signs up on the landing page.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-stone-400">
                    <th className="py-1 font-medium">Email</th>
                    <th className="font-medium">Name</th>
                    <th className="font-medium">Phone</th>
                    <th className="font-medium">Plan</th>
                    <th className="font-medium">Source</th>
                    <th className="text-right font-medium">When</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 50).map((l, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      <td className="py-1.5 font-medium">{l.email}</td>
                      <td className="text-stone-600">{l.name ?? "—"}</td>
                      <td className="text-stone-600">{l.phone ?? "—"}</td>
                      <td className="text-stone-600">{l.plan ? <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">{l.plan}</span> : "—"}</td>
                      <td className="text-stone-500">{l.source}</td>
                      <td className="text-right text-xs text-stone-500">
                        {new Date(l.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="pl-2 text-right">
                        <button onClick={() => deleteLead(l.email)} title="Remove lead" className="text-xs text-stone-400 hover:text-red-600">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Compose email</h2>
            <p className="mt-1 text-xs text-stone-500">
              Sends live via Resend from <code>hello@updates.mnbresearch.com</code>. Use <code>{"{name}"}</code> anywhere to personalise per recipient.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients — comma-separated emails"
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                />
                {leads && leads.length > 0 && (
                  <button
                    onClick={() => setTo(Array.from(new Set(leads.map((l) => String(l.email).toLowerCase()))).join(", "))}
                    className="rounded-lg border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Use all leads ({new Set(leads.map((l) => String(l.email).toLowerCase())).size})
                  </button>
                )}
              </div>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Hi {name},\n\nYour TaxSense AI access is live...\n\nBlank line = new paragraph."}
                rows={7}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={sendCampaign}
                  disabled={sending}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send email"}
                </button>
                {sendMsg && <span className="text-sm text-stone-600">{sendMsg}</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Email activity {emails && <span className="ml-1 rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{emails.length}</span>}
              </h2>
              <div className="flex items-center gap-3">
                {emails && emails.length > 0 && (
                  <button
                    onClick={() => {
                      const csv = "to,subject,kind,status,created_at\n" + emails.map((m) => [m.to_email, JSON.stringify(m.subject), m.kind, m.status, m.created_at].join(",")).join("\n");
                      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                      const a = document.createElement("a"); a.href = url; a.download = "taxsense-email-log.csv"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs text-brand-700 underline"
                  >
                    Export CSV
                  </button>
                )}
                <button onClick={loadEmails} className="text-xs text-brand-700 underline">Refresh</button>
              </div>
            </div>
            {!emails || emails.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No emails logged yet — every notification, confirmation and campaign send shows up here.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-stone-400">
                    <th className="py-1 font-medium">To</th>
                    <th className="font-medium">Subject</th>
                    <th className="font-medium">Kind</th>
                    <th className="font-medium">Status</th>
                    <th className="text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.slice(0, 50).map((m, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      <td className="py-1.5 font-medium">{m.to_email}</td>
                      <td className="max-w-[220px] truncate text-stone-600" title={m.subject}>{m.subject}</td>
                      <td className="text-stone-500">{m.kind}</td>
                      <td>
                        <span className={m.status === "sent" ? "rounded bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-700" : "rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700"} title={m.error ?? ""}>
                          {m.status}
                        </span>
                      </td>
                      <td className="text-right text-xs text-stone-500">
                        {new Date(m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {subs && subs.length > 0 && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">
                Reminder subscribers <span className="ml-1 rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{subs.filter((s) => s.active).length}</span>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {subs.slice(0, 30).map((s, i) => (
                  <span key={i} className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs " + (s.active ? "border-stone-200 bg-stone-50 text-stone-700" : "border-stone-100 text-stone-400 line-through")}>
                    {s.email}
                    {s.active && <button onClick={() => deactivateSub(s.email)} title="Stop reminders" className="text-stone-400 hover:text-red-600">✕</button>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ops && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">System status</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><div className="text-xs uppercase text-stone-400">Intake AI</div><div className="font-semibold">{ops.providers?.intake}</div></div>
                <div><div className="text-xs uppercase text-stone-400">Email</div><div className="font-semibold">{ops.providers?.email}</div></div>
                <div><div className="text-xs uppercase text-stone-400">Cron secret</div><div className="font-semibold">{ops.providers?.cronSecret}</div></div>
                <div>
                  <div className="text-xs uppercase text-stone-400">Last keep-alive</div>
                  <div className="font-semibold">
                    {ops.lastKeepalive ? new Date(ops.lastKeepalive.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "not yet run"}
                  </div>
                </div>
              </div>
              {ops.adminActions && ops.adminActions.length > 0 && (
                <div className="mt-4 text-xs text-stone-500">
                  Recent admin actions:{" "}
                  {ops.adminActions.slice(0, 5).map((a: any, i: number) => (
                    <span key={i} className="mr-2 rounded bg-stone-100 px-1.5 py-0.5">
                      {a.event.replace("admin_", "")} · {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
