import { NAV, NavNode } from "@/prototype/fixtures";
import { CONTENT_NAV } from "@/content/_generated/content";

/**
 * The Codex sidebar = the content-pipeline groups (authored/transcluded pages, from content/**) plus the
 * fixtures-only demo groups that aren't file-backed (Start Here, Sandboxes, the Enterprise org/embargo
 * demo, Internal/Audit, Admin Console). Content groups are authoritative for the doc sections; we only
 * cherry-pick the special interactive/demo groups from fixtures to avoid duplication.
 */
const fx = Object.fromEntries(NAV.map((g) => [g.id, g]));

export const MERGED_NAV: NavNode[] = [
  fx["start"],
  ...CONTENT_NAV,
  fx["sandboxes"],
  fx["enterprise"],
  fx["internal"],
  fx["admin"],
].filter(Boolean) as NavNode[];
