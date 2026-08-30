import type { Metadata } from "next";
import GstSuite from "./GstSuite";

export const metadata: Metadata = {
  title: "GST Toolkit — Registration, Composition, Late Fee & Interest Calculator | TaxSense AI",
  description:
    "Do you need GST registration? Composition scheme eligibility and tax, GSTR-3B/GSTR-1 late fees with caps, section 50 interest on net cash liability, and the full compliance calendar.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/tools/gst" },
};

export default function Page() {
  return <GstSuite />;
}
