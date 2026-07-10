"use client";

/**
 * Tax Guide wizard (feature batch 6) — knowledge-first, tap-through.
 * One question per screen, big buttons, zero typing, deterministic report.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { buildGuide, type EarnType, type GuideAnswers } from "@/lib/guide";

type StepId = "earns" | "entity" | "turnover" | "receipts" | "digital" | "goods" | "assets" | "income" | "report";

const EARN_OPTS: { v: EarnType; label: string; sub: string }[] = [
  { v: "salaried", label: "Salaried", sub: "I get a salary from an employer" },
  { v: "business", label: "Business owner", sub: "Shop, trading, manufacturing, e-commerce…" },
  { v: "professional", label: "Freelancer / Professional", sub: "Consulting, design, dev, doctor, lawyer, CA…" },
  { v: "rental", label: "Rental income", sub: "I earn rent from property" },
  { v: "investor", label: "Investor", sub: "Stocks, mutual funds, FDs, dividends" },
];

export default function GuidePage() {
  const [a, setA] = useState<GuideAnswers>({ earns: [] });
  const [step, setStep] = useState<StepId>("earns");
  const [history, setHistory] = useState<StepId[]>([]);

  const flow: StepId[] = useMemo(() => {
    const f: StepId[] = ["earns"];
    if (a.earns.includes("business") || a.earns.includes("professional")) f.push("entity");
    if (a.earns.includes("business")) f.push("turnover");
    if (a.earns.includes("professional")) f.push("receipts");
    if (a.earns.includes("business") || a.earns.includes("professional")) f.push("digital", "goods");
    f.push("assets", "income", "report");
    return f;
  }, [a.earns]);

  function go(next: Partial<GuideAnswers>) {
    const merged = { ...a, ...next };
    setA(merged);
    const idx = flow.indexOf(step);
    setHistory([...history, step]);
    setStep(flow[Math.min(idx + 1, flow.length - 1)]);
  }
  function back() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(history.slice(0, -1));
    setStep(prev);
  }

  const progress = Math.round(((flow.indexOf(step) + 1) / flow.length) * 100);
  const report = step === "report" ? buildGuide(a) : null;

  // product telemetry: one event per completed guide (no answers sent)
  const firedRef = useState({ fired: false })[0];
  if (report && !firedRef.fired) {
    firedRef.fired = true;
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "guide_complete", message: a.earns.join(",") }),
    }).catch(() => {});
  }

  const Opt = ({ onClick, label, sub, active = false }: any) => (
    <button
      onClick={onClick}
      className={
        "w-full rounded-xl border-2 p-4 text-left transition hover:border-brand-600 " +
        (active ? "border-brand-600 bg-brand-50" : "border-stone-200 bg-white")
      }
    >
      <div className="font-semibold">{label}</div>
      {sub && <div className="mt-0.5 text-sm text-stone-500">{sub}</div>}
    </button>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-brand-700">
          TaxSense <span className="font-normal text-stone-400">AI</span>
        </Link>
        <span className="text-xs text-stone-500">Tax Guide · FY 2025-26</span>
      </header>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {step === "earns" && (
        <section>
          <h1 className="text-2xl font-bold">How do you earn?</h1>
          <p className="mt-1 text-sm text-stone-500">Pick everything that applies — this shapes every rule that follows.</p>
          <div className="mt-5 space-y-3">
            {EARN_OPTS.map((o) => (
              <Opt
                key={o.v}
                label={o.label}
                sub={o.sub}
                active={a.earns.includes(o.v)}
                onClick={() =>
                  setA({ ...a, earns: a.earns.includes(o.v) ? a.earns.filter((x) => x !== o.v) : [...a.earns, o.v] })
                }
              />
            ))}
          </div>
          <button
            disabled={a.earns.length === 0}
            onClick={() => go({})}
            className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            Continue →
          </button>
        </section>
      )}

      {step === "entity" && (
        <section>
          <h1 className="text-2xl font-bold">How is the business/practice set up?</h1>
          <p className="mt-1 text-sm text-stone-500">Entity type decides whether the presumptive shortcuts are even on the table.</p>
          <div className="mt-5 space-y-3">
            <Opt label="Just me (proprietorship)" sub="Income lands in my personal return" onClick={() => go({ entity: "individual" })} />
            <Opt label="Partnership firm" sub="Traditional partnership (not LLP)" onClick={() => go({ entity: "partnership" })} />
            <Opt label="LLP" sub="Limited liability partnership" onClick={() => go({ entity: "llp" })} />
            <Opt label="Private limited company" sub="Separate legal entity" onClick={() => go({ entity: "company" })} />
          </div>
        </section>
      )}

      {step === "turnover" && (
        <section>
          <h1 className="text-2xl font-bold">Business turnover this year?</h1>
          <p className="mt-1 text-sm text-stone-500">The ₹2cr / ₹3cr / ₹10cr lines each change your obligations.</p>
          <div className="mt-5 space-y-3">
            <Opt label="Up to ₹2 crore" onClick={() => go({ turnoverBand: "upto2cr" })} />
            <Opt label="₹2 – 3 crore" onClick={() => go({ turnoverBand: "2to3cr" })} />
            <Opt label="₹3 – 10 crore" onClick={() => go({ turnoverBand: "3to10cr" })} />
            <Opt label="Above ₹10 crore" onClick={() => go({ turnoverBand: "above10cr" })} />
          </div>
        </section>
      )}

      {step === "receipts" && (
        <section>
          <h1 className="text-2xl font-bold">Professional gross receipts this year?</h1>
          <p className="mt-1 text-sm text-stone-500">₹50L is the classic 44ADA line; ₹75L if you're almost fully digital.</p>
          <div className="mt-5 space-y-3">
            <Opt label="Up to ₹50 lakh" onClick={() => go({ receiptsBand: "upto50L" })} />
            <Opt label="₹50 – 75 lakh" onClick={() => go({ receiptsBand: "50to75L" })} />
            <Opt label="Above ₹75 lakh" onClick={() => go({ receiptsBand: "above75L" })} />
          </div>
        </section>
      )}

      {step === "digital" && (
        <section>
          <h1 className="text-2xl font-bold">Are ≥95% of your receipts digital?</h1>
          <p className="mt-1 text-sm text-stone-500">Bank transfer, UPI, cards, cheques — cash below 5% unlocks the enhanced limits and can kill the audit requirement.</p>
          <div className="mt-5 space-y-3">
            <Opt label="Yes — almost everything is digital" onClick={() => go({ mostlyDigital: true })} />
            <Opt label="No — meaningful cash component" onClick={() => go({ mostlyDigital: false })} />
          </div>
        </section>
      )}

      {step === "goods" && (
        <section>
          <h1 className="text-2xl font-bold">Do you mainly sell goods or services?</h1>
          <p className="mt-1 text-sm text-stone-500">GST registration thresholds differ: ₹40L for goods, ₹20L for services (most states).</p>
          <div className="mt-5 space-y-3">
            <Opt label="Goods / products" onClick={() => go({ sellsGoods: true })} />
            <Opt label="Services" onClick={() => go({ sellsGoods: false })} />
          </div>
        </section>
      )}

      {step === "assets" && (
        <section>
          <h1 className="text-2xl font-bold">Did you sell any shares, mutual funds, property or gold this year?</h1>
          <div className="mt-5 space-y-3">
            <Opt label="Yes" onClick={() => go({ soldAssets: true })} />
            <Opt label="No" onClick={() => go({ soldAssets: false })} />
          </div>
        </section>
      )}

      {step === "income" && (
        <section>
          <h1 className="text-2xl font-bold">Roughly, your total annual income?</h1>
          <p className="mt-1 text-sm text-stone-500">Just the band — it changes the regime story and the ITR form.</p>
          <div className="mt-5 space-y-3">
            <Opt label="Up to ₹12 lakh" sub="The new-regime zero-tax zone" onClick={() => go({ incomeBand: "upto12L" })} />
            <Opt label="₹12 – 50 lakh" onClick={() => go({ incomeBand: "12to50L" })} />
            <Opt label="Above ₹50 lakh" sub="Surcharge & disclosure territory" onClick={() => go({ incomeBand: "above50L" })} />
          </div>
        </section>
      )}

      {report && (
        <section>
          <div className="rounded-xl bg-brand-600 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-100">Your filing brief</div>
            <p className="mt-1 text-lg font-semibold leading-snug">{report.headline}</p>
            <div className="mt-3 inline-block rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold">
              File: {report.itrForm}
            </div>
          </div>

          {report.sections.map((s) => (
            <div
              key={s.title}
              className={
                "mt-4 rounded-xl border p-4 " +
                (s.tone === "good"
                  ? "border-green-200 bg-green-50"
                  : s.tone === "warn"
                    ? "border-amber-200 bg-amber-50"
                    : "border-stone-200 bg-white")
              }
            >
              <h3 className="font-semibold">{s.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {s.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-700">
                    <span className="mt-0.5 text-brand-600">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="font-semibold">Documents to gather</h3>
            <ul className="mt-2 space-y-1 text-sm text-stone-700">
              {report.documents.map((d) => (
                <li key={d}>☐ {d}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="font-semibold">Your deadlines</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {report.deadlines.map((d) => (
                <li key={d.what} className="flex justify-between gap-4">
                  <span className="font-semibold text-brand-700">{d.date}</span>
                  <span className="text-right text-stone-600">{d.what}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/app?earns=${a.earns.join(",")}`}
              className="flex-1 rounded-xl bg-brand-600 py-3 text-center font-semibold text-white hover:bg-brand-700"
            >
              Now compute my actual numbers →
            </Link>
            <button onClick={() => window.print()} className="rounded-xl border border-stone-300 px-5 font-semibold text-stone-700 hover:border-brand-600">
              Print
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-stone-400">
            Educational guidance under the Income-tax Act, 1961 (FY 2025-26) — not a substitute for professional advice.
          </p>
        </section>
      )}

      {step !== "earns" && step !== "report" && (
        <button onClick={back} className="mt-5 text-sm text-stone-500 underline hover:text-brand-700">
          ← Back
        </button>
      )}
    </main>
  );
}
