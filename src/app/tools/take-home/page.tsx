import type { Metadata } from "next";
import TakeHomeCalc from "./TakeHomeCalc";

export const metadata: Metadata = {
  title: "In-Hand Salary Calculator FY 2025-26 — CTC to Monthly Take-Home | TaxSense AI",
  description:
    "What does your CTC actually pay per month? Employer PF, gratuity, employee PF, professional tax and income tax under BOTH regimes — computed by a tested engine, not a rule of thumb.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/take-home" },
  openGraph: {
    title: "In-Hand Salary Calculator FY 2025-26 — TaxSense AI",
    description: "CTC → monthly take-home under both regimes, on a tested engine. Free.",
  },
};

export default function Page() {
  return <TakeHomeCalc />;
}
