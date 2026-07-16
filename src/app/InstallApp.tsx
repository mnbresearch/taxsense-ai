"use client";

/**
 * Installable phone app (batch 25).
 * - Registers the service worker (offline shell; /api never cached).
 * - Captures `beforeinstallprompt` so the "Get the app" button works even
 *   AFTER the user dismissed the browser's own popup — the option persists
 *   here and they can install whenever they change their mind.
 * - When no native prompt is available (iOS Safari, or prompt already used),
 *   shows clear Add-to-Home-Screen instructions instead of doing nothing.
 * - Privacy screen: inside /app, the screen blurs when the app goes to the
 *   background so your numbers never show in the app switcher.
 */
import { useEffect, useState } from "react";

export default function InstallApp({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    // 1. Service worker (secure caching — see public/sw.js)
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    // 2. Already running as an installed app? Hide the button.
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setInstalled(true);
    }

    // 3. Keep the install prompt for later — surviving a dismissed popup.
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 4. Privacy screen in the workspace: blur when backgrounded.
    const onVis = () => {
      if (!window.location.pathname.startsWith("/app")) return;
      document.body.style.filter = document.hidden ? "blur(16px)" : "";
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      // Prompt objects are single-use; keep the button so they can retry
      // after the browser re-arms the prompt, or via instructions.
      setDeferred(null);
      if (choice?.outcome !== "accepted") setHelp(true);
    } else {
      setHelp(true);
    }
  }

  return (
    <>
      <button
        onClick={install}
        className={
          compact
            ? "text-xs text-stone-500 underline hover:text-brand-700"
            : "rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        }
      >
        📲 Get the app
      </button>
      {help && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setHelp(false)}>
          <div className="max-w-sm rounded-2xl bg-white p-6 text-left" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Install TaxSense on your phone</h3>
            <div className="mt-3 space-y-3 text-sm text-stone-600">
              <p><strong className="text-stone-900">Android (Chrome):</strong> tap the ⋮ menu → <strong>Add to Home screen</strong> → Install.</p>
              <p><strong className="text-stone-900">iPhone (Safari):</strong> tap the Share button → <strong>Add to Home Screen</strong>.</p>
              <p><strong className="text-stone-900">Desktop (Chrome/Edge):</strong> click the install icon in the address bar.</p>
            </div>
            <p className="mt-3 rounded-lg bg-brand-50 p-2.5 text-xs text-brand-700">
              🔒 The installed app keeps your data secure: encrypted connections only, your financial figures are never stored on the device by the app shell,
              the screen auto-blurs in the app switcher, and it requests <strong>zero phone permissions</strong> — no camera, no contacts, no location.
            </p>
            <button onClick={() => setHelp(false)} className="mt-4 w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
