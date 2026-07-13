"use client";

/** Plan / filing request form (batch 15): name + email + phone → admin notified, requester confirmed. */
import { useState } from "react";

export default function PlanRequest({ plan, cta = "Request this plan" }: { plan: string; cta?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

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

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 phone number" pattern="[+\d][\d\s\-()]{6,}"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      <button type="submit" disabled={state === "busy"}
        className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {state === "busy" ? "Sending…" : `Request ${plan}`}
      </button>
      {state === "error" && <p className="text-xs text-red-600">{msg}</p>}
      <p className="text-center text-[11px] text-stone-400">You get an instant email confirmation. We call you to complete setup — no payment online yet.</p>
    </form>
  );
}
