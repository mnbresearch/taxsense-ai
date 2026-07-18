import type { Metadata } from "next";
import SectionBrowser from "./SectionBrowser";

export const metadata: Metadata = {
  title: "Income-tax Act Section Quick-Reference for FY 2025-26 | TaxSense AI",
  description:
    "The 24 sections that dominate individual-tax practice — 87A, 80C, 10(13A), 44ADA, 111A/112A, 234A-C, 148, 270A — each with a plain-language summary and a practitioner's note.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/sections" },
};

export default function Page() {
  return <SectionBrowser />;
}
