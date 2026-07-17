"use client";

/**
 * What-if planner (feature batch 2):
 * sliders for the big levers → live both-regime recompute (debounced),
 * advance-tax installment schedule, ITR-form recommendation.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

interface SliderDef {
  key: string;
  label: string;
  max: number;
  step: number;
  get: (p: any) => number;
  set: (p: any, v: number) => void;
}

const SLIDERS: SliderDef[] = [
  {
    key: "80c", label: "80C investments (PPF/ELSS/EPF/LIC)", max: 150_000, step: 5_000,
    get: (p) => p.deductions?.section80C ?? 0,
    set: (p, v) => (p.deductions.section80C = v),
  },
  {
    key: "nps", label: "NPS self — 80CCD(1B)", max: 50_000, step: 5_000,
    get: (p) => p.deductions?.section80CCD1B ?? 0,
    set: (p, v) => (p.deductions.section80CCD1B = v),
  },
  {
    key: "80d", label: "Health insurance — 80D (self/family)", max: 50_000, step: 1_000,
    get: (p) => p.deductions?.section80D_selfFamily ?? 0,
    set: (p, v) => (p.deductions.section80D_selfFamily = v),
  },
  {
    key: "rent", label: "Annual rent paid (HRA lever)", max: 720_000, step: 12_000,
    get: (p) => p.salary?.rentPaid ?? 0,
    set: (p, v) => p.salary && (p.salary.rentPaid = v),
  },
];

export default function Planner({ profile }: { profile: any }) {
  const [draft, setDraft] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [rr, setRr] = useState({ tenantName: "", landlordName: "", propertyAddress: "", landlordPan: "" });
  const [rrMsg, setRrMsg] = useState("");
  const [structure, setStructure] = useState<any>(null);
  const [structBusy, setStructBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function designCtc() {
    if (!draft?.salary?.grossSalary) return;
    setStructBusy(true);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ctc: draft.salary.grossSalary,
          rentPaid: draft.salary.rentPaid ?? 0,
          isMetroCity: !!draft.salary.isMetroCity,
          age: draft.age ?? 30,
          currentBasicPct: Math.max(10, Math.min(90, Math.round((draft.salary.basicPlusDA / draft.salary.grossSalary) * 100))),
          currentEmployerNpsPct: Math.min(14, Math.round(((draft.salary.employerNpsContribution ?? 0) / Math.max(1, draft.salary.basicPlusDA)) * 100)),
        }),
      });
      const d = await res.json();
      if (!d.error) setStructure(d);
    } finally {
      setStructBusy(false);
    }
  }

  async function downloadReceipts() {
    const monthlyRent = Math.round((draft?.salary?.rentPaid ?? 0) / 12);
    if (!monthlyRent) { setRrMsg("Add your rent in the chat first."); return; }
    setRrMsg("Generating…");
    const res = await fetch("/api/rent-receipts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenantName: rr.tenantName, landlordName: rr.landlordName,
        propertyAddress: rr.propertyAddress, monthlyRent,
        ...(rr.landlordPan ? { landlordPan: rr.landlordPan } : {}),
      }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); setRrMsg(e.error ?? "Failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rent-receipts-fy2025-26.pdf"; a.click();
    URL.revokeObjectURL(url);
    setRrMsg("Downloaded — 12 receipts, April 2025 to March 2026.");
  }

  // Re-seed the draft whenever the underlying chat profile changes.
  useEffect(() => {
    if (profile) setDraft(JSON.parse(JSON.stringify(profile)));
  }, [JSON.stringify(profile)]);

  // Debounced recompute on any draft change.
  useEffect(() => {
    if (!draft) return;
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    timer.current = setTimeout(() => {
      fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: draft }),
      })
        .then((r) => r.json())
        .then((d) => !d.error && setResult(d))
        .finally(() => setBusy(false));
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [JSON.stringify(draft)]);

  if (!draft) return null;
  const cmp = result?.comparison;
  const adv = result?.advanceTax;
  const itr = result?.itr;

  function update(s: SliderDef, v: number) {
    const next = JSON.parse(JSON.stringify(draft));
    s.set(next, v);
    setDraft(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold">What-if planner</h3>
          {busy && <span className="text-xs text-stone-400">recomputing…</span>}
        </div>
        <p className="mb-3 text-xs text-stone-500">
          Drag the levers — both regimes recompute live. The chat profile stays untouched.
        </p>
        <div className="space-y-3">
          {SLIDERS.filter((s) => s.key !== "rent" || draft.salary).map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-xs">
                <span className="text-stone-600">{s.label}</span>
                <span className="font-semibold">{inr(s.get(draft))}</span>
              </div>
              <input
                type="range"
                min={0}
                max={s.max}
                step={s.step}
                value={s.get(draft)}
                onChange={(e) => update(s, Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          ))}
        </div>
      </div>

      {cmp && (
        <div className="grid grid-cols-2 gap-3">
          {(["old", "new"] as const).map((k) => (
            <div
              key={k}
              className={
                "rounded-lg border p-3 " +
                (cmp.recommended === k ? "border-brand-600 bg-brand-50/50" : "border-stone-200")
              }
            >
              <div className="text-[10px] uppercase text-stone-500">{k} regime</div>
              <div className="text-lg font-bold">{inr(cmp[k].totalTaxLiability)}</div>
            </div>
          ))}
        </div>
      )}

      {itr && (
        <div className="rounded-lg border border-stone-200 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Which ITR form?</div>
          <div className="mt-1 text-lg font-bold text-brand-700">
            {itr.form} <span className="text-sm font-medium text-stone-500">({itr.formName})</span>
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-stone-600">
            {itr.reasons.slice(0, 3).map((r: string, i: number) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {(draft?.salary?.grossSalary ?? 0) > 0 && (
        <div className="rounded-lg border border-stone-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              CTC Designer — the structure to ask HR for
            </div>
            <button
              onClick={designCtc}
              disabled={structBusy}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {structBusy ? "Designing…" : structure ? "Re-run" : "Design my structure"}
            </button>
          </div>
          {structure?.locked && (
            <div className="mt-3 space-y-3">
              <div className="rounded-md bg-brand-50 p-3">
                <div className="text-sm font-bold text-brand-700">
                  {structure.savingsVsCurrent > 0
                    ? `A smarter salary structure could save you ${inr(structure.savingsVsCurrent)} a year`
                    : "Your structure is already close to optimal — Pro shows the exact fine-tuning"}
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  Best achievable tax: {inr(structure.best.bestTax)} ({structure.best.bestRegime} regime).
                  The exact basic/HRA/NPS percentages{structure.lockedCount ? ` and ${structure.lockedCount} ranked structures` : ""} are a Pro feature.
                </div>
              </div>
              <div className="relative overflow-hidden rounded-md border border-stone-200">
                <table className="w-full text-xs blur-[3px] select-none" aria-hidden>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-t border-stone-100 text-stone-400">
                        <td className="py-1.5 pl-2">••%</td><td>••%</td>
                        <td className="pr-2 text-right">₹•,••,•••</td><td className="pr-2 text-right">•••</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-stone-600 shadow">🔒 Pro unlocks this</span>
                </div>
              </div>
              <Link
                href="/pricing"
                className="block rounded-md bg-brand-600 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700"
              >
                Unlock the CTC Designer — Pro ₹399/mo
              </Link>
              <p className="text-center text-[11px] text-stone-400">{structure.upgradeHint}</p>
            </div>
          )}
          {structure && !structure.locked && (
            <div className="mt-3 space-y-3">
              <div className="rounded-md bg-brand-50 p-3">
                <div className="text-sm font-bold text-brand-700">
                  Optimal: basic {structure.best.basicPct}% of CTC · employer NPS {structure.best.employerNpsPct}% of basic
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  Basic {inr(structure.best.basicPlusDA)} · HRA {inr(structure.best.hraComponent)} · NPS {inr(structure.best.employerNps)} →
                  tax {inr(structure.best.bestTax)} ({structure.best.bestRegime} regime)
                  {structure.savingsVsCurrent > 0 && (
                    <span className="font-semibold text-brand-700"> · saves {inr(structure.savingsVsCurrent)} vs your current structure</span>
                  )}
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-stone-400">
                    <th className="py-1 font-medium">Basic %</th>
                    <th className="font-medium">NPS %</th>
                    <th className="text-right font-medium">Best tax</th>
                    <th className="text-right font-medium">Regime</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.options.slice(0, 5).map((o: any, i: number) => (
                    <tr key={i} className={"border-t border-stone-100 " + (i === 0 ? "font-semibold text-brand-700" : "text-stone-600")}>
                      <td className="py-1">{o.basicPct}%{!o.wageCodeAligned && " *"}</td>
                      <td>{o.employerNpsPct}%</td>
                      <td className="text-right">{inr(o.bestTax)}</td>
                      <td className="text-right">{o.bestRegime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <details className="text-[11px] text-stone-500">
                <summary className="cursor-pointer font-medium">Assumptions & caveats</summary>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {structure.notes.map((n: string, i: number) => (
                    <li key={i}>{n}</li>
                  ))}
                  <li>* basic below 50% of CTC — Wage Code may make HR reluctant.</li>
                </ul>
              </details>
            </div>
          )}
        </div>
      )}

      {(draft?.salary?.rentPaid ?? 0) > 0 && (
        <div className="rounded-lg border border-stone-200 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Rent receipts for HRA ({inr(Math.round(draft.salary.rentPaid / 12))}/month)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([["tenantName", "Your name"], ["landlordName", "Landlord name"], ["propertyAddress", "Property address"], ["landlordPan", "Landlord PAN (if rent > ₹1L/yr)"]] as const).map(([k, ph]) => (
              <input
                key={k}
                value={(rr as any)[k]}
                onChange={(e) => setRr({ ...rr, [k]: e.target.value })}
                placeholder={ph}
                className={"rounded-md border border-stone-300 px-2.5 py-2 text-xs outline-none focus:border-brand-600 " + (k === "propertyAddress" ? "col-span-2" : "")}
              />
            ))}
          </div>
          <button
            onClick={downloadReceipts}
            disabled={rr.tenantName.length < 2 || rr.landlordName.length < 2 || rr.propertyAddress.length < 5}
            className="mt-2 w-full rounded-md bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            Download 12 rent receipts (PDF)
          </button>
          {rrMsg && <p className="mt-1 text-[11px] text-stone-500">{rrMsg}</p>}
        </div>
      )}

      {adv && (
        <div className="rounded-lg border border-stone-200 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Advance-tax calendar</div>
          {!adv.applicable ? (
            <p className="mt-1 text-xs text-stone-600">{adv.reason}</p>
          ) : (
            <>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {adv.installments.map((i: any) => (
                    <tr key={i.dueDate} className="border-b border-stone-100 last:border-0">
                      <td className="py-1 text-stone-600">
                        {new Date(i.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="py-1 text-stone-500">{i.cumulativePct}% cum.</td>
                      <td className="py-1 text-right font-semibold">{inr(i.installmentAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-amber-700">
                Skipping the calendar entirely would cost ≈ {inr(adv.interest234C_ifAllMissed)} (234C) +{" "}
                {inr(adv.interest234B_4months)} (234B, paid in July).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
