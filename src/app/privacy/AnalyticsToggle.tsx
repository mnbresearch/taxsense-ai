"use client";

import { useEffect, useState } from "react";
import { analyticsAllowed, setAnalyticsOptOut } from "../track";

/** Per-device opt-out for first-party analytics. */
export default function AnalyticsToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only state (window/localStorage/URL) is read after mount to keep SSR hydration stable
  useEffect(() => { setOn(analyticsAllowed()); }, []);
  if (on === null) return null;
  return (
    <button
      onClick={() => { setAnalyticsOptOut(on); setOn(!on); }}
      className="mt-2 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand-600"
    >
      {on ? "Turn off analytics on this device" : "Analytics are off on this device — turn back on"}
    </button>
  );
}
