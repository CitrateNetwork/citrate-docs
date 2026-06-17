import type { MetadataRoute } from "next";
import { CONTENT_DOCS } from "@/content/_generated/content";

const SITE_URL = "https://citrate-atlas.vercel.app";

// Only public pages belong in the sitemap. Gated docs (commercial/academic/confidential) are excluded so
// crawlers do not surface routes a visitor cannot read.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-17");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/cookies`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];

  const docRoutes: MetadataRoute.Sitemap = Object.values(CONTENT_DOCS)
    .filter((d) => d.tier === "public")
    .map((d) => ({
      url: `${SITE_URL}${d.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...docRoutes];
}
