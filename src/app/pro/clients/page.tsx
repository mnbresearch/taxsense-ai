import type { Metadata } from "next";
import Workbook from "./Workbook";

export const metadata: Metadata = {
  title: "Client Workbook — every client's tax position in one table | TaxSense AI",
  description: "Multi-client tax management for firms: each client's regime call and liability at a glance, one click into the full workspace.",
  robots: { index: false },
};

export default function Page() {
  return <Workbook />;
}
