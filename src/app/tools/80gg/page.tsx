import type { Metadata } from "next";
import Gg80Calculator from "./Gg80Calculator";

export const metadata: Metadata = {
  title: "Section 80GG Calculator — rent deduction WITHOUT HRA, FY 2025-26 | TaxSense AI",
  description:
    "No HRA in your salary? Section 80GG still gives a rent deduction — the least of ₹5,000/month, 25% of income, and rent minus 10% of income. Compute it exactly, with the Form 10BA checklist.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/80gg" },
};

export default function Page() {
  return <Gg80Calculator />;
}
