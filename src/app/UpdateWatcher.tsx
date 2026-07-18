"use client";

/**
 * Batch 39 — automatic updates. Every deploy carries a new commit sha in
 * /api/health. This watcher polls it (and on tab re-focus), refreshes the
 * service worker, and applies the new version: instant reload on ordinary
 * pages, a one-tap toast in the workspace so an in-flight conversation is
 * never destroyed.
 */
import { useEffect, useState } from "react";

const CHECK_MS = 10 * 60 * 1000; // 10 minutes

export default function UpdateWatcher() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let firstSha: string | null = null;
    let stopped = false;

    async function check() {
      try {
        const d = await fetch("/api/health", { cache: "no-store" }).then((r) => r.json());
        const sha = d?.build;
        if (!sha || sha === "dev" || stopped) return;
        if (!firstSha) { firstSha = sha; return; }
        if (sha !== firstSha) {
          // refresh the service worker so the new shell is picked up too
          if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then((r) => r?.update());
          if (window.location.pathname === "/app") setReady(true); // protect chat state — one tap
          else window.location.reload(); // everywhere else: instant
        }
      } catch {
        /* offline — try again later */
      }
    }

    check();
    const id = setInterval(check, CHECK_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!ready) return null;
  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-700"
    >
      ⬆ TaxSense updated — tap to load the new version
    </button>
  );
}
