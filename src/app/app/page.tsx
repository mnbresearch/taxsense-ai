"use client";

/**
 * The TaxSense AI workspace (Sessions 3+4 UI):
 * left — conversational intake; right — live both-regime computation,
 * optimizer moves, and the filing-summary PDF download.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Planner from "./Planner";
import { AccountControl, UpsellModal, useEntitlements } from "./Account";
import { HINDI_OPENER, quickChips, t, type Lang } from "@/lib/i18n";
import PdfHistory from "./PdfHistory";
import { SAMPLES } from "./samples";
import InstallApp from "../InstallApp";

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
  const [scenarios, setScenarios] = useState<any[]>([]);
  const ent = useEntitlements();
  const [upsell, setUpsell] = useState<string | null>(null);
  const scenarioCap = ent?.features.scenarios ?? 3;
  const [lang, setLang] = useState<Lang>("en");

  // Batch 29 — bilingual UI. Restore preference; swap the opener if the
  // conversation hasn't started yet.
  useEffect(() => {
    const saved = (localStorage.getItem("ts_lang") as Lang) ?? "en";
    if (saved === "hi") switchLang("hi", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Batch 31 — welcome back: offer to restore the saved profile.
  // Batch 38 — ?client=<label> loads a specific Client Workbook profile.
  const [savedRec, setSavedRec] = useState<any>(null);
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [profileLabel, setProfileLabel] = useState("My profile");
  useEffect(() => {
    const client = new URLSearchParams(window.location.search).get("client");
    if (client) {
      setProfileLabel(client);
      setRestoreDismissed(true);
      fetch(`/api/profile?label=${encodeURIComponent(client)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d?.record?.profile) return;
          const st = d.record.intake_state?.profile
            ? d.record.intake_state
            : { profile: d.record.profile, notApplicable: [], estimates: [], covered: [], complete: false };
          setState(st);
          setMessages((m) => [
            ...m,
            { role: "assistant", content: `Opened client "${client}" from your workbook. Update anything in conversation — Save writes it back to their row.` },
          ]);
        })
        .catch(() => {});
      return;
    }
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => d?.record?.profile && setSavedRec(d.record))
      .catch(() => {});
  }, []);

  function restoreSaved() {
    if (!savedRec) return;
    const st = savedRec.intake_state?.profile
      ? savedRec.intake_state
      : { profile: savedRec.profile, notApplicable: [], estimates: [], covered: [], complete: false };
    setState(st);
    setRestoreDismissed(true);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: "Welcome back! I've restored your saved profile — the computation on the right is live again. What's changed since last time?" },
    ]);
  }

  // Batch 32 — one-click sample profiles for an instant demo.
  function loadSample(id: string) {
    const smp = SAMPLES.find((x) => x.id === id);
    if (!smp) return;
    setState({ profile: JSON.parse(JSON.stringify(smp.profile)), notApplicable: [], estimates: ["Sample data — replace with your real numbers"], covered: [], complete: false });
    setMessages((m) => [...m, { role: "assistant", content: smp.message }]);
  }

  function switchLang(next: Lang, silent = false) {
    setLang(next);
    localStorage.setItem("ts_lang", next);
    setMessages((m) =>
      m.length <= 1 ? [{ role: "assistant", content: next === "hi" ? HINDI_OPENER : OPENER }] : m
    );
  }
  const importRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // Guide → chat handoff: /app?earns=business,professional tailors the opener.
  useEffect(() => {
    const earns = new URLSearchParams(window.location.search).get("earns");
    if (!earns) return;
    const parts = earns.split(",").filter(Boolean);
    if (parts.length === 0) return;
    const label = parts
      .map((p) => ({ salaried: "salary", business: "your business", professional: "freelancing/practice", rental: "rent", investor: "investments" } as any)[p] ?? p)
      .join(" + ");
    const opener = parts.includes("business")
      ? `Welcome from the Tax Guide! Since you run a business, let's start there: what was your total turnover this year, roughly? (If you're on the presumptive scheme, that's the only number I really need.)`
      : parts.includes("professional")
        ? `Welcome from the Tax Guide! For your freelance/professional work: what were your gross receipts this year, roughly?`
        : `Welcome from the Tax Guide! You mentioned earning from ${label}. Let's get the numbers — what's the biggest income first?`;
    setMessages([{ role: "assistant", content: opener }]);
  }, []);

  // one-shot client error telemetry (no PII, rate-limited server-side)
  useEffect(() => {
    let sent = false;
    const h = (e: ErrorEvent) => {
      if (sent) return;
      sent = true;
      fetch("/api/telemetry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "window.onerror", message: e.message }),
      }).catch(() => {});
    };
    window.addEventListener("error", h);
    return () => window.removeEventListener("error", h);
  }, []);

  function saveScenario() {
    if (!state?.profile || !cmp) return;
    if (scenarios.length >= scenarioCap) {
      setUpsell(`The free plan keeps ${scenarioCap} saved scenario — Pro lets you compare 3 side by side.`);
      return;
    }
    if (scenarios.length >= 3) return;
    const name = ["A", "B", "C"][scenarios.length];
    setScenarios([...scenarios, {
      name: `Scenario ${name}`,
      profile: JSON.parse(JSON.stringify(state.profile)),
      state: JSON.parse(JSON.stringify(state)),
      old: cmp.old.totalTaxLiability,
      new: cmp.new.totalTaxLiability,
      recommended: cmp.recommended,
    }]);
  }

  function loadScenario(s: any) {
    setState(s.state);
    setMessages((m) => [...m, { role: "assistant", content: `Loaded ${s.name} — the computation on the right reflects it now.` }]);
  }

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

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, state, history: messages.slice(-10), lang }),
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
    if (res.status === 402) {
      const d = await res.json().catch(() => ({}));
      setUpsell(d.error ?? "Free plan PDF limit reached for today — Pro removes the limit.");
      return;
    }
    if (!res.ok) {
      setSaved("PDF generation failed — try again.");
      return;
    }
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
      body: JSON.stringify({ profile: state.profile, intakeState: state, label: profileLabel }),
    });
    const d = await res.json();
    setSaved(d.saved ? (d.mode === "demo" ? "Saved (demo mode — sign in to persist)" : "Saved to your account") : d.error);
  }

  function shareResults() {
    if (!state?.profile) return;
    const json = JSON.stringify(state.profile);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `${window.location.origin}/s/${b64}`;
    navigator.clipboard?.writeText(url).then(
      () => setSaved("Share link copied — anyone with it sees a read-only summary."),
      () => setSaved(url)
    );
  }

  async function emailResults() {
    if (!state?.profile) return;
    const email = window.prompt("Send this snapshot to which email?");
    if (!email) return;
    try {
      const res = await fetch("/api/email-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, profile: state.profile }),
      });
      const d = await res.json();
      setSaved(res.ok ? d.message : d.error ?? "send failed");
    } catch {
      setSaved("send failed — try again");
    }
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
  const score = result?.score;

  function shareWhatsApp() {
    if (!state?.profile || !cmp) return;
    const json = JSON.stringify(state.profile);
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `${window.location.origin}/s/${b64}`;
    const text = `My tax under both regimes, computed by TaxSense AI 🧮\nOld: ${inr(cmp.old.totalTaxLiability)} · New: ${inr(cmp.new.totalTaxLiability)} → ${cmp.recommended} regime wins${cmp.savings > 0 ? ` (saves ${inr(cmp.savings)})` : ""}.\nSee the full breakdown: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  function pasteForm16() {
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content:
          "📄 Open your Form 16 PDF, select all the text (Ctrl/Cmd+A), copy it, and paste it straight into this chat. I'll read your salary, TDS, HRA and deductions out of it automatically — messy formatting is fine.",
      },
    ]);
  }

  const [fbSent, setFbSent] = useState(false);
  function sendFeedback(up: boolean) {
    setFbSent(true);
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: up ? "feedback_up" : "feedback_down" }),
    }).catch(() => {});
  }

  async function subscribeReminders() {
    const email = window.prompt("Email for deadline reminders (7 days & 1 day before every due date):");
    if (!email) return;
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      setSaved(res.ok ? d.message : d.error ?? "failed");
    } catch {
      setSaved("failed — try again");
    }
  }

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col px-4 py-4">
      <header className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-brand-700">
          TaxSense <span className="font-normal text-stone-400">AI</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
            {Math.max(0, Math.ceil((new Date("2026-07-31T23:59:59+05:30").getTime() - Date.now()) / 86400000))} {t("daysToFile", lang)}
          </span>
          <button
            onClick={() => switchLang(lang === "en" ? "hi" : "en")}
            className="rounded-full border border-stone-300 px-2.5 py-1 font-semibold text-stone-600 hover:border-brand-600 hover:text-brand-700"
            title={lang === "en" ? "हिंदी में देखें" : "Switch to English"}
          >
            {lang === "en" ? "हिंदी" : "EN"}
          </button>
          {provider && <span className="rounded bg-stone-100 px-2 py-1">intake: {provider}</span>}
          {profileLabel !== "My profile" && (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-stone-600" title="Saving under this client">🗂 {profileLabel}</span>
          )}
          <AccountControl ent={ent} />
          <Link href="/professional" className="font-semibold text-brand-700 hover:underline">For professionals</Link>
          <Link href="/guide" className="hover:text-brand-700">{t("taxGuide", lang)}</Link>
          <Link href="/admin" className="hover:text-brand-700">Admin</Link>
          <InstallApp compact />
        </div>
      </header>

      {savedRec && !restoreDismissed && !result && messages.length <= 1 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
          <span className="text-stone-700">
            👋 Welcome back — you have a saved profile
            {savedRec.updated_at && <span className="text-stone-500"> (updated {new Date(savedRec.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})</span>}.
          </span>
          <span className="flex gap-2">
            <button onClick={restoreSaved} className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Restore it</button>
            <button onClick={() => setRestoreDismissed(true)} className="rounded-md px-2 py-1.5 text-xs text-stone-500 hover:text-stone-700">Start fresh</button>
          </span>
        </div>
      )}
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
            {busy && <div className="px-2 text-sm text-stone-400">{t("thinking", lang)}</div>}
            <div ref={bottom} />
          </div>
          <div className="border-t border-stone-200 p-3">
            {messages.length <= 1 && !busy && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                <button
                  onClick={pasteForm16}
                  className="rounded-full border border-brand-600 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                >
                  {t("pasteForm16", lang)}
                </button>
                {quickChips(lang).map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:border-brand-600 hover:text-brand-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("placeholder", lang)}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
              />
              <button
                onClick={() => send()}
                disabled={busy}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {t("send", lang)}
              </button>
            </div>
          </div>
        </section>

        {/* Results panel */}
        <section className="min-h-0 overflow-y-auto rounded-xl border border-stone-200 bg-white p-5">
          {scenarios.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {scenarios.map((s) => (
                <button
                  key={s.name}
                  onClick={() => loadScenario(s)}
                  className="min-w-[150px] rounded-lg border border-stone-200 bg-stone-50 p-2 text-left hover:border-brand-600"
                  title="Click to load this scenario"
                >
                  <div className="text-[11px] font-semibold uppercase text-stone-500">{s.name}</div>
                  <div className="text-sm font-bold text-brand-700">
                    {inr(Math.min(s.old, s.new))}
                  </div>
                  <div className="text-[11px] text-stone-500">{s.recommended} regime</div>
                </button>
              ))}
            </div>
          )}
          {cmp && (
            <div className="mb-4 flex gap-1 rounded-lg bg-stone-100 p-1 text-sm font-medium">
              {(["results", "planner"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={
                    "flex-1 rounded-md py-1.5 capitalize " +
                    (tab === k ? "bg-white text-brand-700 shadow-sm" : "text-stone-500 hover:text-stone-700")
                  }
                >
                  {t(k, lang)}
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
                {t("emptyState", lang)}
              </p>
              <div className="mt-5 w-full max-w-xs space-y-2 text-left">
                <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-stone-400">or explore with a sample</p>
                {SAMPLES.map((smp) => (
                  <button
                    key={smp.id}
                    onClick={() => loadSample(smp.id)}
                    className="block w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left transition hover:border-brand-600 hover:bg-brand-50"
                  >
                    <span className="block text-sm font-semibold text-stone-700">▶ {smp.label}</span>
                    <span className="block text-[11px] text-stone-500">{smp.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg bg-brand-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("recommendation", lang)}</div>
                <div className="mt-1 text-xl font-bold text-brand-700">
                  {cmp.recommended === "new" ? "New" : "Old"} regime
                  {cmp.savings > 0 && <span className="font-medium text-stone-600"> — {t("saves", lang)} {inr(cmp.savings)}</span>}
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
                    <div className="text-xs uppercase text-stone-500">{t(k === "old" ? "oldRegime" : "newRegime", lang)}</div>
                    <div className="mt-1 text-2xl font-bold">{inr(cmp[k].totalTaxLiability)}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {t("on", lang)} {inr(cmp[k].totalIncome)} · {cmp[k].effectiveRatePct}% {t("effective", lang)}
                    </div>
                  </div>
                ))}
              </div>

              {state?.profile?.taxesPaid > 0 && (() => {
                const bal = cmp[cmp.recommended].totalTaxLiability - state.profile.taxesPaid;
                return (
                  <div className={"rounded-lg border p-3 text-sm font-semibold " + (bal <= 0 ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
                    {bal <= 0
                      ? `💰 Refund due: ${inr(-bal)} — you've already paid ${inr(state.profile.taxesPaid)} in TDS/advance tax.`
                      : `⚠️ Still payable: ${inr(bal)} after ${inr(state.profile.taxesPaid)} already paid — see the advance-tax calendar in Planner.`}
                  </div>
                );
              })()}

              {score && (
                <div className="rounded-lg border border-stone-200 p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-none">
                      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#e7e5e4" strokeWidth="8" />
                        <circle
                          cx="40" cy="40" r="34" fill="none"
                          stroke={score.score >= 70 ? "#0d5947" : score.score >= 40 ? "#d97706" : "#dc2626"}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${(score.score / 100) * 213.6} 213.6`}
                          style={{ transition: "stroke-dasharray 1s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold">{score.score}</span>
                        <span className="text-[10px] font-semibold text-stone-500">{score.grade}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{t("taxHealthScore", lang)}</div>
                      <p className="text-xs text-stone-600">{score.headline}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {score.dimensions.filter((x: any) => x.tip).slice(0, 3).map((x: any) => (
                      <div key={x.key} className="flex items-start gap-2 text-xs text-stone-600">
                        <span className="mt-0.5 flex-none rounded bg-stone-100 px-1.5 py-0.5 font-semibold text-stone-500">{x.earned}/{x.max}</span>
                        <span>{x.tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {opt?.suggestions?.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold">{t("movesTitle", lang)}</div>
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

              {result?.insights?.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold">{t("insightsTitle", lang)}</div>
                  <ul className="space-y-2">
                    {result.insights.map((ins: any) => (
                      <li key={ins.kind} className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
                        <div className="text-sm font-semibold text-brand-700">{ins.headline}</div>
                        <p className="mt-0.5 text-xs text-stone-600">{ins.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href="/pricing"
                className="block rounded-lg border border-brand-200 bg-gradient-to-r from-brand-50 to-emerald-50 p-3 text-sm transition hover:border-brand-600"
              >
                <span className="font-semibold text-brand-700">Want this working for you all year?</span>{" "}
                <span className="text-stone-600">
                  Pro (₹399/mo) adds unlimited PDFs, the CTC Designer and saved profiles — or let an expert file it for you.
                </span>{" "}
                <span className="font-semibold text-brand-700">See plans →</span>
              </Link>

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
                  {t("downloadPdf", lang)}
                </button>
                <button
                  onClick={saveProfile}
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand-600"
                >
                  {t("save", lang)}
                </button>
              </div>
              <div className="flex gap-3 text-xs text-stone-500">
                {scenarios.length < 3 && (
                  <button onClick={saveScenario} className="underline hover:text-brand-700">
                    Save as scenario ({scenarios.length}/{scenarioCap})
                  </button>
                )}
                <button onClick={shareResults} className="underline hover:text-brand-700">
                  Share results (link)
                </button>
                <button onClick={emailResults} className="underline hover:text-brand-700">
                  Email me my results
                </button>
                <button onClick={subscribeReminders} className="underline hover:text-brand-700">
                  🔔 Deadline reminders
                </button>
                <button onClick={shareWhatsApp} className="underline hover:text-brand-700">
                  Share on WhatsApp
                </button>
                <span className="ml-auto flex items-center gap-1.5">
                  {fbSent ? (
                    <span className="text-stone-400">Thanks for the feedback!</span>
                  ) : (
                    <>
                      <span className="text-stone-400">Helpful?</span>
                      <button onClick={() => sendFeedback(true)} className="hover:scale-110" title="Yes, helpful">👍</button>
                      <button onClick={() => sendFeedback(false)} className="hover:scale-110" title="Not really">👎</button>
                    </>
                  )}
                </span>
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
              <PdfHistory signedIn={!!ent?.signedIn} />
              {saved && <p className="text-xs text-stone-500">{saved}</p>}
            </div>
          )}
        </section>
      </div>
      <UpsellModal message={upsell} onClose={() => setUpsell(null)} />
    </main>
  );
}
