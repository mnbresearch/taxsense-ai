"use client";

/** Batch 60 — anonymous pageview beacon: fires once per route, path only. */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    try {
      const blob = new Blob([JSON.stringify({ type: "pageview", path: pathname })], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/telemetry", blob)) {
        fetch("/api/telemetry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "pageview", path: pathname }), keepalive: true }).catch(() => {});
      }
    } catch { /* never break the page for analytics */ }
  }, [pathname]);
  return null;
}
