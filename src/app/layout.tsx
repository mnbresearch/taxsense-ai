import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://taxsense-ai.vercel.app"),
  title: "TaxSense AI — file smarter, not harder",
  description:
    "AI-native income-tax copilot for India. Old vs new regime optimisation, deduction discovery, and a filing-ready summary — from one conversation. FY 2025-26.",
  openGraph: {
    title: "TaxSense AI — your taxes, figured out in one conversation",
    description:
      "Talk to it like a sharp CA. Both regimes computed section-by-section, deductions quantified in ₹, filing-ready PDF. By MNB Research × Abrobot.ai.",
    url: "https://taxsense-ai.vercel.app",
    siteName: "TaxSense AI",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TaxSense AI — income-tax copilot for India" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaxSense AI — your taxes, figured out in one conversation",
    description: "Both regimes computed, deductions quantified in ₹, filing-ready PDF. FY 2025-26.",
    images: ["/og.png"],
  },
};

import UpdateWatcher from "./UpdateWatcher";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}<UpdateWatcher /></body>
    </html>
  );
}
