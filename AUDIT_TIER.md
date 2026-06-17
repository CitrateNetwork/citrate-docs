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

`citrate-docs` is no longer a static content repo — it is **Citrate Codex**, a gated, agentic documentation
webapp that (a) ships an **auth/RBAC chokepoint** (`lib/auth/`), (b) **brokers Confidential material at
runtime** through the `/api/content` gateway, and (c) carries an inference-backed agent. That is a real
security surface, so it audits at Tier 1. (Prior Tier-3 rationale — "no code surface" — no longer holds.)

## Core invariant (audited)

Confidential-tier content is **never** baked into the publicly-served build. It is served only at request
time, server-side, after the entitlement check, with a disclosure acknowledgement and an access-log entry
(`PLANSET/02_ARCHITECTURE.md` §3/§4, `03_TLA_SPECS.md` `ConfidentialNeverInBuild`). CI (`npm run
verify:bundle`) greps the client build and fails on any Confidential sentinel.

## Rule-13 visibility / Confidential-brokering sign-off

> **Rule 13 (Agentile) — authorization to broker Confidential material at runtime.**
> The repo stays `visibility = "private"`; no visibility flip is performed. This sign-off authorizes the
> **S3 Confidential runtime gateway** (`/api/content`) to serve Confidential docs to entitled principals
> (administrators + issued, time-gated auditors), access-logged, never in the client bundle.

| Field | Value |
|---|---|
| Sprint | DOCS-CODEX-S3 |
| Authorization | **Granted** |
| Authorized by | Federation lead (Saul Loveman / @SaulBuilds) |
| Date | 2026-06-16 |
| Scope | `/api/content` gateway may broker tier-`confidential` content server-side, post-auth, access-logged. No repo visibility flip. Confidential bodies must not enter `.next/static` (CI-enforced). |
| Conditions | Quarterly access review; auditor grants time-gated (`expiresAt`); every Confidential read logged; build-grep gate green on every release. |

## Decision authority

Tier changes require (a) a commit to this file explaining the change, and (b) sign-off from the operator
of record / federation lead (recorded above for the S3 authorization).

## See also

- `PLANSET/07_IMPLEMENTATION_AND_HARDENING_PLAN.md` — gateway hardening + threat model
- `../.github/AUDIT_POSTURE.md` — federation Tier-1 obligations
- `../citrate-federation/repos/citrate-docs/owners.md` — references this sign-off
