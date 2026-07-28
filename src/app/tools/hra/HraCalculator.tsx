"use client";

/**
 * Batch 33 — standalone HRA exemption calculator (SEO tool page).
 * Reuses the deterministic engine's Rule 2A implementation, so this page
 * can never disagree with the main app.
 */
import { useState } from "react";
import Link from "next/link";
import { hraExemption } from "@/lib/tax-engine";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const T = {
  en: {
    title: "HRA Exemption Calculator — FY 2025-26",
    intro: "Section 10(13A) read with Rule 2A: your tax-free HRA is the minimum of three amounts. This calculator runs the exact formula our filing engine uses.",
    basic: "Basic salary + DA", hra: "HRA received", rent: "Rent you pay",
    metro: "{t.metro}",
    result: "Tax-free HRA (annual)", perMonth: "/month exempt ·", taxable: "of your HRA stays taxable",
    l1: "HRA actually received", l2: "Rent paid − 10% of basic+DA", l3m: "50% of basic+DA (metro)", l3n: "40% of basic+DA (non-metro)",
    lowest: "← lowest", pan: "{t.pan}",
  },
  hi: {
    title: "HRA छूट कैलकुलेटर — FY 2025-26",
    intro: "धारा 10(13A) और नियम 2A: आपका कर-मुक्त HRA तीन राशियों में सबसे कम होता है। यह कैलकुलेटर वही फ़ॉर्मूला चलाता है जो हमारा फाइलिंग इंजन इस्तेमाल करता है।",
    basic: "मूल वेतन + DA", hra: "मिला हुआ HRA", rent: "आपका किराया",
    metro: "मैं मेट्रो शहर में रहता/रहती हूँ (दिल्ली, मुंबई, कोलकाता या चेन्नई)",
    result: "कर-मुक्त HRA (वार्षिक)", perMonth: "/माह छूट ·", taxable: "HRA पर टैक्स लगेगा",
    l1: "वास्तव में मिला HRA", l2: "किराया − मूल वेतन का 10%", l3m: "मूल वेतन का 50% (मेट्रो)", l3n: "मूल वेतन का 40% (नॉन-मेट्रो)",
    lowest: "← सबसे कम", pan: "₹1 लाख/वर्ष से अधिक किराए पर मकान मालिक का PAN देना होगा।",
  },
} as const;

export default function HraCalculator() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = T[lang];
  const [basic, setBasic] = useState(40_000);
  const [hra, setHra] = useState(20_000);
  const [rent, setRent] = useState(25_000);
  const [metro, setMetro] = useState(true);

  const s = {
    grossSalary: 0, basicPlusDA: basic * 12, hraReceived: hra * 12, rentPaid: rent * 12,
    isMetroCity: metro, employerNpsContribution: 0, professionalTax: 0,
  };
  const exempt = hraExemption(s);
  const a = s.hraReceived;
  const b = Math.max(0, s.rentPaid - 0.1 * s.basicPlusDA);
  const c = (metro ? 0.5 : 0.4) * s.basicPlusDA;
  const taxable = Math.max(0, s.hraReceived - exempt);

  const rows = [
    { label: t.l1, value: a, hit: exempt === a },
    { label: t.l2, value: b, hit: exempt === b && exempt !== a },
    { label: metro ? t.l3m : t.l3n, value: c, hit: exempt === c && exempt !== a && exempt !== b },
  ];

  const field = (label: string, value: number, set: (n: number) => void) => (
    <label className="block">
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-brand-600">
        <span className="pl-3 text-sm text-stone-400">₹</span>
        <input
          type="number"
          min={0}
          value={value || ""}
          onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg px-2 py-2.5 text-sm outline-none"
        />
        <span className="pr-3 text-xs text-stone-400">/month</span>
      </div>
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-stone-800">{t.title}</h1>
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="flex-none rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:border-brand-600 hover:text-brand-700"
          >
            {lang === "en" ? "हिंदी" : "EN"}
          </button>
        </div>
        <p className="mt-2 text-sm text-stone-600">{t.intro}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          {field(t.basic, basic, setBasic)}
          {field(t.hra, hra, setHra)}
          {field(t.rent, rent, setRent)}
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={metro} onChange={(e) => setMetro(e.target.checked)} className="accent-brand-600" />
            {t.metro}
          </label>
        </section>

        <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t.result}</div>
          <div className="mt-1 text-4xl font-bold text-brand-700">{inr(exempt)}</div>
          <div className="mt-1 text-xs text-stone-600">
            {inr(exempt / 12)}{t.perMonth} {inr(taxable)} {t.taxable}
          </div>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={"border-t border-brand-100 " + (r.hit ? "font-bold text-brand-700" : "text-stone-600")}>
                  <td className="py-1.5 pr-2 text-xs">{r.label}{r.hit && " " + t.lowest}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">{inr(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rent > 0 && rent * 12 > 100_000 && (
            <p className="mt-3 text-[11px] text-amber-700">{t.pan}</p>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-800">Three things people miss</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li><strong>HRA exemption exists only in the old regime.</strong> Under the new (default) regime it's zero — but the new regime's lower slabs often win anyway. You need both numbers to decide.</li>
          <li><strong>No HRA component in salary?</strong> You can still claim rent under section 80GG (old regime, capped at ₹60,000/year).</li>
          <li><strong>Paying rent to parents is legal</strong> — if the money actually moves and they declare it as income.</li>
        </ul>
        <Link
          href="/app"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Compare both regimes with your full numbers →
        </Link>
      </section>
    </main>
  );
}
