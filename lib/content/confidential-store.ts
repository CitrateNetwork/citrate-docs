/**
 * Confidential content store — PUBLIC-REPO FALLBACK (fail-closed).
 *
 * Confidential doc BODIES never live in this repo. The content generator is explicit
 * ("confidential bodies are never authored into content/"), and the runtime gateway
 * (app/api/content/[...slug]/route.ts) fetches them "from the server-only store (prod: the
 * private home repo)". This module exists so the app TYPE-CHECKS and BUILDS in the public
 * repo (and any build without the private overlay) while shipping NO confidential content:
 * an empty doc set and a DENY authorizer. A confidential read therefore fails closed —
 * route.ts returns 404 and never reveals that a confidential doc exists.
 *
 * A private/confidential deployment OVERLAYS the real store (with the actual CONFIDENTIAL_DOCS
 * / CONFIDENTIAL_DISCLOSURES and the real tier/org/role/expiry gate) from the private home
 * repo at build time. That overlay MUST NOT be committed here — this repo is public.
 */

export type ConfidentialTier = "public" | "commercial" | "academic" | "confidential";

export interface ConfidentialDoc {
  slug: string;
  title: string;
  tier: ConfidentialTier;
  orgId: string | null;
  body: string;
  source?: string;
  disclosureId?: string;
  disclosureRequired?: boolean;
  embargoUntil?: number;
}

export interface ConfidentialDisclosure {
  id: string;
  title?: string;
  body?: string;
}

/** Empty in the public repo — no confidential bodies ship here. */
export const CONFIDENTIAL_DOCS: Record<string, ConfidentialDoc> = {};

/** Empty in the public repo. */
export const CONFIDENTIAL_DISCLOSURES: Record<string, ConfidentialDisclosure> = {};

/**
 * Fail-closed authorization. With no confidential content in this build, every confidential
 * read is denied (the caller returns a 404, never revealing existence). A private overlay
 * replaces this with the real tier ∧ org ∧ role ∧ ¬expired gate.
 */
export function authorizeConfidentialRead(
  _session: unknown,
  _doc: ConfidentialDoc,
  _now: number,
): boolean {
  return false;
}
