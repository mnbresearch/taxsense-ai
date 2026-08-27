"use client";

/**
 * Plan purchase / request (batches 15 + 82).
 * If Cashfree is configured, the same form pays online (hosted checkout);
 * otherwise it degrades to the personal request-and-call flow.
 */
import { useEffect, useState } from "react";

const PAY_OPTIONS: Record<string, { key: string; label: string }[]> = {
  pro: [
    { key: "pro-monthly", label: "Pay ₹399 — 1 month" },
    { key: "pro-yearly", label: "Pay ₹3,999 — 1 year" },
  ],
  business: [
    { key: "business-monthly", label: "Pay ₹999 — 1 month" },
    { key: "business-yearly", label: "Pay ₹9,999 — 1 year" },
  ],
  filed: [{ key: "filed-once", label: "Pay ₹4,999 — one return" }],
  concierge: [
    { key: "concierge-monthly", label: "Pay ₹2,499 — 1 month" },
    { key: "concierge-yearly", label: "Pay ₹24,999 — 1 year" },
  ],
};

function payOptionsFor(plan: string) {
  const p = plan.trim().toLowerCase();
  if (p.startsWith("business")) return PAY_OPTIONS.business;
  if (p.startsWith("concierge")) return PAY_OPTIONS.concierge;
  if (p.startsWith("filed")) return PAY_OPTIONS.filed;
  if (p.startsWith("pro")) return PAY_OPTIONS.pro;
  return [];
}

declare global { interface Window { Cashfree?: any } }

async function loadCashfreeSdk(): Promise<any | null> {
  if (window.Cashfree) return window.Cashfree;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("sdk load failed"));
    document.head.appendChild(s);
  }).catch(() => {});
  return window.Cashfree ?? null;
}

export default function PlanRequest({ plan, cta = "Request this plan" }: { plan: string; cta?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [payEnabled, setPayEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/pay/create-order")
      .then((r) => r.json())
      .then((d) => setPayEnabled(!!d.enabled))
      .catch(() => {});
  }, [open]);

  const fieldsOk = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.replace(/\D/g, "").length >= 10;

  async function payNow(planKey: string) {
    if (!fieldsOk || state === "busy") { setMsg("Fill name, email and phone first."); setState("error"); return; }
    setState("busy"); setMsg("");
    try {
      const res = await fetch("/api/pay/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planKey, email, name, phone }),
      });
      const d = await res.json();
      if (!res.ok || !d.paymentSessionId) throw new Error(d.error ?? "could not start payment");
      const Cashfree = await loadCashfreeSdk();
      if (!Cashfree) throw new Error("payment SDK blocked — try Request instead");
      const cf = Cashfree({ mode: d.mode === "production" ? "production" : "sandbox" });
      await cf.checkout({ paymentSessionId: d.paymentSessionId, redirectTarget: "_self" });
      setState("idle");
    } catch (err: any) {
      setState("error");
      setMsg(err.message ?? "payment could not start — try Request instead");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, phone: phone || undefined, plan, source: "pricing" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setState("done");
      setMsg("Request received — confirmation sent to your email. We'll contact you shortly.");
    } catch (err: any) {
      setState("error");
      setMsg(err.message ?? "Something went wrong — try again.");
    }
  }

  if (state === "done")
    return <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-xs font-medium text-green-800">✓ {msg}</div>;

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        {cta}
      </button>
    );

  const payOpts = payOptionsFor(plan);

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 phone number" pattern="[+\d][\d\s\-()]{6,}"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      {payEnabled && payOpts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {payOpts.map((o) => (
            <button key={o.key} type="button" onClick={() => payNow(o.key)} disabled={state === "busy"}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {state === "busy" ? "Starting secure checkout…" : `⚡ ${o.label}`}
            </button>
          ))}
          <p className="text-center text-[10px] text-stone-400">Secure checkout by Cashfree — UPI, cards, netbanking. Plan activates automatically.</p>
        </div>
      )}
      <button type="submit" disabled={state === "busy"}
        className={payEnabled && payOpts.length > 0
          ? "rounded-lg border border-brand-600 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          : "rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"}>
        {state === "busy" ? "Working…" : payEnabled && payOpts.length > 0 ? "Or request a call instead" : `Request ${plan}`}
      </button>
      {state === "error" && <p className="text-xs text-red-600">{msg}</p>}
      <p className="text-center text-[11px] text-stone-400">
        {payEnabled && payOpts.length > 0
          ? "Pay online for instant activation, or request and we call you to set up."
          : "You get an instant email confirmation. We call you to complete setup — no payment online yet."}
      </p>
    </form>
  );
}
