import type { Metadata } from "next";
import HraCalculator from "./HraCalculator";

export const metadata: Metadata = {
  title: "HRA Exemption Calculator FY 2025-26 (Section 10(13A), Rule 2A) | TaxSense AI",
  description:
    "Free HRA exemption calculator for FY 2025-26 — the exact min-of-three Rule 2A formula: HRA received, rent minus 10% of basic, 50%/40% of basic+DA. See how much of your HRA is tax-free.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/hra" },
  openGraph: {
    title: "HRA Exemption Calculator FY 2025-26 — TaxSense AI",
    description: "The exact Rule 2A min-of-three formula, computed instantly. Old regime only — and we'll tell you if the new regime beats it anyway.",
  },
};

export default function Page() {
  return <HraCalculator />;
}
