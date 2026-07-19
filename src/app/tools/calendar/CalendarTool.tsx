"use client";

/**
 * Batch 44 — deadline calendar export (free). Generates an RFC-5545 .ics
 * entirely client-side from the same deadlines lib the cron reminders use.
 */
import Link from "next/link";
import { DEADLINES } from "@/lib/deadlines";

function toIcs(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const events = DEADLINES.map((d) => {
    const ymd = d.date.replace(/-/g, "");
    const uid = `taxsense-${d.date}-${d.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}@taxsense-ai.vercel.app`;
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd}`,
      `SUMMARY:🧮 ${esc(d.label)}`,
      `DESCRIPTION:${esc(d.detail + " — via TaxSense AI (taxsense-ai.vercel.app/deadlines)")}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:Tomorrow: ${esc(d.label)}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TaxSense AI//Tax Deadlines//EN", "CALSCALE:GREGORIAN", events, "END:VCALENDAR"].join("\r\n");
}

export default function CalendarTool() {
  function download() {
    const blob = new Blob([toIcs()], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taxsense-tax-deadlines.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">Tax Deadline Calendar</h1>
        <p className="mt-2 text-sm text-stone-600">
          Every due date below, as an <strong>.ics file</strong> your calendar app understands — each event
          carries a day-before reminder. Works with Google Calendar, Apple Calendar and Outlook.
        </p>
      </header>

      <button onClick={download} className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
        📅 Download the calendar (.ics)
      </button>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <tbody>
            {DEADLINES.map((d) => (
              <tr key={d.date + d.label} className="border-t border-stone-100 first:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-brand-700">
                  {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="py-2.5 pr-4">
                  <div className="font-semibold text-stone-800">{d.label}</div>
                  <div className="text-xs text-stone-500">{d.detail}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-stone-600">
        Prefer emails? The <Link href="/deadlines" className="font-semibold text-brand-700 underline">deadline reminder service</Link> sends
        D-7 and D-1 nudges automatically.
      </p>
    </main>
  );
}
