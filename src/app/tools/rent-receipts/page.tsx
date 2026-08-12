import type { Metadata } from "next";
import RentReceipts from "./RentReceipts";

export const metadata: Metadata = {
  title: "Rent Receipt Generator FY 2025-26 — Free, Print-Ready, HRA-Compliant | TaxSense AI",
  description:
    "Generate 12 months of print-ready rent receipts for your HRA claim in 30 seconds — revenue-stamp and landlord-PAN rules included. Free, and nothing leaves your browser.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/rent-receipts" },
  openGraph: {
    title: "Rent Receipt Generator FY 2025-26 — TaxSense AI",
    description: "12 print-ready receipts for your HRA claim, with the compliance rules baked in. Free.",
  },
};

export default function Page() {
  return <RentReceipts />;
}
