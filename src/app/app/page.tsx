"use client";

/**
 * The TaxSense AI workspace (Sessions 3+4 UI):
 * left — conversational intake; right — live both-regime computation,
 * optimizer moves, and the filing-summary PDF download.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Planner from "./Planner";

type Msg = { role: "user" | "assistant"; content: string };

const OPENER =
  "Hi! I'm TaxSense AI — think of me as a CA who never makes you fill a form. Let's sort your FY 2025-26 taxes. To start: how do you earn — salary, freelancing/business, rent, stock sales, or a mix?";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function AppPage() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: OPENER }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [provider, setProvider] = useState<string>("");
  const [saved, setSaved] = useState<string>("");
  const [tab, setTab] = useState<"results" | "planner">("results");
  const importRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  // recompute whenever the profile changes meaningfully
  useEffect(() => {
    const p = state?.profile;
    if (!p) return;
    const hasIncome =
      p.salary?.grossSalary || p.business?.netIncome || p.capitalGains || p.houseProperties?.length || p.otherSources;
    if (!hasIncome) return;
    fetch("/api/compute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: p }),
    })
      .then((r) => r.json())
      .then((d) => !d.error && setResult(d))
      .catch(() => {});
  }, [state]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, state, history: messages.slice(-10) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setState(data.state);
      setProvider(data.provider);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Hmm, something went wrong on my side — try that again?" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!state?.profile) return;
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: state.profile, estimates: state.estimates }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taxsense-filing-summary.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveProfile() {
    if (!state?.profile) return;
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: state.profile, intakeState: state }),
    });
    const d = await res.json();
    setSaved(d.saved ? (d.mode === "demo" ? "Saved (demo mode — sign in to persist)" : "Saved to your account") : d.error);
  }

  function exportProfile() {
    if (!state) return;
    const blob = new Blob([JSON.stringify({ taxsense: 1, state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taxsense-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProfile(file: File) {
    file.text().then((t) => {
      try {
        const data = JSON.parse(t);
        if (data?.state?.profile) {
          setState(data.state);
          setMessages((m) => [
            ...m,
            { role: "assistant", content: "Profile imported — your computation is refreshed on the right. Anything to update?" },
          ]);
        }
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "That file didn't look like a TaxSense profile export." }]);
      }
    });
  }

  const cmp = result?.comparison;
  const opt = result?.optimizer;

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col px-4 py-4">
      <header className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-brand-700">
          TaxSense <span className="font-normal text-stone-400">AI</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          {provider && <span className="rounded bg-stone-100 px-2 py-1">intake: {provider}</span>}
          <Link href="/admin" className="hover:text-brand-700">Admin</Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Chat panel */}
        <section className="flex min-h-0 flex-col rounded-xl border border-stone-200 bg-white">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " +
                    (m.role === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-stone-100 text-stone-800")
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="px-2 text-sm text-stone-400">TaxSense is thinking…</div>}
            <div ref={bottom} />
          </div>
          <div className="border-t border-stone-200 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder='e.g. "I earn around 80k a month plus a bonus sometimes"'
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
              />
              <button
                onClick={send}
                disabled={busy}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </section>

        {/* Results panel */}
        <section className="min-h-0 overflow-y-auto rounded-xl border border-stone-200 bg-white p-5">
          {cmp && (
            <div className="mb-4 flex gap-1 rounded-lg bg-stone-100 p-1 text-sm font-medium">
              {(["results", "planner"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "flex-1 rounded-md py-1.5 capitalize " +
                    (tab === t ? "bg-white text-brand-700 shadow-sm" : "text-stone-500 hover:text-stone-700")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {cmp && tab === "planner" ? (
            <Planner profile={state?.profile} />
          ) : !cmp ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
              <div className="text-4xl">🧮</div>
              <p className="mt-3 max-w-xs text-sm">
                Your live tax computation appears here the moment I know enough about your income.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg bg-brand-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Recommendation</div>
                <div className="mt-1 text-xl font-bold text-brand-700">
                  {cmp.recommended === "new" ? "New" : "Old"} regime
                  {cmp.savings > 0 && <span className="font-medium text-stone-600"> — saves {inr(cmp.savings)}</span>}
                </div>
                {opt?.headline && <p className="mt-1 text-sm text-stone-600">{opt.headline}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["old", "new"] as const).map((k) => (
                  <div
                    key={k}
                    className={
                      "rounded-lg border p-4 " +
                      (cmp.recommended === k ? "border-brand-600 bg-brand-50/50" : "border-stone-200")
                    }
                  >
                    <div className="text-xs uppercase text-stone-500">{k} regime</div>
                    <div className="mt-1 text-2xl font-bold">{inr(cmp[k].totalTaxLiability)}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      on {inr(cmp[k].totalIncome)} · {cmp[k].effectiveRatePct}% effective
                    </div>
                  </div>
                ))}
              </div>

              {opt?.suggestions?.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold">Moves that lower your tax</div>
                  <ul className="space-y-2">
                    {opt.suggestions.slice(0, 4).map((s: any) => (
                      <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 p-3 text-sm">
                        <span>{s.label}</span>
                        <span className="whitespace-nowrap font-semibold text-brand-700">−{inr(s.taxSaved)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {state?.estimates?.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>Estimates to verify:</strong> {state.estimates.join(" · ")}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={downloadPdf}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Download filing summary (PDF)
                </button>
                <button
                  onClick={saveProfile}
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand-600"
                >
                  Save
                </button>
              </div>
              <div className="flex gap-3 text-xs text-stone-500">
                <button onClick={exportProfile} className="underline hover:text-brand-700">
                  Export profile (JSON)
                </button>
                <button onClick={() => importRef.current?.click()} className="underline hover:text-brand-700">
                  Import profile
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importProfile(e.target.files[0])}
                />
              </div>
              {saved && <p className="text-xs text-stone-500">{saved}</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
