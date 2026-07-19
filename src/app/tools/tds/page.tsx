import type { Metadata } from "next";
import TdsReconciler from "./TdsReconciler";

export const metadata: Metadata = {
  title: "Form 26AS TDS Reconciliation Tool | TaxSense AI",
  description:
    "Paste your Form 26AS text and get every TDS entry extracted, totalled by section, de-duplicated and reconciled against your return — entirely in your browser, nothing uploaded.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/tds" },
};

export default function Page() {
  return <TdsReconciler />;
}
