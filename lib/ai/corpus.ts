import "server-only";
import { AuthSession, Tier, canRead } from "@/prototype/fixtures";
import { CONTENT_DOCS } from "@/content/_generated/content";
import { CONFIDENTIAL_DOCS } from "@/lib/content/confidential-store";

/**
 * S4 — the Ask Codex retrieval corpus + TIER-AWARE retrieval (the safety control).
 *
 * Server-only: it includes the Confidential bodies, so it must never reach the client. Retrieval filters
 * to what the caller `canRead` BEFORE scoring/returning — so an above-tier (or wrong-org) chunk can never
 * enter the model's context or the citations (PLANSET/03 `AgentRespectsTier`). The guardrail prompt is
 * defense-in-depth; THIS filter is the control.
 */
export interface Chunk {
  slug: string;
  title: string;
  tier: Tier;
  orgId: string | null;
  text: string;
}

let CORPUS: Chunk[] | null = null;
function corpus(): Chunk[] {
  if (CORPUS) return CORPUS;
  const out: Chunk[] = [];
  for (const d of Object.values(CONTENT_DOCS)) {
    if (d.body) out.push({ slug: d.slug, title: d.title, tier: d.tier, orgId: d.orgId ?? null, text: d.body });
  }
  for (const d of Object.values(CONFIDENTIAL_DOCS)) {
    out.push({ slug: d.slug, title: d.title, tier: d.tier, orgId: d.orgId, text: d.body });
  }
  CORPUS = out;
  return out;
}

const STOP = new Set(["the", "a", "an", "of", "to", "is", "and", "in", "on", "for", "how", "what", "do", "does", "i", "with", "by", "at", "are", "can"]);
function terms(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 2 && !STOP.has(t));
}

export function retrieve(session: AuthSession, query: string, k = 5, now?: number): Chunk[] {
  const ts = terms(query);
  // TIER-AWARE FILTER — before any scoring. This is the control, not the prompt.
  const readable = corpus().filter((c) => canRead(session, { tier: c.tier, orgId: c.orgId }, now));
  if (!ts.length) return [];
  return readable
    .map((c) => {
      const hay = (c.title + " " + c.text).toLowerCase();
      let s = 0;
      for (const t of ts) {
        if (c.title.toLowerCase().includes(t)) s += 3;
        s += Math.min(hay.split(t).length - 1, 5);
      }
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.c);
}

export function getSurface(slug: string): Chunk | null {
  return corpus().find((c) => c.slug === slug) ?? null;
}
