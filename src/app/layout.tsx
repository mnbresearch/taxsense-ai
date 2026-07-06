import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxSense AI — file smarter, not harder",
  description:
    "AI-native income-tax copilot for India. Old vs new regime optimisation, deduction discovery, and a filing-ready summary — from one conversation. FY 2025-26.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
