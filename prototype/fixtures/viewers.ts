/**
 * Demo viewers + the access-control helpers (the single chokepoint, in fixture form).
 *
 * The dev-mode tier switcher (DESIGN_BRIEF §6.2) cycles through VIEWERS so the prototype can show every
 * state without a real IdP. `canRead` / `visibility` are the fixture mirror of resolveTier/canRead in
 * PLANSET/02_ARCHITECTURE.md §4 — keep this logic identical to the server when you wire in.
 */

import { AuthSession, Entitlement, NavNode, NodeVisibility, Tier, TIER_RANK, Viewer, normalizeTier } from "./types";

const NOW = 1_780_000_000_000; // fixed epoch-ms so fixtures are deterministic (no Date.now()).
export const FIXED_NOW = NOW;
const DAY = 86_400_000;

function session(partial: Partial<AuthSession> & { kycStatus: AuthSession["kycStatus"] }): AuthSession {
  return { required: false, authenticated: false, ...partial };
}

export const VIEWERS: Viewer[] = [
  {
    id: "anonymous",
    label: "Anonymous",
    description: "No login. Public tier only — full handbook + sandboxes + Ask (public corpus).",
    session: session({ kycStatus: "none" }),
  },
  {
    id: "builder",
    label: "KYC'd builder",
    description: "Authenticated + KYC verified, no org seat. Unlocks the C·kyc implementation track.",
    session: session({
      authenticated: true,
      sub: "uuid:7f3c1a90-builder",
      walletAddress: "0xb1d4...a77c",
      email: "dev@example.com",
      kycStatus: "verified",
      entitlement: { tier: "commercial", orgId: null, expiresAt: null },
    }),
  },
  {
    id: "enterprise",
    label: "Enterprise seat (Boeing)",
    description: "Commercial seat scoped to org 'boeing'. Sees Boeing's private space, not other orgs'.",
    session: session({
      authenticated: true,
      sub: "uuid:enterprise-boeing-014",
      walletAddress: "0xee01...b00e",
      email: "architect@boeing.example",
      kycStatus: "verified",
      entitlement: { tier: "commercial", orgId: "boeing", milestone: "production", expiresAt: null },
    }),
  },
  {
    id: "academic",
    label: "Academic partner (Rutgers)",
    description: "Academic tier — full Gradient Papers, TLA+ corpus, research portal, testnet access.",
    session: session({
      authenticated: true,
      sub: "uuid:rutgers-sarwate-pi",
      email: "pi@winlab.rutgers.example",
      kycStatus: "verified",
      entitlement: { tier: "academic", orgId: "rutgers", milestone: "phase-1-lab", expiresAt: null },
    }),
  },
  {
    id: "admin",
    label: "Administrator",
    description: "Confidential + admin role. Sees everything incl. Internal/Audit + the Admin Console.",
    session: session({
      authenticated: true,
      sub: "uuid:citrate-admin-saul",
      walletAddress: "0x4250...00c6",
      email: "saul@citrate.ai",
      kycStatus: "verified",
      entitlement: { tier: "confidential", orgId: null, citrateRole: "admin", expiresAt: null },
    }),
  },
  {
    id: "auditor",
    label: "Auditor (Trail of Bits, time-gated)",
    description: "Confidential, scoped to engagement 'audit:2026-06', expires in 30 days. Disclosure-gated.",
    session: session({
      authenticated: true,
      sub: "uuid:tob-auditor-21",
      email: "auditor@trailofbits.example",
      kycStatus: "verified",
      entitlement: {
        tier: "confidential",
        orgId: "audit:2026-06",
        citrateRole: "auditor_tob",
        milestone: "security-audit-fieldwork",
        expiresAt: NOW + 30 * DAY,
      },
    }),
  },
  {
    id: "auditor_expired",
    label: "Auditor (expired)",
    description: "Same as above but past expires_at — demonstrates EntitlementExpiry collapsing to Public.",
    session: session({
      authenticated: true,
      sub: "uuid:tob-auditor-21",
      email: "auditor@trailofbits.example",
      kycStatus: "verified",
      entitlement: {
        tier: "confidential",
        orgId: "audit:2026-06",
        citrateRole: "auditor_tob",
        expiresAt: NOW - 1 * DAY,
      },
    }),
  },
];

export const VIEWERS_BY_ID: Record<string, Viewer> = Object.fromEntries(VIEWERS.map((v) => [v.id, v]));
export const DEFAULT_VIEWER = VIEWERS_BY_ID.anonymous;

export function isAdmin(s: AuthSession): boolean {
  const role = s.entitlement?.citrateRole;
  return role === "admin" || role === "exec";
}

/** Effective tier after expiry collapse (EntitlementExpiry). Mirror the server exactly. */
export function resolveTier(s: AuthSession, now = NOW): Tier {
  const e: Entitlement | undefined = s.entitlement;
  if (!e) return "public";
  if (e.expiresAt != null && now >= e.expiresAt) return "public";
  // The session is JSON off the wire, so `e.tier` is only Tier by convention. Normalize: an unmapped
  // string would make TIER_RANK[tier] undefined, and `undefined >= 0` is false — which silently denies
  // Public docs to a signed-in reader instead of granting them.
  return normalizeTier(e.tier);
}

/** Org scope check: a node tagged to an org is only readable by that org (or an admin). */
function orgOk(s: AuthSession, nodeOrg?: string | null): boolean {
  if (!nodeOrg) return true; // general-tier content, no org restriction
  if (isAdmin(s)) return true;
  return s.entitlement?.orgId === nodeOrg;
}

/** The chokepoint: tier ∧ org ∧ ¬expired. (Disclosure is handled separately at render time.) */
export function canRead(
  s: AuthSession,
  node: { tier: Tier; orgId?: string | null },
  now = NOW
): boolean {
  const viewerRank = TIER_RANK[resolveTier(s, now)];
  return viewerRank >= TIER_RANK[node.tier] && orgOk(s, node.orgId);
}

/**
 * Visibility derivation for the sidebar/search (DESIGN_BRIEF §5.3):
 * - readable                         → "visible"
 * - Confidential + not readable      → "hidden" (never reveal existence; URL 404s)
 * - Org-scoped + wrong org           → "hidden" (a customer sees only its own space)
 * - Commercial/Academic + not readable (no org mismatch) → "locked" (visible-locked gate card)
 */
export function visibility(
  s: AuthSession,
  node: { tier: Tier; orgId?: string | null },
  now = NOW
): NodeVisibility {
  if (canRead(s, node, now)) return "visible";
  if (node.tier === "confidential") return "hidden";
  if (!orgOk(s, node.orgId)) return "hidden"; // org-scoped content is invisible to other orgs
  return "locked";
}

/** Filter a nav tree for a viewer: drop hidden nodes, keep locked (rendered as locked), recurse. */
export function filterNav(nodes: NavNode[], s: AuthSession, now = NOW): NavNode[] {
  return nodes
    .map((n) => {
      const vis = visibility(s, n, now);
      if (vis === "hidden") return null;
      const children = n.children ? filterNav(n.children, s, now) : undefined;
      return { ...n, children } as NavNode;
    })
    .filter((n): n is NavNode => n !== null)
    // drop empty groups that became childless after filtering (unless they are themselves a doc/leaf)
    .filter((n) => n.slug != null || n.kind === "sandbox" || (n.children?.length ?? 0) > 0);
}
