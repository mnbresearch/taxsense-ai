import type { Metadata } from "next";
import CalendarTool from "./CalendarTool";

export const metadata: Metadata = {
  title: "Tax Deadline Calendar (.ics download) FY 2025-26 → AY 2026-27 | TaxSense AI",
  description:
    "One click adds every income-tax due date — advance-tax installments, ITR filing, belated-return cutoff — to Google, Apple or Outlook Calendar, with built-in day-before alarms.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/calendar" },
};

export default function Page() {
  return <CalendarTool />;
}
