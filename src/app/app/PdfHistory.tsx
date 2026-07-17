"use client";

/** Batch 30 — past filing summaries for signed-in users, re-downloadable. */
import { useState } from "react";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function PdfHistory({ signedIn }: { signedIn: boolean }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    if (items !== null || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pdf/history");
      const d = await res.json();
      setItems(d.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  async function redownload(item: any) {
    setMsg("Regenerating…");
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: item.profile, estimates: item.estimates ?? undefined }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setMsg(e.error ?? "Failed — try again.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taxsense-filing-summary.pdf";
    a.click();
    URL.revokeObjectURL(url);
    setMsg("");
  }

  if (!signedIn) return null;

  return (
    <details className="rounded-lg border border-stone-200 p-3" onToggle={(e) => (e.target as HTMLDetailsElement).open && load()}>
      <summary className="cursor-pointer text-xs font-semibold text-stone-600 hover:text-brand-700">
        🗂 My past filing summaries
      </summary>
      {busy && <p className="mt-2 text-xs text-stone-400">Loading…</p>}
      {items?.length === 0 && !busy && (
        <p className="mt-2 text-xs text-stone-500">Nothing yet — every PDF you generate while signed in is saved here.</p>
      )}
      {items && items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 rounded-md bg-stone-50 px-2.5 py-1.5 text-xs">
              <span className="text-stone-600">
                {new Date(it.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                {it.total_tax != null && <> · <span className="font-semibold">{inr(Number(it.total_tax))}</span></>}
                {it.regime && <span className="text-stone-400"> · {it.regime} regime</span>}
              </span>
              <button onClick={() => redownload(it)} className="font-semibold text-brand-700 underline hover:no-underline">
                Download again
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-1.5 text-[11px] text-stone-500">{msg}</p>}
    </details>
  );
}
