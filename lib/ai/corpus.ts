import "server-only";
import { AuthSession, Tier, canRead } from "@/prototype/fixtures";
import { CONTENT_DOCS } from "@/content/_generated/content";
import { CONFIDENTIAL_DOCS, authorizeConfidentialRead, type ConfidentialDoc } from "@/lib/content/confidential-store";
import { recordAccess } from "@/lib/content/access-log";

/**
 * S4 — the Ask Codex retrieval corpus + TIER-AWARE retrieval (the safety control).
 *
 * Server-only: it includes the Confidential bodies, so it must never reach the client. Retrieval filters
 * to what the caller `canRead` BEFORE scoring/returning — so an above-tier (or wrong-org) chunk can never
 * enter the model's context or the citations (PLANSET/03 `AgentRespectsTier`). The guardrail prompt is
 * defense-in-depth; THIS filter is the control.
 *
 * PBA-L3c-004 (CIT-DOCS-004 residual): every body-returning path (Ask chat via `retrieve`, MCP
 * `searchDocs` via `retrieve`, MCP `getSurface` via `readSurface`) goes through ONE chokepoint,
 * {@link authorizeChunk}, with the same rules as /api/content: the confidential store's
 * `authorizeConfidentialRead` (tier ∧ org ∧ allowedRoles ∧ ¬expired) for confidential docs and
 * `canRead` for the rest, then embargo, then the disclosure ack, and every confidential body served
 * is access-logged (fail closed: an unloggable read is not served). RAG cannot carry an ack, so
 * disclosure-gated and embargoed docs never enter retrieval.
 */
export interface Chunk {
  slug: string;
  title: string;
  tier: Tier;
  orgId: string | null;
  text: string;
  /** Set for confidential-store docs: the gate + logging rules come from this record. */
  confidential?: ConfidentialDoc;
  embargoUntil?: number | null;
  disclosureRequired?: boolean;
  disclosureId?: string;
}

let CORPUS: Chunk[] | null = null;
function corpus(): Chunk[] {
  if (CORPUS) return CORPUS;
  const out: Chunk[] = [];
  for (const d of Object.values(CONTENT_DOCS)) {
    if (d.body) {
      out.push({
        slug: d.slug, title: d.title, tier: d.tier, orgId: d.orgId ?? null, text: d.body,
        embargoUntil: d.embargoUntil ?? null, disclosureRequired: d.disclosureRequired, disclosureId: d.disclosureId,
      });
    }
  }
  for (const d of Object.values(CONFIDENTIAL_DOCS)) {
    out.push({
      slug: d.slug, title: d.title, tier: d.tier, orgId: d.orgId, text: d.body, confidential: d,
      embargoUntil: d.embargoUntil ?? null, disclosureRequired: d.disclosureRequired, disclosureId: d.disclosureId,
    });
  }
  CORPUS = out;
  return out;
}

const STOP = new Set(["the", "a", "an", "of", "to", "is", "and", "in", "on", "for", "how", "what", "do", "does", "i", "with", "by", "at", "are", "can"]);
function terms(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 2 && !STOP.has(t));
}

export type ChunkDecision = "ok" | "denied" | "embargo" | "disclosure_required";

/**
 * The single read chokepoint for corpus bodies (PBA-L3c-004). `ack` is the disclosure id the caller
 * acknowledged (null when the path cannot carry one, i.e. RAG).
 */
export function authorizeChunk(session: AuthSession, c: Chunk, now: number, ack: string | null): ChunkDecision {
  const allowed = c.confidential
    ? authorizeConfidentialRead(session, c.confidential, now)
    : canRead(session, { tier: c.tier, orgId: c.orgId }, now);
  if (!allowed) return "denied";
  if (c.embargoUntil && now < c.embargoUntil) return "embargo";
  if (c.disclosureRequired && (ack === null || ack !== c.disclosureId)) return "disclosure_required";
  return "ok";
}

/** Record a confidential body being served. Non-confidential chunks need no log entry. */
function logServed(session: AuthSession, c: Chunk, now: number, ackd: boolean): boolean {
  if (!c.confidential) return true;
  return recordAccess({ sub: session.sub ?? "unknown", docSlug: c.slug, tier: c.tier, orgId: c.orgId, disclosureAck: ackd, at: now });
}

export function retrieve(session: AuthSession, query: string, k: number, now: number): Chunk[] {
  const ts = terms(query);
  // TIER-AWARE FILTER — before any scoring. This is the control, not the prompt.
  const readable = corpus().filter((c) => authorizeChunk(session, c, now, null) === "ok");
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
    .map((x) => x.c)
    // Every confidential chunk that leaves here is logged; one that cannot be logged is dropped.
    .filter((c) => logServed(session, c, now, false));
}

export type SurfaceResult =
  | { ok: true; chunk: Chunk }
  | { ok: false; error: "not_found_or_above_tier" | "embargo" | "disclosure_required" | "access_log_unavailable" };

/** Fetch one surface's body for `session` through the chokepoint (MCP getSurface). */
export function readSurface(session: AuthSession, slug: string, now: number, ack: string | null): SurfaceResult {
  const c = corpus().find((x) => x.slug === slug);
  if (!c) return { ok: false, error: "not_found_or_above_tier" };
  const decision = authorizeChunk(session, c, now, ack);
  // Never reveal that a doc exists to a caller who may not read it.
  if (decision === "denied") return { ok: false, error: "not_found_or_above_tier" };
  if (decision !== "ok") return { ok: false, error: decision };
  if (!logServed(session, c, now, Boolean(c.disclosureRequired))) return { ok: false, error: "access_log_unavailable" };
  return { ok: true, chunk: c };
}
