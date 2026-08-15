"use client";

/**
 * Batch 76 — the Filing Kit page: what a CA hands you before filing.
 * Loads your saved profile (or a sample), runs the engine via /api/compute,
 * and renders ITR pick + scrutiny radar + document checklist + walkthrough.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { buildFilingKit, type FilingKit as Kit, type FlagSeverity } from "@/lib/filing";

const inr = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");

const SAMPLE = {
  age: 31, residentialStatus: "resident",
  salary: { grossSalary: 1_800_000, basicPlusDA: 900_000, hraReceived: 300_000, rentPaid: 264_000, isMetroCity: true, employerNpsContribution: 0, professionalTax: 2_400 },
  houseProperties: [], capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 90_000, ltcgOther: 0 },
  otherSources: { savingsInterest: 9_000, fdInterest: 32_000, dividends: 6_000, familyPension: 0, other: 0 },
  deductions: { section80C: 150_000, section80CCD1B: 50_000, section80D_selfFamily: 25_000, section80D_parents: 0, parentsAreSenior: false, section80E: 0, section80G: 0 },
  taxesPaid: 210_000,
};

const SEV: Record<FlagSeverity, { label: string; cls: string }> = {
  high: { label: "Fix now", cls: "bg-red-100 text-red-800" },
  medium: { label: "Check", cls: "bg-amber-100 text-amber-800" },
  info: { label: "Good to know", cls: "bg-stone-100 text-stone-600" },
};

export default function FilingKit() {
  const [profile, setProfile] = useState<any>(null);
  const [source, setSource] = useState<"saved" | "sample" | "none">("none");
  const [result, setResult] = useState<any>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.record?.profile) { setProfile(d.record.profile); setSource("saved"); }
      })
      .catch(() => {});
    try { setDone(JSON.parse(localStorage.getItem("ts_filing_done") ?? "{}")); } catch {}
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetch("/api/compute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.comparison || !d.itr) return;
        setResult(d);
        setKit(buildFilingKit(profile, d.comparison, d.itr));
      })
      .catch(() => {});
  }, [profile]);

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try { localStorage.setItem("ts_filing_done", JSON.stringify(next)); } catch {}
  }

  const best = result?.comparison?.[result.comparison.recommended];
  const totalDocs = kit?.documents.reduce((n, g) => n + g.items.length, 0) ?? 0;
  const doneDocs = kit?.documents.reduce((n, g) => n + g.items.filter((i) => done[i.label]).length, 0) ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-800">📋 Your ITR Filing Kit — FY 2025-26</h1>
      <p className="mt-1 text-sm text-stone-600">
        What a CA hands you before filing: the right form, the exact papers, the red flags, the walkthrough.
      </p>

      {!profile && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-sm">
          <p className="font-semibold text-stone-700">The kit is built from your tax profile.</p>
          <p className="mt-1 text-stone-600">Answer a few questions in the workspace (2–3 minutes, conversational) and this page fills itself in.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Build my profile →</Link>
            <button onClick={() => { setProfile(SAMPLE); setSource("sample"); }} className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 hover:border-brand-600">
              Preview with a sample
            </button>
          </div>
        </div>
      )}

      {source === "sample" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sample profile (₹18L salaried, metro rent, some LTCG). <Link href="/app" className="font-semibold underline">Build yours</Link> for a real kit.
        </p>
      )}

      {kit && result && best && (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-brand-200 bg-brand-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Your form</div>
            <div className="mt-1 text-2xl font-bold text-brand-700">{result.itr.form} <span className="text-base font-medium text-stone-600">({result.itr.formName})</span></div>
            <ul className="mt-2 space-y-1 text-sm text-stone-700">
              {result.itr.reasons.map((r: string) => <li key={r}>• {r}</li>)}
            </ul>
            <p className="mt-3 text-sm text-stone-600">
              {result.comparison.recommended === "new" ? "New" : "Old"} regime · tax {inr(best.totalTaxLiability)} ·{" "}
              {best.netPayable > 0 ? <>balance payable <strong>{inr(best.netPayable)}</strong></> : <>refund due <strong className="text-brand-700">{inr(best.netPayable)}</strong></>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800">🚨 Scrutiny radar — {kit.redFlags.length} {kit.redFlags.length === 1 ? "flag" : "flags"}</h2>
            <div className="mt-3 space-y-2.5">
              {kit.redFlags.map((f) => (
                <div key={f.title} className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-800">{f.title}</span>
                    <span className={"whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold " + SEV[f.severity].cls}>{SEV[f.severity].label}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">{f.detail}</p>
                  <p className="mt-1.5 text-xs font-semibold text-brand-700">→ {f.fix}</p>
                </div>
              ))}
              {kit.redFlags.length === 0 && <p className="text-sm text-stone-500">Clean — nothing on the radar for this profile.</p>}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800">🗂 Documents — {doneDocs}/{totalDocs} ready</h2>
            <div className="mt-3 space-y-3">
              {kit.documents.map((g) => (
                <div key={g.group} className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="text-sm font-bold text-stone-700">{g.icon} {g.group}</div>
                  <ul className="mt-2 space-y-2">
                    {g.items.map((i) => (
                      <li key={i.label} className="flex items-start gap-2.5">
                        <input type="checkbox" checked={!!done[i.label]} onChange={() => toggle(i.label)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                        <span className="text-sm">
                          <span className={done[i.label] ? "text-stone-400 line-through" : "font-medium text-stone-800"}>{i.label}</span>
                          <span className="block text-xs text-stone-500">{i.why}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800">🧭 Filing walkthrough</h2>
            <ol className="mt-3 space-y-2.5">
              {kit.steps.map((s, i) => (
                <li key={s.title} className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="text-sm font-semibold text-stone-800"><span className="mr-1.5 text-brand-700">{i + 1}.</span>{s.title}</div>
                  <p className="mt-1 text-xs text-stone-600">{s.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <strong className="text-stone-800">Update anything in conversation.</strong> Numbers changed? Head back to the{" "}
            <Link href="/app" className="font-semibold text-brand-700 underline">workspace</Link>, tell TaxSense what's new, hit Save — this kit rebuilds itself.
            <span className="block pt-2 text-xs text-stone-500">TaxSense prepares and optimises; filing remains your (or your CA's) call. Engine-computed, section-cited, 160+ automated checks.</span>
          </section>
        </div>
      )}
    </main>
  );
}
