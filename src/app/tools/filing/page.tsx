import type { Metadata } from "next";
import FilingKit from "./FilingKit";

export const metadata: Metadata = {
  title: "ITR Filing Kit FY 2025-26 — Which ITR, Document Checklist & Scrutiny Radar | TaxSense AI",
  description:
    "Your personal pre-filing kit for AY 2026-27: which ITR form applies, the exact documents you need, red flags that trigger 143(1) notices, and a portal-accurate e-filing walkthrough.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/filing" },
  openGraph: {
    title: "ITR Filing Kit FY 2025-26 — TaxSense AI",
    description: "What a CA hands you before filing: ITR form, document checklist, scrutiny risk radar, step-by-step walkthrough.",
  },
};

export default function Page() {
  return <FilingKit />;
}
