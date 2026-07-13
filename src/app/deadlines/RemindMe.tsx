"use client";

/** Inline reminder signup for the deadlines page (batch 17). */
import { useState } from "react";

export default function RemindMe() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setState("done");
      setMsg(d.message);
    } catch (err: any) {
      setState("error");
      setMsg(err.message ?? "try again");
    }
  }

  if (state === "done")
    return <div className="mx-auto max-w-md rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-800">✓ {msg}</div>;

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-md gap-2">
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-600"
      />
      <button type="submit" disabled={state === "busy"}
        className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {state === "busy" ? "Saving…" : "🔔 Remind me"}
      </button>
      {state === "error" && <p className="self-center text-xs text-red-600">{msg}</p>}
    </form>
  );
}
