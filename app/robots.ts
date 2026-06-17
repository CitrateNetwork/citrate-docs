import type { MetadataRoute } from "next";

const SITE_URL = "https://citrate-atlas.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Gated, interactive, or non-content routes stay out of the index.
      disallow: ["/api/", "/admin", "/settings", "/internal"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
