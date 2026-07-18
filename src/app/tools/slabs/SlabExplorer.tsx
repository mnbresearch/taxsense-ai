"use client";

/**
 * Batch 37 — slab & rebate explorer (free, for students).
 * Plots engine-computed tax across an income range for both regimes.
 * Every point is a real computeBoth() call — the chart cannot lie.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { computeBoth, emptyProfile } from "@/lib/tax-engine";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const W = 720, H = 320, PAD = 48;
const MAX_INCOME = 3_000_000, STEP = 25_000;

function taxAt(gross: number, ded80C: number) {
  const p = {
    ...emptyProfile(),
    salary: { grossSalary: gross, basicPlusDA: gross * 0.5, hraReceived: 0, rentPaid: 0, isMetroCity: false, employerNpsContribution: 0, professionalTax: 0 },
    deductions: { ...emptyProfile().deductions, section80C: ded80C },
  };
  const c = computeBoth(p);
  return { o: c.old.totalTaxLiability, n: c.new.totalTaxLiability };
}

export default function SlabExplorer() {
  const [ded, setDed] = useState(0);
  const [probe, setProbe] = useState(1_250_000);

  const pts = useMemo(() => {
    const out: { x: number; o: number; n: number }[] = [];
    for (let g = 0; g <= MAX_INCOME; g += STEP) out.push({ x: g, ...taxAt(g, ded) });
    return out;
  }, [ded]);

  const maxTax = Math.max(...pts.map((p) => Math.max(p.o, p.n)), 1);
  const sx = (x: number) => PAD + (x / MAX_INCOME) * (W - PAD * 2);
  const sy = (y: number) => H - PAD + (-(y / maxTax)) * (H - PAD * 2);
  const line = (key: "o" | "n") => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(" ");
  const at = taxAt(probe, ded);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Slab & Rebate Explorer — FY 2025-26</h1>
        <p className="mt-2 text-sm text-stone-600">
          Every point on this chart is a full engine computation — slabs, standard deduction, 87A rebate,
          marginal relief and cess. Notice the new regime hugging zero all the way to ₹12L, then climbing
          gently thanks to marginal relief — not jumping. That smoothing is s.87A's proviso at work.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-6">
        <label className="block">
          <span className="text-xs font-semibold text-stone-600">80C investments (old regime only): {inr(ded)}</span>
          <input type="range" min={0} max={150_000} step={10_000} value={ded} onChange={(e) => setDed(Number(e.target.value))} className="mt-1 block w-56 accent-brand-600" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone-600">Probe an income: {inr(probe)}</span>
          <input type="range" min={0} max={MAX_INCOME} step={STEP} value={probe} onChange={(e) => setProbe(Number(e.target.value))} className="mt-1 block w-56 accent-brand-600" />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px]">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD} x2={W - PAD} y1={sy(maxTax * f)} y2={sy(maxTax * f)} stroke="#e7e5e4" strokeWidth="1" />
              <text x={PAD - 6} y={sy(maxTax * f) + 4} textAnchor="end" fontSize="10" fill="#a8a29e">{Math.round((maxTax * f) / 1000)}k</text>
            </g>
          ))}
          {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((l) => (
            <text key={l} x={sx(l * 1_000_000)} y={H - PAD + 16} textAnchor="middle" fontSize="10" fill="#a8a29e">{l}0L</text>
          ))}
          <line x1={sx(1_200_000)} x2={sx(1_200_000)} y1={PAD} y2={H - PAD} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
          <text x={sx(1_200_000)} y={PAD - 6} textAnchor="middle" fontSize="10" fill="#b45309">₹12L — 87A limit (new)</text>
          <path d={line("o")} fill="none" stroke="#a8a29e" strokeWidth="2" />
          <path d={line("n")} fill="none" stroke="#0d5947" strokeWidth="2.5" />
          <circle cx={sx(probe)} cy={sy(at.n)} r="4" fill="#0d5947" />
          <circle cx={sx(probe)} cy={sy(at.o)} r="4" fill="#a8a29e" />
        </svg>
        <div className="mt-2 flex gap-5 text-xs text-stone-600">
          <span><span className="mr-1 inline-block h-2 w-4 rounded bg-[#0d5947] align-middle"></span>New regime (default)</span>
          <span><span className="mr-1 inline-block h-2 w-4 rounded bg-stone-400 align-middle"></span>Old regime {ded > 0 && `(with ${inr(ded)} in 80C)`}</span>
        </div>
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">At {inr(probe)} gross</div>
          <div className="mt-1 text-stone-700">New regime: <strong>{inr(at.n)}</strong> · Old: <strong>{inr(at.o)}</strong></div>
          <div className="mt-1 text-xs text-stone-600">{at.n <= at.o ? "New regime wins here" : "Old regime wins here"} by {inr(Math.abs(at.n - at.o))}.</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <strong className="text-stone-800">For the exam:</strong> the rebate u/s 87A is applied to TAX, not income;
          marginal relief caps the extra tax at the extra income above ₹12L; and cess lands after both.
          Trace the flat-then-gentle start of the green line — that's all three interacting.
        </div>
      </section>
      <Link href="/app" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        Compute a full profile in the workspace →
      </Link>
    </main>
  );
}
