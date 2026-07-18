"use client";

/**
 * Batch 28 — plan gating client kit:
 * useEntitlements() hook, the header sign-in control, and the upsell modal.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

export interface Ent {
  signedIn: boolean;
  email: string | null;
  plan: string;
  active: boolean;
  features: { ctcDesigner: boolean; proTools: boolean; clientWorkbook: boolean; scenarios: number; pdfPerDay: number | null; label: string };
}

export function useEntitlements(): Ent | null {
  const [ent, setEnt] = useState<Ent | null>(null);
  useEffect(() => {
    fetch("/api/entitlements")
      .then((r) => r.json())
      .then((d) => d && d.features && setEnt(d))
      .catch(() => {});
  }, []);
  return ent;
}

export function AccountControl({ ent }: { ent: Ent | null }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      setMsg(res.ok ? d.message : d.error ?? "failed — try again");
    } catch {
      setMsg("failed — try again");
    } finally {
      setBusy(false);
    }
  }

  if (ent?.signedIn) {
    return (
      <span
        className={
          "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
          (ent.active ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-600")
        }
        title={ent.email ?? undefined}
      >
        {ent.active ? `✓ ${ent.features.label}` : `${ent.email?.split("@")[0]} · free`}
      </span>
    );
  }

  return (
    <span className="relative">
      <button onClick={() => setOpen(!open)} className="font-semibold text-brand-700 hover:underline">
        Sign in
      </button>
      {open && (
        <span className="absolute right-0 top-6 z-20 block w-64 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
          <span className="block text-xs font-semibold text-stone-700">Sign in with a magic link</span>
          <span className="mt-0.5 block text-[11px] text-stone-500">
            Use your plan email to unlock paid features.
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendLink()}
            placeholder="you@example.com"
            type="email"
            className="mt-2 w-full rounded-md border border-stone-300 px-2.5 py-2 text-xs outline-none focus:border-brand-600"
          />
          <button
            onClick={sendLink}
            disabled={busy}
            className="mt-2 w-full rounded-md bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          {msg && <span className="mt-1.5 block text-[11px] text-stone-500">{msg}</span>}
        </span>
      )}
    </span>
  );
}

export function UpsellModal({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-2xl">🔒</div>
        <h3 className="mt-1 text-base font-bold text-stone-800">That's a Pro feature</h3>
        <p className="mt-1 text-sm text-stone-600">{message}</p>
        <ul className="mt-3 space-y-1 text-xs text-stone-600">
          <li>✓ Full CTC Designer — every restructuring option</li>
          <li>✓ Unlimited filing-summary PDFs</li>
          <li>✓ 3 saved what-if scenarios</li>
        </ul>
        <Link
          href="/pricing"
          className="mt-4 block rounded-lg bg-brand-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          See plans — Pro from ₹399/mo
        </Link>
        <button onClick={onClose} className="mt-2 w-full py-1 text-center text-xs text-stone-500 hover:text-stone-700">
          Maybe later
        </button>
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Already paid? Sign in with your plan email (top right).
        </p>
      </div>
    </div>
  );
}
