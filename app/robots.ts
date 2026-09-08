import type { MetadataRoute } from "next";

const SITE_URL = "https://docs.citrate.ai";

// Gated, interactive, or non-content routes stay out of every index.
const DISALLOW = ["/api/", "/admin", "/settings", "/internal"];

// Answer-engine and generative crawlers are welcomed explicitly (AEO/GEO): the
// docs are meant to be a citable source for LLM answers, not walled off. Naming
// them keeps the intent unambiguous even where a crawler ignores the "*" rule.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "cohere-ai",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
