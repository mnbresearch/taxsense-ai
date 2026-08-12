"use client";

/**
 * Batch 78 — rent receipt generator. Everything runs in the browser; no
 * name, address or rent figure ever leaves the tab. Print → save as PDF.
 */
import { useState } from "react";
import Link from "next/link";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** FY 2025-26 months: Apr 2025 → Mar 2026. */
const MONTHS = [
  "April 2025", "May 2025", "June 2025", "July 2025", "August 2025", "September 2025",
  "October 2025", "November 2025", "December 2025", "January 2026", "February 2026", "March 2026",
];

function amountInWords(n: number): string {
  // Indian-system integer words, good to ₹99,99,99,999.
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number): string => (x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : ""));
  const three = (x: number): string => (x >= 100 ? ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + two(x % 100) : "") : two(x));
  if (n === 0) return "Zero";
  let out = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += two(crore) + " Crore ";
  if (lakh) out += two(lakh) + " Lakh ";
  if (thousand) out += two(thousand) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}

export default function RentReceipts() {
  const [tenant, setTenant] = useState("");
  const [landlord, setLandlord] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [rent, setRent] = useState(25000);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(11);
  const [mode, setMode] = useState("Bank transfer / UPI");

  const months = MONTHS.slice(from, to + 1);
  const annual = rent * months.length;
  const ready = tenant.trim() && landlord.trim() && address.trim() && rent > 0 && to >= from;

  const field = "mt-1 w-full rounded-md border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-brand-600";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="print:hidden">
        <Link href="/tools" className="text-xs font-semibold text-brand-700">← All tools</Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-800">🧾 Rent Receipt Generator — FY 2025-26</h1>
        <p className="mt-1 text-sm text-stone-600">
          Twelve print-ready receipts for your HRA claim in 30 seconds. Nothing you type leaves this browser tab.
        </p>

        <div className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">Tenant (your name)
            <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="Rahul Sharma" className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Landlord's name
            <input value={landlord} onChange={(e) => setLandlord(e.target.value)} placeholder="Sunita Verma" className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Landlord's PAN {annual > 100000 ? <span className="text-red-600">(required — rent exceeds ₹1L/yr)</span> : "(optional)"}
            <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">Monthly rent (₹)
            <input type="number" value={rent || ""} onChange={(e) => setRent(Number(e.target.value))} className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Rented property address
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat 4B, Green Residency, Koramangala, Bengaluru 560034" className={field} />
          </label>
          <label className="text-xs font-semibold text-stone-600">From month
            <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className={field}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600">To month
            <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={field}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Payment mode
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
              <option>Bank transfer / UPI</option>
              <option>Cheque</option>
              <option>Cash</option>
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          {annual > 100000 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              📌 Annual rent {inr(annual)} exceeds ₹1,00,000 — your employer must collect the landlord's PAN (Rule 26C). Receipts without it can get the HRA exemption restricted.
            </p>
          )}
          {mode === "Cash" && rent > 5000 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              📌 Cash rent above ₹5,000 — affix a ₹1 revenue stamp on each receipt and have the landlord sign across it.
            </p>
          )}
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-stone-500">
            Not sure how much HRA is exempt? Run the exact Rule 2A math in the <Link href="/tools/hra" className="font-semibold text-brand-700 underline">HRA calculator</Link>.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!ready}
          className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          🖨 Print / Save as PDF — {months.length} {months.length === 1 ? "receipt" : "receipts"}
        </button>
        {!ready && <p className="mt-1.5 text-xs text-stone-400">Fill tenant, landlord, address and rent to enable printing.</p>}
      </div>

      {/* Printable receipts */}
      {ready ? (
        <div className="mt-8 space-y-4 print:mt-0 print:space-y-0">
          {months.map((m) => (
            <div key={m} className="rounded-xl border border-stone-300 p-5 print:break-inside-avoid print:rounded-none print:border-stone-400" style={{ pageBreakInside: "avoid" }}>
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-2">
                <span className="text-sm font-bold tracking-wide text-stone-800">RENT RECEIPT</span>
                <span className="text-xs text-stone-500">{m}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                Received with thanks from <strong>{tenant}</strong> the sum of <strong>{inr(rent)}</strong> (Rupees {amountInWords(rent)} only)
                towards rent for the month of <strong>{m}</strong> for the property at <strong>{address}</strong>, paid by {mode.toLowerCase()}.
              </p>
              <div className="mt-6 flex items-end justify-between text-xs text-stone-600">
                <div>
                  <div>Landlord: <strong>{landlord}</strong></div>
                  {pan && <div>PAN: <strong>{pan}</strong></div>}
                  <div className="mt-1 text-stone-400">Date: ____________</div>
                </div>
                <div className="text-center">
                  {mode === "Cash" && rent > 5000 && <div className="mb-1 inline-block border border-dashed border-stone-400 px-2 py-1 text-[10px] text-stone-400">₹1 revenue stamp</div>}
                  <div className="w-40 border-t border-stone-400 pt-1">Signature of landlord</div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-center text-[10px] text-stone-400 print:mt-2">Generated with TaxSense AI — taxsense.mnbresearch.com/tools/rent-receipts</p>
        </div>
      ) : null}
    </main>
  );
}
