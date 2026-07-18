import type { Metadata } from "next";
import SlabExplorer from "./SlabExplorer";

export const metadata: Metadata = {
  title: "Income-tax Slab & Rebate Explorer FY 2025-26 — see the 87A cliff | TaxSense AI",
  description:
    "Interactive tax-vs-income curve for both regimes, FY 2025-26. Watch the section 87A rebate vanish at ₹12L, see marginal relief smooth the cliff, and understand why the new regime is default.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/slabs" },
};

export default function Page() {
  return <SlabExplorer />;
}
