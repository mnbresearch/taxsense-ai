"use client";

/**
 * Batch 38 — Client Workbook (Business). The firm's client book: one row
 * per saved profile label, liability + regime at a glance, open-in-workspace
 * round trip. List access is enforced server-side (402 without Business).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { emptyProfile } from "@/lib/tax-engine";
import { useEntitlements } from "../../app/Account";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function Workbook() {
  const ent = useEntitlements();
  const [items, setItems] = useState<any[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "locked" | "anonymous">("loading");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/profile/list");
      if (res.status === 401) return setStatus("anonymous");
      if (res.status === 402) return setStatus("locked");
      const d = await res.json();
      setItems(d.items ?? []);
      setStatus("ok");
    } catch {
      setStatus("locked");
    }
  }
  useEffect(() => { load(); }, []);

  async function addClient() {
    const label = name.trim().slice(0, 60);
    if (!label || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: emptyProfile(), label }),
      });
      const d = await res.json();
      if (!res.ok) setMsg(d.error ?? "failed");
      else { setName(""); await load(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Client Workbook</h1>
        <p className="mt-2 text-sm text-stone-600">
          One row per client. Open any of them in the workspace, update through conversation, hit Save —
          the row refreshes with the new position.
        </p>
      </header>

      {status === "loading" && <p className="text-sm text-stone-400">Loading your client book…</p>}

      {status === "anonymous" && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          Sign in first — open the <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link> and
          use “Sign in” (top right) with your plan email.
        </div>
      )}

      {status === "locked" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-3xl">🔒</div>
          <p className="mt-2 text-sm font-semibold text-stone-800">The Client Workbook is a Business feature</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-stone-600">
            Unlimited client profiles, per-client regime calls and liabilities, and the full workspace round trip —
            built for practitioners running a book, not a single return.
          </p>
          <Link href="/pricing" className="mt-3 inline-block rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Get Business — ₹999/mo
          </Link>
        </div>
      )}

      {status === "ok" && (
        <>
          <div className="mb-5 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addClient()}
              placeholder="New client name (e.g. Sharma, Rakesh — ITR-1)"
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
            />
            <button onClick={addClient} disabled={busy || !name.trim()}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {busy ? "Adding…" : "+ Add client"}
            </button>
          </div>
          {msg && <p className="mb-3 text-xs text-red-600">{msg}</p>}

          {items && items.length === 0 && (
            <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              No clients yet — add the first one above.
            </p>
          )}

          {items && items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left text-xs text-stone-500">
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="font-medium">Regime</th>
                    <th className="text-right font-medium">Income</th>
                    <th className="text-right font-medium">Liability</th>
                    <th className="text-right font-medium">Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.label} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-2.5 font-semibold text-stone-700">{c.label}</td>
                      <td>
                        {c.recommended
                          ? <span className={"rounded px-1.5 py-0.5 text-[11px] font-bold " + (c.recommended === "new" ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-600")}>{c.recommended}</span>
                          : <span className="text-xs text-stone-400">—</span>}
                      </td>
                      <td className="text-right text-stone-600">{c.income != null ? inr(c.income) : "—"}</td>
                      <td className="text-right font-semibold text-stone-800">{c.tax != null ? inr(c.tax) : "—"}</td>
                      <td className="text-right text-xs text-stone-400">
                        {new Date(c.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td className="pr-4 text-right">
                        <Link href={`/app?client=${encodeURIComponent(c.label)}`} className="text-xs font-semibold text-brand-700 underline hover:no-underline">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-stone-400">
            {items?.length ?? 0} client{(items?.length ?? 0) === 1 ? "" : "s"} · profiles live in your account, protected by row-level security — no one else can read them.
          </p>
        </>
      )}
    </main>
  );
}
