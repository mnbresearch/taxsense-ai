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
    { url: `${base}/compare`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tools/hra`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/professional`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/tools/slabs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/sections`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/interest`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/breakeven`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tools/quiz`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/tds`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tools/notices`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/calendar`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tools/harvest`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/80gg`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
