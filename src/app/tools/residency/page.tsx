import type { Metadata } from "next";
import ResidencyDesk from "./ResidencyDesk";

export const metadata: Metadata = {
  title: "NRI Residential Status Checker (ROR/RNOR/NR) + Gift Tax Checker | TaxSense AI",
  description:
    "Section 6 day-count rules with every relaxation — the 182/120/60-day limbs, deemed residency, RNOR conditions — plus the s.56(2)(x) gift taxability checker with the relative exemption.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/residency" },
};

export default function Page() {
  return <ResidencyDesk />;
}
