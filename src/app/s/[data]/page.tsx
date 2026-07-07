/**
 * Read-only shared results page (feature batch 5).
 * Server-rendered: decode → validate → compute. Nothing stored, nothing mutable.
 */
import Link from "next/link";
import { computeBoth } from "@/lib/tax-engine";
import { computeInsights } from "@/lib/optimizer/insights";
import { recommendItrForm } from "@/lib/tax-engine/itrForm";
import { decodeProfile } from "@/lib/share";

export const dynamic = "force-dynamic";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function SharedResult({ params }: { params: { data: string } }) {
  const decoded = decodeProfile(params.data);
  if (!decoded.ok) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">This share link isn&apos;t valid.</h1>
        <p className="mt-2 text-stone-600">{decoded.error}</p>
        <Link href="/app" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">
          Compute your own →
        </Link>
      </main>
    );
  }
  const profile = decoded.profile;
  const cmp = computeBoth(profile);
  const itr = recommendItrForm(profile, cmp[cmp.recommended].totalIncome);
  const insights = computeInsights(profile, cmp);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div className="text-lg font-bold text-brand-700">
          TaxSense <span className="font-normal text-stone-400">AI</span>
        </div>
        <span className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-500">shared summary · read-only</span>
      </header>

      <div className="rounded-xl bg-brand-50 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Recommendation</div>
        <div className="mt-1 text-2xl font-bold text-brand-700">
          {cmp.recommended === "new" ? "New" : "Old"} regime
          {cmp.savings > 0 && <span className="font-medium text-stone-600"> — saves {inr(cmp.savings)}</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["old", "new"] as const).map((k) => (
          <div key={k} className={"rounded-xl border p-5 " + (cmp.recommended === k ? "border-brand-600 bg-brand-50/50" : "border-stone-200 bg-white")}>
            <div className="text-xs uppercase text-stone-500">{k} regime</div>
            <div className="mt-1 text-3xl font-bold">{inr(cmp[k].totalTaxLiability)}</div>
            <div className="mt-1 text-xs text-stone-500">on {inr(cmp[k].totalIncome)} · {cmp[k].effectiveRatePct}% effective</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">ITR form</div>
        <div className="mt-1 text-xl font-bold text-brand-700">{itr.form} <span className="text-sm font-medium text-stone-500">({itr.formName})</span></div>
      </div>

      {insights.length > 0 && (
        <div className="mt-4 space-y-2">
          {insights.map((i) => (
            <div key={i.kind} className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="text-sm font-semibold text-brand-700">{i.headline}</div>
              <p className="mt-0.5 text-xs text-stone-600">{i.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5 text-center">
        <p className="text-sm text-stone-600">Want this for your own income — with the conversational intake, planner and PDF?</p>
        <Link href="/app" className="mt-3 inline-block rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700">
          Try TaxSense AI free →
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-stone-400">
        FY 2025-26 · An MNB Research product, in collaboration with Abrobot.ai · Not a substitute for professional advice
      </p>
    </main>
  );
}
