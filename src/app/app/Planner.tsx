"use client";

/**
 * What-if planner (feature batch 2):
 * sliders for the big levers → live both-regime recompute (debounced),
 * advance-tax installment schedule, ITR-form recommendation.
 */
import { useEffect, useRef, useState } from "react";

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
