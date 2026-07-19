import type { Metadata } from "next";
import HarvestPlanner from "./HarvestPlanner";

export const metadata: Metadata = {
  title: "LTCG Harvesting Planner — use the ₹1.25L exemption every year | TaxSense AI",
  description:
    "Section 112A exempts ₹1.25L of long-term equity gains every year — unused, it's gone. Compute how much to harvest this FY and the 12.5% tax you permanently avoid.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/harvest" },
};

export default function Page() {
  return <HarvestPlanner />;
}
