import type { Tier } from "@/prototype/fixtures";

/** Derive a clean ~155-char description from the first prose paragraph of a doc body. */
export function describe(body: string): string {
  const firstPara = body
    .replace(/^#.*$/gm, "") // drop any heading lines
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .find((s) => s.length > 0);
  if (!firstPara) return "Documentation for the Citrate Network.";
  return firstPara.length > 155 ? firstPara.slice(0, 152).trimEnd() + "..." : firstPara;
}

const GATED_DESCRIPTION = "Access-gated Citrate documentation. Sign in with the required entitlement to read this document.";

/**
 * The public `<meta description>` / OpenGraph / Twitter description for a doc.
 *
 * DOC-B-008: the description is derived from the body ONLY for public-tier docs. For any gated tier
 * the body is never used — an unauthenticated crawler hitting a gated slug must not receive the
 * opening prose of a document it cannot read. This holds even if a body were (re)embedded in the
 * client-imported meta by a generator regression: the tier — not the presence of a body — decides.
 */
export function docDescription(doc: { tier: Tier; body?: string | null; summary?: string | null }): string {
  if (doc.tier === "public") return describe(doc.body ?? "");
  return doc.summary?.trim() || GATED_DESCRIPTION;
}
