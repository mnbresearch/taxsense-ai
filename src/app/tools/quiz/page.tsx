import type { Metadata } from "next";
import Quiz from "./Quiz";

export const metadata: Metadata = {
  title: "Income-tax Law Quiz FY 2025-26 — 12 questions from real practice | TaxSense AI",
  description:
    "Test yourself on 87A, HRA, 44ADA, 234 interest, 112A, penalties and TDS — every answer explained with the section. Built for law students and young practitioners.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/quiz" },
};

export default function Page() {
  return <Quiz />;
}
