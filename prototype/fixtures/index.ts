/**
 * Citrate Codex — fixture barrel + `mockApi` resolver.
 *
 * `mockApi` is the drop-in seam: its method names mirror the `/api/*` routes in DESIGN_BRIEF §14, every
 * method takes the current `AuthSession`, and every read passes through `canRead`/`visibility` exactly
 * like the real server's single chokepoint. To wire in for real, replace each method body with a fetch
 * to the matching route — the return shapes are already the §14 contracts.
 *
 * Usage in the prototype:
 *   import { mockApi, VIEWERS, DEFAULT_VIEWER } from "@/prototype/fixtures";
 *   const [viewerId, setViewerId] = useState(DEFAULT_VIEWER.id);   // dev-mode tier switcher
 *   const session = mockApi.getSession(viewerId);
 *   const nav = mockApi.getNav(session);
 *   const page = mockApi.getDoc(session, "/internal/audit");
 */

export * from "./types";
export * from "./viewers";
export * from "./content";
export * from "./ask";
export * from "./sandboxes";
export * from "./settings";
export * from "./admin";

import {
  AuthSession, DocResponse, GateCard, NavNode, SearchResult, Tier,
} from "./types";
import {
  VIEWERS_BY_ID, DEFAULT_VIEWER, FIXED_NOW, canRead, filterNav, isAdmin, resolveTier, visibility,
} from "./viewers";
import { DOCS, DISCLOSURES, NAV, SEARCH_RESULTS } from "./content";
import { SAMPLE_STREAM, THREADS } from "./ask";
import {
  CHAIN_STATUS, SANDBOX_DAG, SANDBOX_INFERENCE, SANDBOX_RELAY, SANDBOX_RPC, SANDBOX_X402,
} from "./sandboxes";
import { API_KEYS, DEFAULT_PREFS, MY_ACCESS_LOG, SUBSCRIPTIONS } from "./settings";
import {
  EMBARGOES, GLOBAL_ACCESS_LOG, ORGS, PRINCIPALS, SANDBOX_CONFIG, SYNC_STATUS,
} from "./admin";

/** Mutable in-memory disclosure acks so the prototype can demo the acknowledge → render flow. */
const ACKS = new Set<string>();
const ackKey = (sub: string | undefined, disclosureId: string) => `${sub ?? "anon"}:${disclosureId}`;

function gateCardFor(slug: string, doc?: import("./types").Doc): GateCard {
  doc = doc ?? DOCS[slug];
  const requiredTier: Tier = doc?.tier ?? "commercial";
  const cta: GateCard["cta"] =
    requiredTier === "academic"
      ? { label: "Apply for research access", action: "apply_research" }
      : requiredTier === "confidential"
        ? { label: "Contact an administrator", action: "contact_admin" }
        : { label: "Request a seat", action: "request_seat" };
  return {
    locked: true,
    slug,
    title: doc?.title ?? "Locked",
    summary: doc ? `${doc.title} — available at the ${requiredTier} tier.` : "Locked content.",
    requiredTier,
    cta,
  };
}

/** The single doc-gate evaluation — mirrors the sidebar's visibility exactly. */
function evaluateDoc(session: AuthSession, doc: import("./types").Doc, now = FIXED_NOW): DocResponse {
  const vis = visibility(session, doc, now);
  if (vis === "hidden") return { kind: "not_found" }; // Confidential or wrong-org → 404
  if (vis === "locked") return { kind: "gate", gate: gateCardFor(doc.slug, doc) };
  if (doc.embargoUntil && now < doc.embargoUntil) {
    return { kind: "embargo", until: doc.embargoUntil, title: doc.title };
  }
  if (doc.disclosureRequired && doc.disclosureId && !ACKS.has(ackKey(session.sub, doc.disclosureId))) {
    return {
      kind: "disclosure_required",
      disclosureId: doc.disclosureId,
      doc: { slug: doc.slug, title: doc.title, tier: doc.tier },
    };
  }
  return { kind: "doc", doc };
}

export const mockApi = {
  /* ── identity / session ─────────────────────────────────────────────────── */
  getSession(viewerId: string): AuthSession {
    return (VIEWERS_BY_ID[viewerId] ?? DEFAULT_VIEWER).session;
  },
  resolveTier(session: AuthSession, now = FIXED_NOW): Tier {
    return resolveTier(session, now);
  },

  /* ── navigation ─────────────────────────────────────────────────────────── */
  getNav(session: AuthSession, now = FIXED_NOW): NavNode[] {
    return filterNav(NAV, session, now);
  },

  /* ── content (the gate lives here) ──────────────────────────────────────── */
  getDoc(session: AuthSession, slug: string, now = FIXED_NOW): DocResponse {
    const doc = DOCS[slug];
    if (!doc) return { kind: "not_found" };
    return evaluateDoc(session, doc, now);
  },

  /** Run any Doc (fixture OR content-pipeline) through the access gate. Same chokepoint either way. */
  evaluateDoc(session: AuthSession, doc: import("./types").Doc, now = FIXED_NOW): DocResponse {
    return evaluateDoc(session, doc, now);
  },

  getDisclosure(id: string) {
    return DISCLOSURES[id] ?? null;
  },
  ackDisclosure(session: AuthSession, disclosureId: string) {
    ACKS.add(ackKey(session.sub, disclosureId));
    return { acknowledged: true, at: FIXED_NOW };
  },

  /* ── search (no above-tier hits) ────────────────────────────────────────── */
  search(session: AuthSession, _q: string, now = FIXED_NOW): SearchResult[] {
    return SEARCH_RESULTS.filter((r) => canRead(session, { tier: r.tier, orgId: docOrg(r.slug) }, now));
  },

  /* ── Ask Codex ──────────────────────────────────────────────────────────── */
  getThreads(session: AuthSession) {
    return session.authenticated ? THREADS : []; // anonymous = ephemeral, no saved history
  },
  /** Returns a canned stream with citations re-filtered to the caller's tier (AgentRespectsTier). */
  ask(session: AuthSession, _question: string, now = FIXED_NOW) {
    const citations = SAMPLE_STREAM.citations.filter((c) =>
      canRead(session, { tier: c.tier, orgId: docOrg(c.slug) }, now)
    );
    return { ...SAMPLE_STREAM, citations };
  },

  /* ── sandboxes (public; fail-closed handled in sandboxes.ts variants) ────── */
  getChainStatus() { return CHAIN_STATUS; },
  sandboxDag() { return SANDBOX_DAG; },
  sandboxRelay() { return SANDBOX_RELAY; },
  sandboxX402() { return SANDBOX_X402; },
  sandboxInference() { return SANDBOX_INFERENCE.state; },
  sandboxRpc() { return SANDBOX_RPC; },

  /* ── settings ───────────────────────────────────────────────────────────── */
  getPrefs(_session: AuthSession) { return DEFAULT_PREFS; },
  getSubscriptions(_session: AuthSession) { return SUBSCRIPTIONS; },
  getApiKeys(_session: AuthSession) { return API_KEYS; },
  getMyAccessLog(session: AuthSession) {
    return MY_ACCESS_LOG.filter((r) => r.sub === session.sub);
  },

  /* ── admin (role-gated; non-admins get null — render 404, never reveal) ──── */
  adminEntitlements(session: AuthSession) { return isAdmin(session) ? PRINCIPALS : null; },
  adminOrgs(session: AuthSession) { return isAdmin(session) ? ORGS : null; },
  adminSync(session: AuthSession) { return isAdmin(session) ? SYNC_STATUS : null; },
  adminEmbargoes(session: AuthSession) { return isAdmin(session) ? EMBARGOES : null; },
  adminAccessLog(session: AuthSession) { return isAdmin(session) ? GLOBAL_ACCESS_LOG : null; },
  adminSandboxConfig(session: AuthSession) { return isAdmin(session) ? SANDBOX_CONFIG : null; },

  /* ── helpers exposed for components ─────────────────────────────────────── */
  visibility,
  canRead,
  isAdmin,
};

/** Look up a doc's org scope (used by search/citation filtering). */
function docOrg(slug: string): string | null | undefined {
  return DOCS[slug]?.orgId ?? null;
}

export type MockApi = typeof mockApi;
