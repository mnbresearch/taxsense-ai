import type { Metadata } from "next";
import ImportClient from "./ImportClient";

export const metadata: Metadata = {
  title: "Form 16 & AIS Import — auto-fill your return | TaxSense AI",
  description:
    "Paste your Form 16 (Part B) or AIS/TIS summary and TaxSense AI reads the numbers for you — gross salary, HRA, 80C/80D/NPS, interest, dividends, capital gains — so you stop typing and start reviewing. You confirm every figure before it's used.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/import" },
  openGraph: {
    title: "Form 16 & AIS Import — TaxSense AI",
    description: "Paste Form 16 / AIS, we extract every number for you to review. Free.",
  },
};

export default function Page() {
  return <ImportClient />;
}
