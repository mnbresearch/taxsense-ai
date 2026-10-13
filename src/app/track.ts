"use client";

/** Browser-side analytics: first-party, no cookies, honours GPC / DNT / opt-out. */
const OPT_OUT = "ts_noanalytics";
const AID = "ts_aid";

export function analyticsAllowed(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null };
    if (nav.globalPrivacyControl === true || nav.doNotTrack === "1") return false;
    return localStorage.getItem(OPT_OUT) !== "1";
  } catch { return false; }
}

export function setAnalyticsOptOut(out: boolean) {
  try { if (out) { localStorage.setItem(OPT_OUT, "1"); localStorage.removeItem(AID); } else localStorage.removeItem(OPT_OUT); } catch { /* ignore */ }
}

function anonId(): string | null {
  try {
    let id = localStorage.getItem(AID);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(AID, id); }
    return id;
  } catch { return null; }
}

function send(payload: Record<string, unknown>) {
  if (!analyticsAllowed()) return;
  try {
    const body = JSON.stringify({ ...payload, anonId: anonId() });
    if (!navigator.sendBeacon?.("/api/telemetry", new Blob([body], { type: "application/json" }))) {
      fetch("/api/telemetry", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* never break the page for analytics */ }
}

export function trackPageView(path: string) {
  send({ type: "pageview", path, referrer: document.referrer || undefined });
}

export type ClientEvent = "plan_selected" | "onboarding_completed" | "feature_used";
export function trackEvent(event: ClientEvent, props: Record<string, string | number | boolean> = {}) {
  send({ type: "event", event, props, path: location.pathname });
}
