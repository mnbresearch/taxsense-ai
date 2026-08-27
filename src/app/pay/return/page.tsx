"use client";

/** Batch 82 — post-checkout landing: server-verified status, never client-trusted. */
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ReturnInner() {
  const params = useSearchParams();
  const orderId = params.get("order_id") ?? "";
  const [state, setState] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!orderId) { setState("failed"); return; }
    let stop = false;
    async function poll(attempt: number) {
      if (stop) return;
      try {
        const r = await fetch(`/api/pay/status?order_id=${encodeURIComponent(orderId)}`);
        const d = await r.json();
        if (d.status === "PAID") { setState("paid"); return; }
        if (["EXPIRED", "TERMINATED", "CANCELLED"].includes(d.status)) { setState("failed"); return; }
      } catch {}
      setTries(attempt);
      if (attempt >= 10) { setState("pending"); return; }
      setTimeout(() => poll(attempt + 1), 3000);
    }
    poll(1);
    return () => { stop = true; };
  }, [orderId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      {state === "checking" && (
        <>
          <div className="text-4xl">⏳</div>
          <h1 className="mt-3 text-xl font-bold text-stone-800">Confirming your payment…</h1>
          <p className="mt-2 text-sm text-stone-600">We're verifying directly with the payment gateway. This usually takes a few seconds{tries > 3 ? " — banks can be slow, hang tight" : ""}.</p>
        </>
      )}
      {state === "paid" && (
        <>
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-2xl font-bold text-brand-700">Payment received — your plan is live!</h1>
          <p className="mt-2 text-sm text-stone-600">
            Everything is unlocked for the email you paid with. A confirmation email is on its way.
            Sign in inside the app with that email (6-digit code — works on any device).
          </p>
          <Link href="/app" className="mt-5 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Open TaxSense AI →
          </Link>
        </>
      )}
      {state === "pending" && (
        <>
          <div className="text-4xl">🕐</div>
          <h1 className="mt-3 text-xl font-bold text-stone-800">Payment is processing</h1>
          <p className="mt-2 text-sm text-stone-600">
            Your bank has the payment in flight. The moment it confirms, your plan activates automatically and
            you'll get an email — no need to pay again. If nothing arrives in 30 minutes, reply to any of our
            emails or WhatsApp +91 97114 88480 with order <code className="rounded bg-stone-100 px-1">{orderId}</code>.
          </p>
          <Link href="/app" className="mt-5 text-sm font-semibold text-brand-700 underline">Back to the app</Link>
        </>
      )}
      {state === "failed" && (
        <>
          <div className="text-4xl">😕</div>
          <h1 className="mt-3 text-xl font-bold text-stone-800">That payment didn't complete</h1>
          <p className="mt-2 text-sm text-stone-600">
            No money left your account, or it will auto-refund. You can try again from the pricing page —
            or use "Request this plan" and we'll set you up personally.
          </p>
          <Link href="/pricing" className="mt-5 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Back to pricing →
          </Link>
        </>
      )}
    </main>
  );
}

export default function PayReturn() {
  return <Suspense fallback={null}><ReturnInner /></Suspense>;
}
