import type { Metadata } from "next";
import PropertyPlanner from "./PropertyPlanner";

export const metadata: Metadata = {
  title: "Property Sale Tax Planner — LTCG 12.5% vs Indexed 20%, s.54/54F/54EC | TaxSense AI",
  description:
    "Selling property? Compare the 12.5% no-indexation rate with the grandfathered 20% indexed option, then plan s.54, s.54F and s.54EC exemptions — reinvestment, bonds, CGAS — to a final tax figure.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/property" },
};

export default function Page() {
  return <PropertyPlanner />;
}
