import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://taxsense-ai.vercel.app";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/app`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/guide`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/deadlines`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/learn`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
