import type { Metadata } from "next";
import AdvanceTaxTool from "./AdvanceTaxTool";

export const metadata: Metadata = {
  title: "Advance Tax Calculator FY 2025-26 — Instalments, Due Dates, 234B/234C | TaxSense AI",
  description:
    "Enter your expected tax after TDS and get the exact 15%/45%/75%/100% instalment calendar (one-shot 15 March for 44AD/44ADA), with the 234B/234C interest rules that punish misses.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/advance-tax" },
};

export default function Page() {
  return <AdvanceTaxTool />;
}
