---
created: 2026-06-16T00:00:00Z
branch: main
author: Codex S6
status: active
---

# Audits — Citrate Codex

Tier-1 audit trail for `citrate-docs` (Citrate Codex). Dated audit reports + intake folders live here;
reports are **immutable** once dated (Agentile Rule 3 — errata go in a follow-up, never an edit).

## Standing authorizations & controls

| Date | Item | Record |
|---|---|---|
| 2026-06-16 | **Rule-13 sign-off** — authorize the S3 Confidential runtime gateway (no visibility flip) | `../AUDIT_TIER.md` |
| 2026-06-16 | **ConfidentialNeverInBuild gate** — `npm run verify:bundle` (postbuild + CI) | `../scripts/check-no-confidential.mjs` |
| 2026-06-16 | **Tier promotion** Tier-3 → Tier-1 | `../AUDIT_TIER.md` |

## Audit history

| Date | Auditor | Scope | Outcome |
|---|---|---|---|
| — | (pending) | Tier-1 pass before `v1.0.0` (auth chokepoint, Confidential gateway, RAG, sandboxes) | — |

## Intake

A new engagement gets a dated folder here, e.g. `2026-Qx-<firm>-<scope>/` with: scope/SOW reference (no
secrets), the commit SHA under review, findings, and a remediation log. Auditor access to Confidential
material is granted as a **time-gated** entitlement (see `../PLANSET/07_IMPLEMENTATION_AND_HARDENING_PLAN.md`),
not by sharing files.

## Release gate

Per `../.github/AUDIT_POSTURE.md` (Tier 1): stable tags require a named-auditor attestation with the commit
SHA; every release runs the CI gate (`build` + `typecheck` + `verify:bundle`) and ships an SBOM + a
cosign keyless-OIDC signature (see `../RELEASE.md`).
