---
created: 2026-05-18T16:00:00Z
updated: 2026-06-16T00:00:00Z
branch: main
author: monorepo-split / PSL-13; DOCS-CODEX-S0 promotion
status: active
---

# Audit Tier — `citrate-docs` (Citrate Codex)

**Classification**: **Tier 1 — full audit** (elevated from Tier 3 on 2026-06-14, DOCS-CODEX-S0).

## Rationale

`citrate-docs` is no longer a static content repo — it is **Citrate Codex**, an agentic documentation
webapp that (a) ships an **auth/RBAC chokepoint** (`lib/auth/`), (b) carries a runtime content gateway
(`/api/content`) that fails closed, and (c) carries an inference-backed agent. That is a real
security surface, so it audits at Tier 1. (Prior Tier-3 rationale — "no code surface" — no longer holds.)

The repository is **public open-core** (Apache-2.0 periphery + BUSL-1.1 app layer; licensor Citrate Inc.),
and **all documentation content in it is public**. No page in this repo is gated.

## Core invariant (audited)

The content gateway mechanism ships **no gated content in this public repo**. The confidential-doc store
(`lib/content/confidential-store.ts`) is an empty, fail-closed stub here; the generated
`content/_generated/content-bodies.ts` is empty because every page is `public`. The mechanism remains for
**private overlays** (Homestead / enterprise deployments) that supply their own store at build time — and
in those deployments the same invariant holds: gated content is served only at request time, server-side,
after the entitlement check, and is never baked into the client bundle
(`PLANSET/02_ARCHITECTURE.md` §3/§4, `03_TLA_SPECS.md` `ConfidentialNeverInBuild`).

The **enforcement** is `import "server-only"` on the body stores (`lib/content/confidential-store.ts`,
`content/_generated/content-bodies.ts`): the build fails if a client module imports them. CI
(`npm run verify:bundle`) is the **defense-in-depth structural check** on top of that — it probes every
NON-public body against `.next/static` and fails on any verbatim leak (CIT-DOCS-003 / DOC-B-001/004). In
this public repo there is no gated body to leak; the gate protects private overlays and is a canary that
can and does fail — it is not the sole guard.

## Rule-13 gateway sign-off

> **Rule 13 (Agentile) — authorization for the runtime content gateway.**
> This sign-off authorizes the **S3 runtime gateway** (`/api/content`) to serve, in private overlay
> deployments only, gated docs to entitled principals (administrators + issued, time-gated auditors),
> access-logged, never in the client bundle. In this public repo the gateway ships no gated content.

| Field | Value |
|---|---|
| Sprint | DOCS-CODEX-S3 |
| Authorization | **Granted** |
| Authorized by | Federation lead (Saul Loveman / @SaulBuilds) |
| Date | 2026-06-16 |
| Scope | `/api/content` gateway may broker gated content server-side, post-auth, access-logged, in private overlay deployments. Gated bodies must not enter `.next/static` (CI-enforced). This repo is public and ships no gated content. |
| Conditions | Quarterly access review; auditor grants time-gated (`expiresAt`); every gated read logged; build-grep gate green on every release. |

## Decision authority

Tier changes require (a) a commit to this file explaining the change, and (b) sign-off from the operator
of record / federation lead (recorded above for the S3 authorization).

## See also

- `PLANSET/07_IMPLEMENTATION_AND_HARDENING_PLAN.md` — gateway hardening + threat model
- `../.github/AUDIT_POSTURE.md` — federation Tier-1 obligations
- `../citrate-federation/repos/citrate-docs/owners.md` — references this sign-off
