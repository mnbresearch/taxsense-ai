"use client";

/** Developer console: API keys (create / rotate / revoke) and webhook endpoints. */
import { useCallback, useEffect, useState } from "react";

type Key = { id: string; key_id: string; kind: string; name: string; scopes: string[]; created_at: string; expires_at: string; revoked_at: string | null; last_used_at: string | null; status: string; requests30d: number };
type Hook = { id: string; url: string; events: string[]; active: boolean; createdAt: string };

const SCOPES: Record<string, string> = {
  compute: "Compute tax (both regimes)",
  "documents:parse": "Parse Form 16 / AIS text",
  "deadlines:read": "Read deadline calendar",
  "profiles:read": "Read your saved profiles",
  "profiles:write": "Create / update / delete profiles",
  "webhooks:manage": "Manage webhook endpoints",
};
const SERVICE_OK = ["compute", "documents:parse", "deadlines:read"];
const EVENTS = ["profile.saved", "profile.deleted", "plan.activated"];
const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const input = "rounded-lg border border-stone-300 px-3 py-2 text-sm outline-hidden focus:border-brand-600";

function SecretBox({ label, value, onDone }: { label: string; value: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">{label} — copy it now. It will not be shown again.</p>
      <code className="mt-2 block break-all rounded-sm bg-white p-2 text-xs text-stone-800">{value}</code>
      <div className="mt-2 flex gap-2">
        <button onClick={() => { navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {}); }} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">{copied ? "Copied ✓" : "Copy"}</button>
        <button onClick={onDone} className="rounded-lg border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-800">I've stored it safely</button>
      </div>
    </div>
  );
}

export default function DevConsole({ service = false }: { service?: boolean }) {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [authErr, setAuthErr] = useState("");
  const [msg, setMsg] = useState("");
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);
  const [name, setName] = useState("");
  const [days, setDays] = useState(90);
  const [scopes, setScopes] = useState<string[]>(["compute", "deadlines:read"]);
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["profile.saved"]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/keys${service ? "?service=1" : ""}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setAuthErr(d.error ?? "Could not load keys."); setKeys([]); return; }
      setAuthErr(""); setKeys(d.keys ?? []);
    }).catch(() => setAuthErr("Could not load keys."));
    if (!service) fetch("/api/webhooks").then((r) => r.json()).then((d) => d.endpoints && setHooks(d.endpoints)).catch(() => {});
  }, [service]);
  useEffect(() => { load(); }, [load]);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error ?? "Request failed."); return null; }
      return d;
    } catch { setMsg("Network error — try again."); return null; }
    finally { setBusy(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const d = await call("/api/keys", "POST", { name, scopes, expiresInDays: days, kind: service ? "service" : "user" });
    if (d) { setSecret({ label: `API key "${d.key.name}"`, value: d.secret }); setName(""); load(); }
  }
  async function rotate(k: Key) {
    const h = window.prompt(`Rotate "${k.name}".\nHours the OLD key keeps working (0 = stop now, max 24):`, "0");
    if (h === null) return;
    const d = await call(`/api/keys/${k.id}/rotate`, "POST", { overlapHours: Number(h) });
    if (d) { setSecret({ label: `New secret for "${k.name}" (old key retires ${new Date(d.oldKeyRetiresAt).toLocaleString("en-IN")})`, value: d.secret }); load(); }
  }
  async function revoke(k: Key) {
    if (!window.confirm(`Revoke "${k.name}" now? Anything using it will stop working immediately.`)) return;
    if (await call(`/api/keys/${k.id}`, "DELETE")) load();
  }
  async function addHook(e: React.FormEvent) {
    e.preventDefault();
    const d = await call("/api/webhooks", "POST", { url: hookUrl, events: hookEvents });
    if (d) { setSecret({ label: "Webhook signing secret", value: d.signingSecret }); setHookUrl(""); load(); }
  }
  async function testHook(h: Hook) {
    const d = await call(`/api/webhooks/${h.id}/test`, "POST");
    if (d) setMsg(d.outcome === "delivered" ? `✓ Test event delivered (HTTP ${d.httpStatus}).` : `✗ Test failed: ${d.error ?? `HTTP ${d.httpStatus}`}`);
  }
  async function rotateHook(h: Hook) {
    if (!window.confirm("Issue a new signing secret? The old one stops verifying immediately.")) return;
    const d = await call(`/api/webhooks/${h.id}/rotate`, "POST");
    if (d) setSecret({ label: "New webhook signing secret", value: d.signingSecret });
  }
  async function delHook(h: Hook) {
    if (!window.confirm(`Delete the endpoint ${h.url}?`)) return;
    if (await call(`/api/webhooks/${h.id}`, "DELETE")) load();
  }

  if (keys === null) return <p className="text-sm text-stone-500">Loading…</p>;
  if (authErr) return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
      {authErr} <a href="/app" className="font-semibold text-brand-700 underline">Sign in from the workspace</a>, then come back here.
    </div>
  );
  const allowed = service ? SERVICE_OK : Object.keys(SCOPES);

  return (
    <div className="space-y-6">
      {secret && <SecretBox label={secret.label} value={secret.value} onDone={() => setSecret(null)} />}
      {msg && <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">{msg}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="font-semibold">{service ? "Service keys (MNB products)" : "Your API keys"}</h3>
        {keys.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No keys yet — create one below.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-stone-500"><tr><th className="py-1">Name</th><th>Key</th><th>Scopes</th><th>Status</th><th>Expires</th><th>Last used</th><th>30-day calls</th><th /></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-stone-100">
                    <td className="py-2 font-medium">{k.name}</td>
                    <td><code>tsk_{k.key_id}_…</code></td>
                    <td className="max-w-[200px] text-stone-600">{k.scopes.join(", ")}</td>
                    <td><span className={k.status === "active" ? "rounded-sm bg-green-50 px-1.5 py-0.5 font-semibold text-green-700" : "rounded-sm bg-stone-100 px-1.5 py-0.5 text-stone-500"}>{k.status}{k.status === "active" && k.revoked_at ? " (retiring)" : ""}</span></td>
                    <td>{fmt(k.expires_at)}</td>
                    <td>{fmt(k.last_used_at)}</td>
                    <td>{k.requests30d}</td>
                    <td className="whitespace-nowrap text-right">
                      {k.status === "active" && !k.revoked_at && <button disabled={busy} onClick={() => rotate(k)} className="mr-2 font-semibold text-brand-700 hover:underline">Rotate</button>}
                      {k.status === "active" && <button disabled={busy} onClick={() => revoke(k)} className="font-semibold text-red-600 hover:underline">Revoke</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={create} className="mt-5 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">Name
            <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payroll integration" className={`mt-1 w-full ${input}`} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Expires in
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`mt-1 w-full ${input}`}>
              {[7, 30, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-semibold text-stone-600">Scopes (grant only what you need)</legend>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {allowed.map((s) => (
                <label key={s} className="flex items-center gap-2 text-xs text-stone-700">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))} className="accent-brand-600" />
                  <code>{s}</code> <span className="text-stone-500">— {SCOPES[s]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button disabled={busy || !name.trim() || !scopes.some((s) => allowed.includes(s))} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:col-span-2 sm:justify-self-start">
            Create key
          </button>
        </form>
      </section>

      {!service && (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="font-semibold">Webhook endpoints</h3>
          <p className="mt-1 text-xs text-stone-500">HTTPS only. Every request is signed — verify <code>TaxSense-Signature</code> (see docs above).</p>
          {hooks.length > 0 && (
            <ul className="mt-3 space-y-2 text-xs">
              {hooks.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 p-2">
                  <span><code className="break-all">{h.url}</code> <span className="text-stone-500">· {h.events.join(", ")}</span></span>
                  <span className="whitespace-nowrap">
                    <button disabled={busy} onClick={() => testHook(h)} className="mr-2 font-semibold text-brand-700 hover:underline">Send test</button>
                    <button disabled={busy} onClick={() => rotateHook(h)} className="mr-2 font-semibold text-brand-700 hover:underline">New secret</button>
                    <button disabled={busy} onClick={() => delHook(h)} className="font-semibold text-red-600 hover:underline">Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addHook} className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4">
            <input required type="url" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://example.org/taxsense-webhook" className={input} />
            <div className="flex flex-wrap gap-3">
              {EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={hookEvents.includes(ev)} onChange={(e) => setHookEvents(e.target.checked ? [...hookEvents, ev] : hookEvents.filter((x) => x !== ev))} className="accent-brand-600" /> <code>{ev}</code>
                </label>
              ))}
            </div>
            <button disabled={busy || !hookUrl || !hookEvents.length} className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Add endpoint</button>
          </form>
        </section>
      )}
    </div>
  );
}
