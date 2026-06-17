import { NAV, NavNode } from "@/prototype/fixtures";
import { CONTENT_NAV } from "@/content/_generated/content";

/**
 * The Codex sidebar = the content-pipeline groups (authored/transcluded pages, from content/**) plus the
 * fixtures-only demo groups that aren't file-backed (Start Here, Sandboxes, the Enterprise org/embargo
 * demo, Internal/Audit, Admin Console). Content groups are authoritative for the doc sections; we only
 * cherry-pick the special interactive/demo groups from fixtures to avoid duplication.
 */
const fx = Object.fromEntries(NAV.map((g) => [g.id, g]));

// CONTENT_NAV already covers start + enterprise (content/start/**, content/enterprise/**), so we do not
// re-add the fixtures start/enterprise groups (that duplicated them). We keep the fixtures-only groups
// that have no file-backed content: Sandboxes (app routes), Internal/Audit + Admin (gated, server-only).
export const MERGED_NAV: NavNode[] = [
  ...CONTENT_NAV,
  fx["sandboxes"],
  fx["internal"],
  fx["admin"],
].filter(Boolean) as NavNode[];
