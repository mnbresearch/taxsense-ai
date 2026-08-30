import type { Metadata } from "next";
import AuditSuite from "./AuditSuite";

export const metadata: Metadata = {
  title: "Tax Audit (44AB) Checker + Partnership 40(b) & Company Tax Calculator | TaxSense AI",
  description:
    "Do you need a tax audit? The 44AB limits with every presumptive trap (44AD(5), 44ADA(4), the 5-year lock-in), the s.40(b) partner-remuneration ceiling, firm tax, and the 115BAA/115BAB company comparison.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/audit" },
};

export default function Page() {
  return <AuditSuite />;
}
