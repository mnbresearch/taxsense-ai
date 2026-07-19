import type { Metadata } from "next";
import GratuityCalculator from "./GratuityCalculator";

export const metadata: Metadata = {
  title: "Gratuity Calculator with Tax Exemption (s.10(10)) FY 2025-26 | TaxSense AI",
  description:
    "Compute your gratuity under the Payment of Gratuity Act formula (15/26 × last salary × years) and the exact s.10(10) tax exemption — least of the formula, ₹20 lakh, and the amount received.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/gratuity" },
};

export default function Page() {
  return <GratuityCalculator />;
}
