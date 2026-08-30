import type { Metadata } from "next";
import TdsSuite from "./TdsSuite";

export const metadata: Metadata = {
  title: "TDS Rate Finder FY 2025-26 + Interest & Late-Fee Calculator (201(1A), 234E) | TaxSense AI",
  description:
    "Every TDS section that matters with post-Budget-2025 thresholds — 194A, 194C, 194H, 194I, 194J, 194Q, the new 194T — plus 201(1A) interest, 234E fees and the deductor's calendar.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/tds-rates" },
};

export default function Page() {
  return <TdsSuite />;
}
