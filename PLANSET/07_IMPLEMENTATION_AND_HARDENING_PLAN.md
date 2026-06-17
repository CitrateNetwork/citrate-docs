---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Implementation & Hardening Plan

> The build/hardening/audit plan for the tier system. Companion to `01_SCOPE_OF_WORK.md`
> (the R1–R12 risk register), `02_ARCHITECTURE.md` (the seam, the gateway, the data model in §2/§4/§8),
> and `03_TLA_SPECS.md` (the formal invariants `NoTierEscalation`, `NoCrossOrgRead`, `ConfidentialNeverInBuild`).
> This document pins how the RBAC chokepoint, the `entitlement` claim, the Confidential gateway, and the
> Tier-1 audit posture are implemented and hardened — concretely, against the file paths in `02_*` §2 — and
> defines the audit packet handed to `citrate-security`. Sprints/WPs that execute this live in `05_*`.

## 0. The shape of what we harden

The whole security surface reduces to **one decision function and two content paths**:

| Thing | Where | Property it must hold |
|---|---|---|
| The RBAC chokepoint | `lib/auth/session.ts` (`resolveTier`/`canRead`) | tier is decided in exactly one place; never escalates |
| The `entitlement` claim | `citrate-identity` (`findAccount` → `resolveEntitlement`) | the only source of a caller's tier/org/role/expiry |
| The hybrid build path | `lib/content/` (transclusion) | Public/Commercial/Academic only — **no Confidential bytes ever enter it** |
| The runtime Confidential gateway | `app/api/content/[...slug]/route.ts` | the only door to Confidential; fail-closed; access-logged |

Everything below hangs off the two core invariants in `00_*`: **Confidential is never in the build**, and
**the agent obeys the same chokepoint as every route.**

## 1. RBAC & entitlement implementation (the single chokepoint)

We **lift the explorer's auth seam verbatim** (`citrate-explorer/src/lib/auth/session.ts`,
locked decision #5) — it is already fail-closed (`resolveServerAuthMode` defaults to `oidc`, refuses
unsigned tokens, enforces issuer **and** audience per FUA-EXPLORER-01) — and extend the normalized
`AuthSession` with the `entitlement` block from `02_*` §4:

```ts
interface AuthSession {
  required: boolean;
  authenticated: boolean;
  sub?: string;            // OIDC subject — the verbatim owner key (never lower-cased)
  walletAddress?: string;
  entitlement?: {          // NET-NEW; resolved in citrate-identity at findAccount
    tier: "public" | "commercial" | "academic" | "confidential";
    orgId?: string;        // per-company / per-sector scope
    citrateRole?: string;  // named operational role (admin, auditor)
    milestone?: string;
    expiresAt: number;     // epoch-ms; expiry is enforced HERE, at read time
  };
}

function resolveTier(s: AuthSession, now: number): Tier;        // default Public; never escalates
function canRead(s: AuthSession, node: SidebarNode, now: number): boolean; // tier ∧ org ∧ disclosure ∧ ¬expired
```

**Single-chokepoint discipline.** `resolveTier`/`canRead` are the *only* place tier is decided, and every
caller routes through them: the tier-aware sidebar renderer (`components/`), the doc page
(`app/docs/[...slug]/page.tsx`), the Confidential gateway (`app/api/content/[...slug]/route.ts`), the chat
route (`app/api/chat/route.ts`), and the RAG retriever (`lib/ai/`). No route re-derives tier from raw
claims. This is enforced by a tripwire (a source scan asserting `payload.entitlement` / `s.entitlement.tier`
is never read outside `lib/auth/`), so a future route physically cannot grow its own ad-hoc check — the
single-chokepoint property is mechanically defended, not merely a convention.

**`org_id` / sector scoping.** `canRead` evaluates **`tier ∧ org_id ∧ disclosure ∧ ¬expired`**, never tier
alone. Tiers are totally ordered for the *band* a principal sits in (Public < Commercial < Academic <
Confidential), but a Commercial principal scoped to `orgId = acme` sees only `org=acme` (or org-agnostic)
nodes, and a Confidential auditor scoped to one engagement does **not** see another sector's Confidential
space. `resolveTier` defaults to **Public** for any unauthenticated, unrecognized, or expired caller — the
fail-closed default is the lowest tier, never the highest.

## 2. citrate-identity changes — the `entitlement` claim

We do **not** build an identity provider (out of scope §3); we *add* one claim to `citrate-identity` and a
resolver at `findAccount`. This is a **cross-repo dependency tracked via a `[[drift]]` map entry** in
`citrate-federation/repos/citrate-docs/` (Rule 12), so the docs build pins the identity claim version and
drift-check goes red if the claim shape changes underneath us.

- **Scope & namespacing.** The OIDC scope `citrate:entitlement` gates issuance of a **namespaced** claim
  `https://citrate.ai/entitlement` (a URI-namespaced custom claim, never a bare top-level key, to avoid
  collision with standard claims and other RPs on the shared `auth.citrate.ai` authority). The claim's
  audience is the Codex RP only; per-RP token isolation (FUA-EXPLORER-01) keeps it from leaking to explorer.
- **`resolveEntitlement(account, now)` at `findAccount`.** Identity computes the entitlement at account
  resolution from **four sources**, taking the *highest* tier any source grants and the *narrowest* org
  scope, then stamping a single `expiresAt`:
  1. **KYC status** — the `kyc_claims` row (`citrate-identity/src/kyc-pg.ts`). A `verified` claim unlocks
     the KYC-gated Commercial "implementation / technical-user" band. The store holds **only** the status +
     lifecycle instants + opaque `vendor_ref` (no PII; ADR-2026-06-03 data-controller boundary) — Codex
     reads the *status*, never PII (mitigates R7).
  2. **An `entitlements`/`contracts` table** (NET-NEW in `citrate-identity`) — per-`org_id`/per-sector
     commercial & academic grants (`tier`, `org_id`, `milestone`, `expires_at`). **Squad ③ (Growth &
     Revenue, lead James Paulk Jr.)** owns the pipeline/pilots/LOIs and is the **sole writer** of this
     table — entitlements follow signed contracts, not engineering tickets.
  3. **The team operators roster** (`citrate-agentile-archive/team/OPERATORS.md` → identity) — named
     `citrate_role` for administrators (Academic + Confidential band for team members).
  4. **Time-gated auditor enrollments** — a per-engagement Confidential grant with a hard `expires_at`,
     issued by the executive team / federation lead (see §5 sign-off). When `now > expires_at`, the source
     contributes nothing — an off-boarded auditor's grant evaporates without a code change.
- **Expiry is enforced at the gate, not just at issuance.** Even a still-valid JWT carrying a stale
  `expiresAt` is rejected by `canRead` (`now > expiresAt → Public`). Identity owns issuance; Codex owns the
  read-time check. The `entitlement_cache` (Neon, short-TTL; `02_*` §8) is a cache only — `citrate-identity`
  is the source of truth, so revocation propagates within one TTL even if a token is long-lived (R4).

## 3. The Confidential content gateway (R1's structural fix)

`gated` nodes are **never built in** (`02_*` §3). `app/api/content/[...slug]/route.ts` is the *only* way to
reach them, and it runs strictly in this order, fail-closed at every step:

1. `verifySession(req)` — 401 if `required && !authenticated`.
2. `canRead(s, node, now)` — entitlement/role/org/expiry gate; **403** on any miss.
3. Per-document `disclosure_gate` — if the doc requires an acknowledgement and `disclosure_ack` has no row
   for `(sub, doc)`, return **409 "ack required"** (the click-through flow, §5).
4. **Server-side fetch** of the doc from its private home repo (`citrate-security/`, `citrate-compliance/`,
   `ops/`, `funding/`) — on the server, with a scoped read token, never exposed to the client.
5. **Access-log write** — one `access_log` row (`sub`, doc slug, tier, `org_id`, `disclosure_ack`, ts)
   *before* the body is returned. A failed log write fails the request (no silent un-logged reads).
6. Render and return HTML. **Confidential bytes exist only in this server response, never in the bundle.**

**CI build-grep invariant (mitigates R1).** A required CI step (`scripts/check-no-confidential.sh`) greps
the *built* static output (`.next/`, `out/`, any prerendered HTML/JSON) for known Confidential markers — the
`tier: confidential` frontmatter token, the private-repo path prefixes, the funding/cap-table/incident
sentinel strings — and **fails the build on any hit**. This is the executable form of `03_*`
`ConfidentialNeverInBuild`: it makes "audit material baked into a public bundle" structurally impossible, not a
matter of reviewer vigilance. The grep runs *after* `next build`, so it sees exactly what would deploy.

## 4. Audit logging & access review

**Schema (`02_*` §8, Drizzle/Neon).** `access_log` (`sub`, doc slug, tier, `org_id`, `disclosure_ack`, ts —
NET-NEW, every Confidential read) and `tool_call_audit` (`sub`, tool, truncated args, ts — lifted from
explorer; every agent tool invocation, including `searchDocs`/`getSurface`). Both are append-only; the
access log is the evidentiary record an auditor's own access is itself logged on.

**Quarterly access-review SOP.** A standing SOP authored per the `ops/` conventions (`ops/04_SOP_STANDARD.md`,
template `ops/templates/T05_SOP_COMMITMENT.md`) runs every quarter: reconcile live entitlements (the
`entitlements`/`contracts` table + auditor enrollments) against the `access_log`, expire stale grants,
confirm every active Confidential grant maps to a current contract/engagement, and file the review in the
document register (`ops/07_DOCUMENT_REGISTER.md`). Owner: federation lead + Compliance (Squad ④).

**Revocation & time-gating.** Revocation is honored **at the chokepoint** — drop the `entitlements`-table row
(or pass `expires_at`), and within one `entitlement_cache` TTL the next `canRead` returns Public/403. Auditor
enrollments are *always* time-gated (`expires_at` mandatory); an expired enrollment is denied at read time
with no deploy (R4). This pairs with the `03_*` invariant that an expired entitlement is observationally
identical to no entitlement.

## 5. Disclosures & embargo

- **Per-doc `disclosure_gate`.** A doc declares a required disclosure id in frontmatter; the gateway blocks
  with 409 until the caller has a `disclosure_ack` row.
- **Click-through ack table.** `disclosure_ack` (`sub`, doc/disclosure id, ts) records the acknowledgement;
  the modal (`components/`) writes it before the first read. Acks are per-`(sub, disclosure)` and audited.
- **`embargo_until` auto-tier-flip.** A doc may carry `embargo_until`; until that instant the node resolves
  one tier *more* restrictive (or stays `gated`), and flips automatically at the embargo expiry — no manual
  re-tagging. This holds premature compliance/audit claims in-house (mitigates R9) and is the automation
  hook for honest-posture timing.
- **Rule-13 sign-off chain for visibility down-shifts.** *Any* transition that makes Confidential content
  more visible (CONFIDENTIAL → Academic/Commercial/Public, or `gated` → build-time `transcluded`) requires a
  recorded **Rule-13 visibility sign-off** by the **federation lead / executive** before it ships. The
  promotion of `citrate-docs` itself to Tier-1 (locked decision #11) is the first such sign-off; subsequent
  per-doc down-shifts append to that chain. Up-shifts (more restrictive) need no sign-off — fail-safe
  direction is free.

## 6. Rate limiting & abuse

Lifted from `citrate-explorer/src/lib/api/ratelimit.ts` (Upstash sliding-window with an in-memory fallback),
applied at two surfaces:

- **Chat / Ask** — per-`sub` (authenticated) and per-IP (Public) windows on `app/api/chat/route.ts`, plus the
  explorer provider's history/step/output caps (mitigates R11, keeps small-context inference in budget).
- **Sandboxes** — per-`sub`/IP windows on each of the five widgets (relay, x402, inference, DAG, RPC),
  bounded to the already-public testnet flows; no key custody in the docs app (`02_*` §6).

All limits **fail closed**: when the limiter store is unreachable, the in-memory fallback engages and, if that
too cannot decide, the request is denied rather than waved through (R8). The MCP server caps an external
agent's retrieval tier by the API key's own entitlement — the same chokepoint, a different principal.

## 7. Tier-1 audit obligations

`citrate-docs` rises **Tier-3 → Tier-1** (locked decision #11) because it now brokers Confidential material.
Per `.github/AUDIT_POSTURE.md`, the repo must carry, and CI must produce:

| Obligation | Concretely |
|---|---|
| `AUDIT_TIER.md` → **Tier-1** | repo root, classification flipped from Tier-3, with the Rule-13 promotion sign-off |
| `audits/` directory | dated audit reports + intake folders (immutable, Rule 6) |
| Branch protection on `main` | required status checks (incl. the build-grep §3 and the tripwire §1) + ≥1 reviewer |
| Reusable JS CI | `uses:` the federation `reusable-js-ci.yml` (install/build/test/lint) — do not inline-duplicate |
| **SBOM in release** | **npm-audit attestation** for this JS repo (CycloneDX is the Rust form); `npm audit` blocks the release, accepted advisories are explicit reviewed entries |
| **cosign keyless OIDC release signing** | every artifact in a GitHub Release signed via cosign keyless (GH OIDC), no long-lived keys |
| `SECURITY.md` link | README links back to the org-level `SECURITY.md` (inherited from `.github`) |
| Stable-tag gate | `v0.x.y` / `v1.0.0` require a written attestation from a named auditor with commit SHA before the draft Release is promoted public |

**Audit feed.** After the first shippable build, hand `citrate-security` a packet per the Agentile-Audit
standard (cross-model quorum): this planset (00–07) as the spec-to-code baseline, the `03_*` TLA specs + TLC
logs, the test corpus (tier-isolation + build-grep proof), the SBOM/`npm audit` output, and the cosign-signed
release manifest.

## 8. Threat model

Anchored to the R1–R12 register in `01_*` and the invariants in `03_*`. The agent is treated as a
**lower-or-equal-tier principal**, never a trusted reader.

| # | Threat | Primary control | Residual / note |
|---|---|---|---|
| **R1** | Confidential leak into the public build | Architectural: Confidential is runtime-only; **CI build-grep fails on any marker** (§3); `03_*` `ConfidentialNeverInBuild` | Structural, not policy. Residual = a *new* private path not in the grep set → grep list is itself reviewed each access review |
| **R2** | Tier escalation via a missed check | Single chokepoint `resolveTier`/`canRead` (§1); tripwire forbids out-of-seam claim reads; `03_*` `NoTierEscalation` | Default tier is Public; expiry checked at read time |
| **R3** | Agent exfiltration (RAG surfaces above-tier chunks) | Corpus partitioned by tier+org; retrieval filtered **before** generation; system-prompt guardrail is defense-in-depth only | The partition is the control; the prompt is not trusted to hold the line |
| **R4** | Stale entitlement (off-boarded auditor/employee) | Mandatory `expires_at`; read-time expiry; quarterly access review; revocation honored within one cache TTL (§4) | Cache TTL bounds the worst-case window |
| **R12** | Cross-org spillover (one customer sees another's space) | `org_id`/sector in `canRead` **and** in the RAG partition (§1); BDD cross-tenant denial tests | `tier ∧ org`, never tier alone |
| **R8** | Sandbox abuse | Read-mostly; per-`sub`/IP rate limit; bounded to public testnet flows; fail-closed when endpoints down (§6) | No key custody in the docs app |
| **R7** | PII handling | **Codex stores no PII**; reads only the KYC *status* claim; identity store has no PII columns (§2) | Data-controller boundary stays at the KYC vendor |
| **R6/R9** | Repo-visibility mistake / premature posture | Rule-13 down-shift sign-off (§5); `embargo_until` auto-hold; disclaimer/visibility CI check | Up-shifts are free; only loosening is gated |

## 9. Rollout & verification

End-to-end checks, mapped to the `01_*` success criteria. Each is a merge-gating test, not a manual pass:

| Check | What it proves | `01_*` criterion |
|---|---|---|
| **Tier-isolation tests** | a Commercial caller is denied an Academic/Confidential node at `canRead`; cross-`org_id` denied | "sees exactly their tier and their org's space" |
| **Build-grep** (`check-no-confidential.sh`) | the built bundle contains **zero** Confidential markers | "static build contains zero Confidential content (CI-proven)" |
| **OIDC round-trip** | sign-in → claim issuance → `entitlement` parsed → correct tier at the chokepoint | "a signed-in user sees their tier" |
| **Expired-auditor test** | a Confidential grant with `now > expires_at` is denied at read time, no deploy | R4 / time-gating |
| **RAG tier test** | an Academic-only chunk is never returned to a Commercial caller | "Academic-only chunk never returned to Commercial" |
| **Sandbox fail-closed test** | each widget denies/degrades when its endpoint is down or the limiter trips | "fails closed when its endpoint is down" |
| **Chokepoint tripwire** | no route reads `entitlement` outside `lib/auth/` | single-chokepoint discipline (§1) |
| **TLC run** | `NoTierEscalation`, `NoCrossOrgRead`, `ConfidentialNeverInBuild` model-check green | the `03_*` safety core |

Exit posture: every surface in `06_*` resolves to a real page or a tracked stub; the build-grep, tripwire, and
TLC ratchets are green; `scripts/drift-check.sh` is green after the manifest bump (Tier-1, `consumes_repos`,
the `citrate-identity` claim drift entry); and the Tier-1 release artifacts (SBOM + cosign-signed manifest)
are produced.

## See also

- `00_OVERVIEW.md` — locked decisions (#4 identity, #5 seam, #10 org scope, #11 Tier-1), the two core invariants, reuse map.
- `01_SCOPE_OF_WORK.md` — phases S0–S6, the R1–R12 risk register, success criteria.
- `02_ARCHITECTURE.md` — §3 content pipeline, §4 the RBAC seam, §5 the agentic harness, §8 the data model.
- `03_TLA_SPECS.md` — `NoTierEscalation`, `NoCrossOrgRead`, `ConfidentialNeverInBuild`.
- `.github/AUDIT_POSTURE.md` — Tier-1 obligations; `./AUDIT_TIER.md` — this repo's classification.
- Seam to lift: `../../citrate-explorer/src/lib/auth/session.ts`, `../../citrate-explorer/src/lib/api/ratelimit.ts`.
- Identity: `../../citrate-identity/src/{kyc-pg.ts,kyc.ts,server.ts}` (+ NET-NEW `resolveEntitlement` / `entitlements` table).
- SOP conventions: `../../ops/04_SOP_STANDARD.md`, `../../ops/07_DOCUMENT_REGISTER.md`.
