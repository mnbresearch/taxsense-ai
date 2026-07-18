import type { Metadata } from "next";
import InterestCalculator from "./InterestCalculator";

export const metadata: Metadata = {
  title: "Section 234A/234B/234C Interest Calculator FY 2025-26 | TaxSense AI",
  description:
    "Practitioner-grade interest computation: late filing (234A), advance-tax default (234B) and quarter-wise deferment (234C) with Rule 119A rounding, the 12%/36% safe harbour and the presumptive schedule.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/interest" },
};

export default function Page() {
  return <InterestCalculator />;
}
