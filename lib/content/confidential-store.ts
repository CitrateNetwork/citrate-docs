import "server-only";
import { canRead, type AuthSession, type Doc, type Tier } from "@/prototype/fixtures";

/**
 * S3, the SERVER-ONLY Confidential content store.
 *
 * `import "server-only"` makes the build FAIL if any client component imports this module, so Confidential
 * bodies can never reach the browser bundle (the core invariant; PLANSET/03 `ConfidentialNeverInBuild`).
 * In production the gateway fetches these bodies at request time from the PRIVATE home repos
 * (citrate-security/audits/, ops/, funding/, citrate-compliance/). For the prototype the bodies are
 * clearly-marked DEMO stand-ins, never real audit/ops/funding text, each tagged with the build-grep
 * sentinel so `verify:bundle` can prove none leaked into `.next/static`.
 */

/** Sentinel string the build-grep asserts is ABSENT from the client bundle. Must appear in every body. */
export const CONFIDENTIAL_SENTINEL = "CITRATE-CONFIDENTIAL-RUNTIME-ONLY";

export interface ConfidentialDoc {
  slug: string;
  title: string;
  tier: Tier; // always "confidential"
  orgId: string | null;
  /**
   * CIT-DOCS-004: per-doc principal scoping. When set, ONLY a session whose `citrateRole` is in this
   * allowlist may read the doc — even though it holds a valid confidential grant. `undefined` means the
   * doc is readable by any confidential principal (the flat-compartment default). This keeps the most
   * sensitive material (funding / data room) served "only to named principals" as its own text claims,
   * rather than to every holder of an engagement-scoped confidential credential.
   */
  allowedRoles?: string[];
  source: string; // the private home repo/path prod fetches from
  disclosureRequired: boolean;
  disclosureId?: string;
  embargoUntil?: number | null;
  body: string; // served only post-auth; never in the client bundle
}

const sentinel = `\n\n> ${CONFIDENTIAL_SENTINEL}, served at request time from its private home repo; access-logged; never in the build.\n`;

export const CONFIDENTIAL_DOCS: Record<string, ConfidentialDoc> = {
  "/internal/audit": {
    slug: "/internal/audit", title: "Audit reports & findings", tier: "confidential", orgId: null,
    source: "citrate-security/audits/", disclosureRequired: true, disclosureId: "audit-nda",
    body:
      "# Audit reports & findings" + sentinel +
      "_DEMO stand-in, production fetches the real reports from `citrate-security/audits/` at request time._\n\n" +
      "- 2026-06-09 pre-audit assessment, NET-1 Critical + consensus/bridge/auth Highs (remediation: SECREM-01).\n" +
      "- 2026-06-09 federation follow-up audit, 1 Critical + 9 High.\n" +
      "- Remediation logs + POAMs live per-repo under `audits/`; errata are append-only (Rule 3).\n",
  },
  "/internal/ops": {
    slug: "/internal/ops", title: "Ops pack", tier: "confidential", orgId: null,
    source: "ops/", disclosureRequired: true, disclosureId: "audit-nda",
    body:
      "# Ops pack" + sentinel +
      "_DEMO stand-in, production serves the real `ops/` pack (org design, role charters, SOP standard, readiness gates) post-auth._\n",
  },
  "/internal/funding": {
    slug: "/internal/funding", title: "Funding / data room", tier: "confidential", orgId: null,
    // CIT-DOCS-004: FOUNDER-CONFIDENTIAL — named principals only, NOT every confidential grant
    // (e.g. a time-gated security-engagement auditor must not read the data room / cap table).
    allowedRoles: ["admin", "exec"],
    source: "funding/docs/", disclosureRequired: true, disclosureId: "audit-nda",
    body:
      "# Funding / data room" + sentinel +
      "_DEMO stand-in, the real data room (valuation, strategy, cap table) is FOUNDER-CONFIDENTIAL and served only to named principals._\n",
  },
  "/internal/registers": {
    slug: "/internal/registers", title: "Compliance registers", tier: "confidential", orgId: null,
    source: "citrate-compliance/registers/", disclosureRequired: true, disclosureId: "audit-nda",
    body: "# Compliance registers" + sentinel +
      "_DEMO stand-in, roles/privileges matrix, audit-readiness, security-readiness from `citrate-compliance/registers/`, post-auth._\n",
  },
  "/internal/incident": {
    slug: "/internal/incident", title: "Incident response", tier: "confidential", orgId: null,
    source: "ops/ + citrate-security", disclosureRequired: true, disclosureId: "audit-nda",
    body: "# Incident response" + sentinel +
      "_DEMO stand-in, IR plans + reports; served only to named operators/auditors post-auth._\n",
  },
  "/internal/sops": {
    slug: "/internal/sops", title: "Internal SOPs", tier: "confidential", orgId: null,
    source: "ops/04_SOP_STANDARD.md", disclosureRequired: true, disclosureId: "audit-nda",
    body: "# Internal SOPs" + sentinel +
      "_DEMO stand-in, incident/access-review/hardware-disposal/FIPS-tracker SOPs from `ops/`, post-auth._\n",
  },
  "/enterprise/compliance-full": {
    slug: "/enterprise/compliance-full", title: "Compliance posture (full)", tier: "confidential", orgId: null,
    source: "citrate-compliance/", disclosureRequired: false, embargoUntil: 1_900_000_000_000,
    body:
      "# Compliance posture (full)" + sentinel +
      "_DEMO stand-in, full SOC 2 / CMMC L2 / FedRAMP posture from `citrate-compliance/`, post-embargo + post-auth._\n",
  },
};

export const CONFIDENTIAL_DISCLOSURES: Record<string, { id: string; title: string; body: string }> = {
  "audit-nda": {
    id: "audit-nda",
    title: "Confidential audit material, handling terms",
    body:
      "You are accessing Confidential material under an active engagement. By continuing you acknowledge " +
      "the NDA in force, that this access is logged, that you will not redistribute, and that your access " +
      "is time-limited to your engagement window.",
  },
};

/** Client-safe metadata (NO body) for the nav/index, safe to expose; the secret is the body only. */
export function confidentialMeta(): Record<string, Pick<Doc, "slug" | "title" | "tier" | "orgId" | "sourceKind" | "source" | "disclosureRequired" | "disclosureId" | "embargoUntil" | "toc" | "body">> {
  const out: Record<string, ReturnType<typeof confidentialMeta>[string]> = {};
  for (const [slug, d] of Object.entries(CONFIDENTIAL_DOCS)) {
    out[slug] = {
      slug, title: d.title, tier: d.tier, orgId: d.orgId, sourceKind: "gated", source: d.source,
      disclosureRequired: d.disclosureRequired, disclosureId: d.disclosureId, embargoUntil: d.embargoUntil ?? null,
      toc: [], body: null,
    };
  }
  return out;
}

/**
 * The confidential authorization chokepoint (CIT-DOCS-004). A confidential grant clears the tier/org/
 * expiry gate via `canRead`; on top of that, a doc carrying `allowedRoles` is served ONLY to a session
 * whose `citrateRole` is in that allowlist. Fail-closed: a doc scoped to roles is denied to a session
 * with no role. Returns true only when BOTH checks pass.
 */
export function authorizeConfidentialRead(
  session: AuthSession,
  doc: Pick<ConfidentialDoc, "tier" | "orgId" | "allowedRoles">,
  now: number
): boolean {
  if (!canRead(session, { tier: doc.tier, orgId: doc.orgId }, now)) return false;
  if (doc.allowedRoles && doc.allowedRoles.length) {
    const role = session.entitlement?.citrateRole;
    if (!role || !doc.allowedRoles.includes(role)) return false;
  }
  return true;
}
