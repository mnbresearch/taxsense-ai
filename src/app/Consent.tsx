"use client";

/**
 * DPDP consent for every form that collects contact details.
 * `consent` is required (purpose-specific: handling this request);
 * `marketing` is a separate, optional, un-ticked opt-in for the weekly digest.
 */
export default function Consent({
  consent,
  setConsent,
  marketing,
  setMarketing,
  purpose = "reply to this request",
  dark = false,
}: {
  consent: boolean;
  setConsent: (v: boolean) => void;
  marketing?: boolean;
  setMarketing?: (v: boolean) => void;
  purpose?: string;
  dark?: boolean;
}) {
  const txt = dark ? "text-stone-300" : "text-stone-600";
  const link = dark ? "underline text-white" : "underline text-brand-700";
  return (
    <div className={`flex flex-col gap-1.5 text-left text-[11px] leading-snug ${txt}`}>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand-600"
        />
        <span>
          I agree to the <a href="/privacy" target="_blank" className={link}>Privacy Policy</a> and to TaxSense using my details to {purpose}.
        </span>
      </label>
      {setMarketing && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand-600"
          />
          <span>Also send me the weekly tax-tips email (optional — unsubscribe any time).</span>
        </label>
      )}
    </div>
  );
}
