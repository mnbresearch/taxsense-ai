import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxSense AI — Indian income-tax copilot",
    short_name: "TaxSense",
    description:
      "Talk, don't form-fill. Both regimes computed, deductions quantified, filing-ready PDF. An MNB Research product with Abrobot.ai.",
    id: "/app",
    start_url: "/app",
    display: "standalone",
    orientation: "portrait",
    categories: ["finance", "productivity", "business"],
    shortcuts: [
      { name: "Compute my tax", url: "/app", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "60-second Tax Guide", url: "/guide", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Deadlines", url: "/deadlines", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Pricing", url: "/pricing", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
    background_color: "#0d1412",
    theme_color: "#0d5947",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
