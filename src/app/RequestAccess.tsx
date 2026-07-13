"use client";

/** Request-access lead capture (batch 10) — lands in the admin panel. */
import { useState } from "react";

export default function RequestAccess({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans never see or fill this
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, source: compact ? "hero" : "landing", company: company || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setState("done");
      setMsg(d.message);
    } catch (err: any) {
      setState("error");
      setMsg(err.message ?? "Something went wrong — try again.");
    }
  }

  if (state === "done")
    return (
      <div className="mx-auto max-w-md rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-800">
        ✓ {msg}
      </div>
    );

  return (
    <form onSubmit={submit} className="relative mx-auto flex max-w-xl flex-col gap-2 sm:flex-row">
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {!compact && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-600 sm:w-44"
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-600"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {state === "busy" ? "Saving…" : "Request access"}
      </button>
      {state === "error" && <p className="text-xs text-red-600 sm:self-center">{msg}</p>}
    </form>
  );
}
