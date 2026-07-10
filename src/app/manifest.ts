import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxSense AI — Indian income-tax copilot",
    short_name: "TaxSense",
    description:
      "Talk, don't form-fill. Both regimes computed, deductions quantified, filing-ready PDF. An MNB Research product with Abrobot.ai.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0d1412",
    theme_color: "#0d5947",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
