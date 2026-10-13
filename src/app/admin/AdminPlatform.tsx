"use client";

/** Admin: product analytics funnel, checkout follow-ups, API keys & service keys. */
import { useCallback, useEffect, useState } from "react";
import DevConsole from "../developers/DevConsole";

type Summary = Record<string, any>;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

function Step({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-xl font-bold text-stone-800">{value ?? 0}</div>
      {of !== undefined && <div className="text-[11px] text-stone-500">{pct(value, of)} of previous</div>}
    </div>
  );
}

export default function AdminPlatform() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Summary | null>(null);
  const [aErr, setAErr] = useState("");
  const [fu, setFu] = useState<any>(null);
  const [fuMsg, setFuMsg] = useState("");
  const [allKeys, setAllKeys] = useState<any[] | null>(null);

  const loadAnalytics = useCallback(() => {
    fetch(`/api/admin/analytics?days=${days}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setAErr(d.error ?? "analytics unavailable"); return; }
      setAErr(""); setS(d.summary);
    }).catch(() => setAErr("analytics unavailable"));
  }, [days]);
  const loadFu = () => fetch("/api/admin/followups").then((r) => r.json()).then(setFu).catch(() => {});
  const loadKeys = () => fetch("/api/admin/keys").then((r) => r.json()).then((d) => setAllKeys(d.keys ?? [])).catch(() => {});
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { loadFu(); loadKeys(); }, []);

  async function saveFu(patch: Record<string, unknown>) {
    const r = await fetch("/api/admin/followups", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    const d = await r.json().catch(() => ({}));
    setFuMsg(r.ok ? "Saved." : d.error ?? "save failed");
    loadFu();
  }
  async function actFu(action: "run" | "test") {
    if (action === "run" && !window.confirm(fu?.config?.dryRun ? "Run now in DRY-RUN mode (records only, no emails)?" : "Run now and SEND follow-up emails to eligible abandoned checkouts?")) return;
    const r = await fetch("/api/admin/followups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await r.json().catch(() => ({}));
    setFuMsg(action === "test" ? (d.sent ? `Test sent to ${d.to}` : d.error ?? "test failed") : `${d.status}: ${d.sent ?? 0} sent, ${d.dryRun ?? 0} dry-run, ${d.skipped ?? 0} skipped, ${d.failed ?? 0} failed`);
    loadFu();
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Customer journey &amp; funnel</h2>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-sm border border-stone-300 px-2 py-1 text-xs">
            {[7, 30, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        {aErr && <p className="mt-2 text-sm text-amber-700">{aErr}</p>}
        {s && (
          <>
            <p className="mt-1 text-xs text-stone-500">Visitors are anonymous browser ids (GPC/DNT/opted-out visitors aren't counted). Checkout and payment figures come from the verified payments ledger.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <Step label="Visitors" value={s.visitors} />
              <Step label="Saw pricing" value={s.pricing_visitors} of={s.visitors} />
              <Step label="Chose a plan" value={s.plan_selected} of={s.pricing_visitors} />
              <Step label="Checkout started" value={s.checkout_started} of={s.plan_selected} />
              <Step label="Paid (verified)" value={s.payments_succeeded} of={s.checkout_started} />
              <Step label="Abandoned" value={s.checkout_abandoned} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <Step label="Signups" value={s.signups} />
              <Step label="Logins" value={s.logins} />
              <Step label="Failed codes" value={s.login_failures} />
              <Step label="Finished intake" value={s.onboarding_completed} />
              <Step label="Activated (new users)" value={s.activated_users} of={s.signups} />
              <Step label="Revenue ₹" value={Math.round(Number(s.revenue_inr ?? 0))} />
            </div>
            <div className="mt-3 grid gap-3 text-xs text-stone-600 sm:grid-cols-3">
              <div><div className="font-semibold text-stone-800">Feature use</div>{Object.entries(s.features ?? {}).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}</div>
              <div><div className="font-semibold text-stone-800">Top pages</div>{(s.top_pages ?? []).map((p: any) => <div key={p.path}>{p.path}: {p.views}</div>)}</div>
              <div><div className="font-semibold text-stone-800">API &amp; integrations</div>
                <div>Active keys: {s.api_keys_active} · used: {s.api_active_keys_used}</div>
                <div>API requests: {s.api_requests}</div>
                <div>Webhooks: {s.webhook_deliveries?.delivered ?? 0} delivered / {s.webhook_deliveries?.failed ?? 0} failed</div>
                <div>Renewals: {s.renewals} · Cancellations: {s.cancellations}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Abandoned-checkout follow-up (email)</h2>
        {!fu ? <p className="mt-2 text-sm text-stone-500">Loading…</p> : fu.error ? <p className="mt-2 text-sm text-amber-700">{fu.error}</p> : (
          <>
            <p className="mt-1 text-xs text-stone-500">One reminder per unpaid order, only with a recorded checkout consent, never to unsubscribed addresses or anyone who has since paid; max one per email per 7 days. Runs daily with the cron. WhatsApp: {fu.whatsapp}.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={fu.config.enabled} onChange={(e) => saveFu({ enabled: e.target.checked })} className="accent-brand-600" /> Enabled</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={fu.config.dryRun} onChange={(e) => saveFu({ dryRun: e.target.checked })} className="accent-brand-600" /> Dry-run (record, don't send)</label>
              <label className="flex items-center gap-2">Wait
                <select value={fu.config.delayHours} onChange={(e) => saveFu({ delayHours: Number(e.target.value) })} className="rounded-sm border border-stone-300 px-1 py-0.5 text-xs">
                  {[1, 3, 6, 12, 24].map((h) => <option key={h} value={h}>{h}h</option>)}
                </select> after checkout</label>
              <button onClick={() => actFu("test")} className="rounded-lg border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700">Send test to me</button>
              <button onClick={() => actFu("run")} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white">Run now</button>
            </div>
            {fuMsg && <p className="mt-2 text-xs text-stone-700">{fuMsg}</p>}
            {fu.recent?.length > 0 && (
              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-stone-500"><tr><th>When</th><th>Email</th><th>Status</th><th>Reason</th></tr></thead>
                <tbody>{fu.recent.map((r: any) => <tr key={r.order_id} className="border-t border-stone-100"><td className="py-1">{new Date(r.created_at).toLocaleString("en-IN")}</td><td>{r.email}</td><td>{r.status}</td><td className="text-stone-500">{r.reason ?? ""}</td></tr>)}</tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">API keys — all accounts</h2>
        {!allKeys ? <p className="mt-2 text-sm text-stone-500">Loading…</p> : allKeys.length === 0 ? <p className="mt-2 text-sm text-stone-500">No keys issued yet.</p> : (
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-stone-500"><tr><th>Name</th><th>Kind</th><th>Owner</th><th>Status</th><th>Scopes</th><th>30-day calls</th><th /></tr></thead>
            <tbody>{allKeys.map((k) => (
              <tr key={k.id} className="border-t border-stone-100">
                <td className="py-1">{k.name} <code className="text-stone-400">{k.keyId}</code></td><td>{k.kind}</td><td>{k.owner ?? "—"}</td><td>{k.status}</td>
                <td className="text-stone-500">{k.scopes.join(", ")}</td><td>{k.requests30d}</td>
                <td>{k.status === "active" && <button onClick={async () => { if (window.confirm(`Revoke ${k.name}?`)) { await fetch(`/api/keys/${k.id}`, { method: "DELETE" }); loadKeys(); } }} className="font-semibold text-red-600 hover:underline">Revoke</button>}</td>
              </tr>))}</tbody>
          </table>
        )}
        <h3 className="mt-6 text-sm font-semibold">Service keys for other MNB products</h3>
        <p className="text-xs text-stone-500">Service keys can only compute, parse documents and read deadlines — never user data.</p>
        <div className="mt-2"><DevConsole service /></div>
      </div>
    </div>
  );
}
