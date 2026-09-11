---
title: Standard operating procedures
codex_slug: /methodology/sops
tier: public
org_scope: ~
source_kind: authored
source: per-surface tutorials + repo READMEs
surfaces: [METH-sops-pub]
audited_against_sha: cd729ed
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

An index of the standard operating procedures Citrate documents for the people who use the network:
customers, developers, and node operators. Internal procedures (incident response, access review, hardware
disposal) are gated and not listed here.

## What it is

A standard operating procedure is a repeatable, audited procedure. Citrate tiers them by audience:

- **Public and developer procedures** that any builder can follow, written as runnable tutorials on the
  surface they belong to.
- **Commercial and operator procedures** for paid seats and node operators, some identity-gated, written on
  the relevant Citrate Market, Citrate Node, and enterprise pages.
- **Internal procedures** the team runs on the network itself (incident, access review, key rotation).
  These are confidential: served only through the gated `/internal/sops` route, sourced from a private
  repository, and never built into the public docs.

This page indexes the first two. Per Rule 9, each entry links to the page where the procedure actually
lives rather than restating it.

## Reference

Public and developer procedures:

| Procedure | Audience | Where it lives |
|---|---|---|
| Your first 10 minutes on Citrate | developer | [tutorial](/start/tutorials/your-first-10-minutes) |
| Call the Citrate RPC | developer | [tutorial](/chain/tutorials/call-citrate-rpc) |
| Read the BlockDAG | developer | [tutorial](/chain/tutorials/read-the-dag) |
| Deploy a contract with the CLI | developer | [tutorial](/chain/tutorials/deploy-a-contract-with-the-cli) |
| Sign in with a passkey | developer, customer | [tutorial](/aa/tutorials/sign-in-with-a-passkey) |
| Explore a transaction in CitrateScan | customer | [tutorial](/apps/tutorials/explore-a-transaction) |
| Install the Citrate Keyring extension | customer | [tutorial](/apps/tutorials/install-the-wallet-extension) |

Commercial and operator procedures (commercial tier; operator depth is identity-gated where noted):

| Procedure | Audience | Where it lives |
|---|---|---|
| Run a node | operator | [Citrate Node](/operators/run-a-node) |
| Sell compute end to end | operator (verified) | [node agent](/compute/node-agent) |
| Run a training worker | operator | [compute pool](/compute/pool) |
| Rewards, reputation, and slashing protection | operator | [Citrate Node](/operators/run-a-node) |
| Request a verification packet | enterprise customer | enterprise and compliance (commercial) |
| District onboarding | enterprise customer (verified) | [district registration](/apps/district-registration) |

Entries without a live link are tracked stubs in the registry; this index is the checklist for filling
them.

How procedures are authored, numbered, reviewed, and retired is defined in the federation SOP standard
(`ops/04_SOP_STANDARD.md`). That standard and its commitment template are internal and confidential: the
standard governs how the team writes procedures, and it is not part of the public build. What is public is
the outcome, the customer, developer, and operator procedures linked above.

## Access and canon

This index is public. The individual operator and enterprise procedures are commercial (some identity-
gated) and gate at the linked page. Internal procedures are confidential and excluded from the build. The
internal set, served only through the entitlement-gated `/internal/sops` route to admins and issued
auditors, covers incident response, access review, key and secret rotation, hardware disposal, the FIPS
module tracker, and auditor onboarding. The split is deliberate: public-good procedures stay public, and
the procedures for the network's own trust boundary are gated. Nothing is hidden by obscurity, and no
procedure on any tier contains a credential.

## Source and verification

Procedures are sourced from the per-surface tutorials and repository READMEs (linked, not copied, per
Rule 9). The SOP-authoring standard is `ops/04_SOP_STANDARD.md` (confidential, not transcribed here). At
SHA `cd729ed`. Status: Implemented.
