import type { Metadata } from "next";
import Breakeven from "./Breakeven";

export const metadata: Metadata = {
  title: "Old vs New Regime Breakeven Matrix FY 2025-26 | TaxSense AI",
  description:
    "For each income level, the exact deduction amount where the old regime starts beating the new — computed by a deterministic FY 2025-26 engine, not a rule of thumb.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/breakeven" },
};

export default function Page() {
  return <Breakeven />;
}
