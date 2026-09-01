"use client";

/**
 * Batch 93 — the landing-page lead magnet: 60-second Tax Check.
 * Instant engine-computed answer on screen; full report by email gates
 * name + email + phone (the lead lands in the founder's inbox).
 */
import { useMemo, useState } from "react";
import { quickCheck } from "@/lib/taxcheck";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const field = "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600";

export default function TaxCheck() {
  const [income, setIncome] = useState(1_800_000);
  const [rent, setRent] = useState(0);
  const [metro, setMetro] = useState(false);
  const [d80c, setD80c] = useState(0);
  const [regime, setRegime] = useState<"new" | "old" | "unsure">("unsure");
  const [ran, setRan] = useState(false);

  const r = useMemo(() => quickCheck({ income, rentMonthly: rent, metro, ded80C: d80c, currentRegime: regime }), [income, rent, metro, d80c, regime]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function sendReport(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/tax-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, income, rentMonthly: rent, metro, ded80C: d80c, currentRegime: regime }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setState("done");
    } catch (err: any) {
      setState("error");
      setMsg(err.message ?? "Something went wrong — try again.");
    }
  }

  return (
    <section className="border-y border-brand-100 bg-gradient-to-b from-brand-50/60 to-white">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Free · no signup · 60 seconds</p>
          <h2 className="mt-2 text-3xl font-bold text-stone-800">Are you overpaying tax? Find out right now.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-stone-600">Four questions, answered by the same 226-test engine that runs the whole app — not a rule of thumb.</p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <label className="block text-xs font-semibold text-stone-600">Annual income (₹)
              <input type="number" value={income || ""} onChange={(e) => { setIncome(Number(e.target.value)); setRan(true); }} className={field} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-stone-600">Monthly rent (0 if none)
                <input type="number" value={rent || ""} onChange={(e) => { setRent(Number(e.target.value)); setRan(true); }} className={field} placeholder="0" />
              </label>
              <label className="block text-xs font-semibold text-stone-600">80C invested so far (₹)
                <input type="number" value={d80c || ""} onChange={(e) => { setD80c(Number(e.target.value)); setRan(true); }} className={field} placeholder="0" />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-stone-600">Last year I filed under
                <select value={regime} onChange={(e) => { setRegime(e.target.value as any); setRan(true); }} className={field}>
                  <option value="unsure">Not sure</option>
                  <option value="new">New regime</option>
                  <option value="old">Old regime</option>
                </select>
              </label>
              <label className="flex items-end gap-2 pb-3 text-xs font-semibold text-stone-600">
                <input type="checkbox" checked={metro} onChange={(e) => { setMetro(e.target.checked); setRan(true); }} className="h-4 w-4 accent-brand-600" /> Delhi/Mumbai/Kolkata/Chennai
              </label>
            </div>

            <div className="mt-4 rounded-xl bg-stone-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className={"rounded-lg border p-2.5 " + (r.recommended === "old" ? "border-brand-600 bg-brand-50" : "border-stone-200 bg-white")}>
                  <div className="text-[10px] uppercase text-stone-500">Old regime {r.recommended === "old" && "✓"}</div>
                  <div className="text-lg font-bold text-stone-800">{inr(r.oldTax)}</div>
                </div>
                <div className={"rounded-lg border p-2.5 " + (r.recommended === "new" ? "border-brand-600 bg-brand-50" : "border-stone-200 bg-white")}>
                  <div className="text-[10px] uppercase text-stone-500">New regime {r.recommended === "new" && "✓"}</div>
                  <div className="text-lg font-bold text-stone-800">{inr(r.newTax)}</div>
                </div>
              </div>
              {ran && r.totalOpportunity > 0 ? (
                <p className="mt-3 text-center text-sm font-bold text-amber-700">
                  ⚡ Up to {inr(r.totalOpportunity)}/yr on the table
                  <span className="block text-[11px] font-medium text-stone-500">
                    {r.overpayingNow > 0 && <>wrong regime: {inr(r.overpayingNow)} · </>}two standard moves: {inr(r.movesSaving)}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-stone-500">Adjust your numbers — the engine recomputes live.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border-2 border-brand-600 bg-white p-6">
            {state === "done" ? (
              <div className="text-center">
                <div className="text-4xl">📬</div>
                <h3 className="mt-2 text-lg font-bold text-brand-700">Report sent — check your inbox!</h3>
                <p className="mt-2 text-sm text-stone-600">Your full breakdown is on its way, and our team may call to walk you through the savings. Meanwhile, the workspace makes these numbers exact in 3 minutes.</p>
                <a href="/app" className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Open the workspace →</a>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-stone-800">📩 Get the full report + savings plan</h3>
                <p className="mt-1 text-xs text-stone-500">Emailed instantly: both regimes, what you're overpaying, the exact moves — and a human from our team to help you act on it.</p>
                <form onSubmit={sendReport} className="mt-3 flex flex-col gap-2.5">
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} />
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 phone number" pattern="[+\d][\d\s\-()]{6,}" className={field} />
                  <button type="submit" disabled={state === "busy"} className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                    {state === "busy" ? "Computing your report…" : `Email me my ${r.totalOpportunity > 0 ? inr(r.totalOpportunity) + " " : ""}savings report — free`}
                  </button>
                  {state === "error" && <p className="text-xs text-red-600">{msg}</p>}
                  <p className="text-center text-[10px] text-stone-400">No spam — one report + a helping hand. Unsubscribe anytime.</p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
