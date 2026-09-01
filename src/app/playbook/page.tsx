import type { Metadata } from "next";
import PlaybookClient from "./PlaybookClient";

export const metadata: Metadata = {
  title: "The Tax-Saving Playbook — 14 Legal Strategies with Real Numbers | TaxSense AI",
  description:
    "How people actually save tax in India — presumptive taxation, depreciation timing, 80JJAA hiring deductions, employer NPS, rent to parents, HUFs, harvesting — every strategy with the section, the ₹ math, and the honest watch-outs.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/playbook" },
  openGraph: {
    title: "The Tax-Saving Playbook — TaxSense AI",
    description: "14 legal strategies + engine-verified case studies. A ₹30L freelancer paying ₹1.09L tax is not a loophole — it's the law, used properly.",
  },
};

export default function Page() {
  return <PlaybookClient />;
}
