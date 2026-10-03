"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Route-level error boundary: a friendly recovery screen instead of a blank page. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "boundary", message: `${error.digest ?? ""} ${error.message}`.slice(0, 300) }),
    }).catch(() => {});
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl">🧾</p>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Something went wrong on this page</h1>
      <p className="mt-2 text-sm text-stone-600">Your saved data is safe. Try again — if it keeps happening, reply to any TaxSense email and we&apos;ll look into it.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Try again</button>
        <Link href="/" className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Home</Link>
      </div>
    </main>
  );
}
