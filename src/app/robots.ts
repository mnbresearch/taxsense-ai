import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/s/"] }],
    sitemap: "https://taxsense-ai.vercel.app/sitemap.xml",
  };
}
