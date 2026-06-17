---
title: SOPs — customer, developer & operator
codex_slug: /methodology/sops
tier: public
org_scope: ~
source_kind: authored
source: codex
surfaces: [METH-sops-pub]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# SOPs — customer, developer & operator

> An index of the standard operating procedures Citrate documents for the people
> who *use* the network — customers, developers, and node operators. Internal-only
> SOPs (incident response, access review, hardware disposal) are **gated** and not
> listed here. For *how* SOPs are written and governed, see the
> [SOP standard](#the-sop-standard).

## Overview

A **SOP** is a repeatable, audited procedure. Citrate tiers SOPs by audience:

- **Public / developer SOPs** — procedures any builder can follow, documented as
  runnable tutorials on the surface they belong to.
- **Commercial / operator SOPs** — procedures for paid seats and node operators
  (some KYC-gated), documented on the relevant Compute/Operator/Enterprise pages.
- **Internal SOPs** — operations the team runs on the network itself (incident,
  access review, key rotation). These are **Confidential**: served only through
  the gated `/internal/sops` route, sourced from a private repo, never built into
  the public docs.

This page indexes the first two. Per Rule 9, each entry links to the page where
the procedure actually lives rather than restating it.

## Reference — public & developer SOPs

| SOP | Audience | Where it lives |
|---|---|---|
| Your first 10 minutes on Citrate | developer | [tutorial](/start/tutorials/your-first-10-minutes) |
| Call the Citrate RPC | developer | [tutorial](/chain/tutorials/call-citrate-rpc) |
| Read the BlockDAG | developer | [tutorial](/chain/tutorials/read-the-dag) |
| Deploy a contract with the CLI | developer | [tutorial](/chain/tutorials/deploy-a-contract-with-the-cli) |
| Sign in with a passkey / get a smart wallet | developer / customer | [tutorial](/aa/tutorials/sign-in-with-a-passkey) |
| Explore a transaction in CitrateScan | customer | [tutorial](/apps/tutorials/explore-a-transaction) |
| Install the wallet extension | customer | [tutorial](/apps/tutorials/install-the-wallet-extension) |

## Reference — commercial & operator SOPs

> Commercial-tier; operator depth is KYC-gated where noted.

| SOP | Audience | Where it lives |
|---|---|---|
| Run a node | operator | [Node operators](/operators) |
| Sell compute end-to-end ("set and forget") | operator (`C·kyc`) | [node-agent](/compute/node-agent) |
| Run a training worker | operator | [compute pool](/compute/pool) |
| Rewards, reputation & slashing-protection guardrails | operator | [Node operators](/operators) |
| Request a verification packet | enterprise customer | Enterprise & Compliance (commercial) |
| District / customer onboarding (KYC) | enterprise customer (`C·kyc`) | [district registration](/apps/district-registration) |

(Entries without a live link are tracked stubs in the registry; this index is the
checklist for filling them.)

## The SOP standard

How SOPs are authored, numbered, reviewed, and retired is defined in the
federation **SOP standard** (`ops/04_SOP_STANDARD.md`). That document and the
SOP-commitment template are **internal/Confidential** — the *standard* governs
how the team writes procedures, and is not part of the public build. What's
public is the *outcome*: the customer/developer/operator procedures linked above.

## Internal SOPs (gated)

The following exist but are **not** in this build — they are served only through
the entitlement-gated `/internal/sops` route to admins and issued auditors:

- Incident response · access review · key/secret rotation · hardware disposal ·
  FIPS module tracker · auditor onboarding.

This is deliberate (see the [IP posture](#security--access)): public-good
procedures stay public; operating procedures for the network's own
trust/security boundary are gated, never hidden by obscurity and never
containing a secret in any tier.

## Tutorials

Each SOP above *is* a runnable tutorial or links to one. Start with
[Your first 10 minutes](/start/tutorials/your-first-10-minutes).

## Security & access

This index is **public**; individual operator/enterprise SOPs are **commercial**
(some KYC-gated) and gate at the linked page. Internal SOPs are **confidential**
and excluded from the build. No secrets, keys, or private endpoints appear on any
tier — a gated SOP still must not contain a credential.

## Source & verification

Authored index. Procedures are sourced from per-surface tutorials and repo
READMEs (linked, not copied — Rule 9). The SOP-authoring standard is
`ops/04_SOP_STANDARD.md` (Confidential, not transcribed here). Federation SHA
`cd729ed`.
