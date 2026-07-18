import type { Metadata } from "next";
import ProCatalog from "./ProCatalog";

export const metadata: Metadata = {
  title: "TaxSense AI for Professionals — tools for law students, lawyers & firms",
  description:
    "A professional suite built on a deterministic FY 2025-26 tax engine: s.234 interest calculator, regime breakeven matrix, statute quick-reference, slab explorer and a multi-client workbook.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/professional" },
};

export default function Page() {
  return <ProCatalog />;
}
