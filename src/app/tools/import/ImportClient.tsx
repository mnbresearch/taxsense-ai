"use client";
import { useState } from "react";

type Field = { path: string; label: string; value: number; evidence: string };
type Result = { kind: string; fields: Field[]; notes: string[]; recognised: boolean; error?: string };

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function ImportClient() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"auto" | "form16" | "ais">("auto");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  async function parse() {
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/import-doc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, kind: kind === "auto" ? undefined : kind }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "could not read that"); return; }
      if (!d.recognised) { setErr(d.error ?? "not recognised"); return; }
      setRes(d);
      setPicked(Object.fromEntries((d.fields as Field[]).map((f) => [f.path, true])));
    } catch { setErr("network error — try again"); }
    finally { setBusy(false); }
  }

  const chosen = res ? res.fields.filter((f) => picked[f.path]) : [];
  const copyForChat = () => {
    const lines = chosen.map((f) => `${f.label}: ${inr(f.value)}`).join("\n");
    navigator.clipboard?.writeText(lines);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <a href="/tools" className="text-sm text-emerald-800 hover:underline">← All tools</a>
      <h1 className="mt-3 text-2xl font-bold text-stone-900">Form 16 &amp; AIS import</h1>
      <p className="mt-2 text-stone-600 text-sm leading-relaxed">
        Stop typing your numbers. Paste the text of your <strong>Form 16 (Part B)</strong> or your{" "}
        <strong>AIS / TIS summary</strong> below — TaxSense reads the amounts for you. Everything is parsed
        on the fly, nothing is stored, and <strong>you review every figure</strong> before using it.
      </p>

      <div className="mt-5 flex gap-2 text-sm">
        {(["auto", "form16", "ais"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1 border ${kind === k ? "bg-emerald-800 text-white border-emerald-800" : "bg-white text-stone-700 border-stone-300"}`}>
            {k === "auto" ? "Auto-detect" : k === "form16" ? "Form 16" : "AIS / TIS"}
          </button>
        ))}
      </div>

      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Open your Form 16 or AIS PDF, select the Part B / summary section, copy, and paste it here…"
        className="mt-3 w-full h-56 rounded-lg border border-stone-300 p-3 font-mono text-xs"
      />
      <button onClick={parse} disabled={busy || !text.trim()}
        className="mt-3 rounded-lg bg-emerald-800 px-5 py-2.5 text-white font-semibold text-sm disabled:opacity-50">
        {busy ? "Reading…" : "Read my document"}
      </button>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {res && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">
            Found {res.fields.length} figure{res.fields.length === 1 ? "" : "s"} — review before using
          </h2>
          <p className="text-xs text-stone-500 mt-1">Untick anything that looks wrong. We only ever fill what you keep ticked.</p>
          <div className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
            {res.fields.map((f) => (
              <label key={f.path} className="flex items-start gap-3 p-3 cursor-pointer">
                <input type="checkbox" checked={!!picked[f.path]} onChange={(e) => setPicked({ ...picked, [f.path]: e.target.checked })} className="mt-1" />
                <span className="flex-1">
                  <span className="flex justify-between">
                    <span className="font-medium text-stone-800 text-sm">{f.label}</span>
                    <span className="font-bold text-emerald-800">{inr(f.value)}</span>
                  </span>
                  <span className="block text-[11px] text-stone-400 mt-0.5 font-mono truncate">from: {f.evidence}</span>
                </span>
              </label>
            ))}
          </div>

          {res.notes.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              {res.notes.map((n, i) => <p key={i}>• {n}</p>)}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={copyForChat} className="rounded-lg border border-emerald-800 text-emerald-800 px-4 py-2 text-sm font-semibold">
              Copy the ticked figures
            </button>
            <a href="/app" className="rounded-lg bg-emerald-800 text-white px-4 py-2 text-sm font-semibold">
              Open the workspace → paste &amp; continue
            </a>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Tip: paste the copied figures into the workspace chat — the assistant folds them straight into your return,
            then computes both regimes and produces your ITR filing sheet.
          </p>
        </div>
      )}
    </main>
  );
}
