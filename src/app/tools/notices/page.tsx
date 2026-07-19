import type { Metadata } from "next";
import NoticeHelper from "./NoticeHelper";

export const metadata: Metadata = {
  title: "Income-tax Notice Helper — 143(1), 139(9), 143(2), 148A, 245 | TaxSense AI",
  description:
    "Got an income-tax notice? Identify it, understand the clock it starts, and work a practitioner's response checklist — from routine CPC intimations to 148A reassessment show-causes.",
  alternates: { canonical: "https://taxsense-ai.vercel.app/tools/notices" },
};

export default function Page() {
  return <NoticeHelper />;
}
