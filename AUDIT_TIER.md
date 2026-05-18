---
created: 2026-05-18T16:00:00Z
branch: main
author: monorepo-split / PSL-13
status: active
---

# Audit Tier — `citrate-docs`

**Classification**: **Tier 3 — content review** before first stable (`v1.0.0`) release tag.

## Rationale

User-facing documentation site. Content review only — no code surface to audit.

## What this means concretely

- **Content review** by a maintainer + one second reviewer before publish.
- **No external security audit required** — there is no cryptographic, key-handling, or payment-flow surface.
- **CI must remain green** but coverage thresholds + dependency-scan gates do not apply.
- **Visibility flips** (PRIVATE → PUBLIC) require sign-off from `team/OPERATORS.md` operator-of-record but do not require a security audit.

## Decision authority

Per **D6** of the May 2026 federation-split decisions, every repo audits before its first stable release. This document classifies what "audit" means for this specific repo.

Tier changes require: (a) commit to this file explaining the change, AND (b) sign-off from the operator listed in this repo's CODEOWNERS file (when present) or from the federation lead.

## See also

- `POST_SPLIT_PUNCH_LIST.md` in the [monorepo archive](https://github.com/CitrateNetwork/citrate-monorepo-archive) — PSL-13 is the source of this file.
- Federation-wide audit posture sweep — in progress; see the archive's CATALOG.

