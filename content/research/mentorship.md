---
title: The Mentorship Protocol
codex_slug: /research/mentorship
tier: academic
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/Gradient_Papers_No3_Mentorship_Protocol_v3.md
surfaces: [RES-mentorship]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The Mentorship Protocol

> The social fabric of the learning network: how nodes find one another to learn
> from, who earns mentor status, and how the protocol tells a mentorship apart
> from an extraction. Summary + link to Gradient Paper III.

## Overview

Paraconsistent consensus (Paper II) gives the *mechanism* for learning together.
The **Mentorship Protocol** (Paper III) gives the *social layer*: a way for a
node with a weakness in some embedding region to borrow a LoRA adapter from a
node that is strong there, with the whole exchange recorded on-chain. The
argument is that distributed AI swarms fail the way human organizations fail —
when knowledge transfer is implicit, unrecorded, and one-directional — so
Citrate makes mentorship explicit and auditable.

## Concept

The paper grounds the design in three strands of organizational-learning theory
and maps each to an on-chain primitive:

- **Senge (systems thinking)** — reinforcing/balancing feedback loops are made
  explicit (adapter quality → usage → data → better adapter; performance score →
  workload → regression to the mean).
- **Nonaka & Takeuchi (SECI)** — socialization / externalization / combination /
  internalization each leave an on-chain trace (e.g. publishing a LoRA adapter is
  *externalization*; merging adapters is *combination*).
- **Argyris & Schön (double-loop)** — single-loop = continuous LoRA adaptation;
  double-loop = re-evaluating the routing taxonomy at checkpoint barriers.

**Mentor–mentee matching** is run per checkpoint and protected by three filter
passes: capacity (a mentor can only take `M_max` mentees), **blue-score trust
floor** (a Sybil with no consensus history can't be a mentor), and contribution
score (the candidate must actually have produced adapters worth borrowing). The
trust floor reuses GhostDAG blue score as a *necessary but not sufficient*
signal; the sufficient condition is per-type score from `ContributionAccounting`.

**Trust and verification.** A first-time mentee can require a Halo2-KZG proof of
adapter quality before integrating (see [verifiable inference](/research/verifiable-inference)).
Failure modes the paper addresses: mentor capture (per-mentor caps + open adapter
registry + rotation), adapter pollution (slashing via dispute resolution +
crowd-sourced suspension), and sycophant spam (score is **usage-weighted**, so
unused adapters earn nothing).

## How it maps to the network

- **Contribution accounting (seven types).** `ContributionAccounting` weights
  Validation, ModelHosting, AdapterCreation, DataProvision, AppDevelopment,
  BridgeInfra, Governance. Mentorship queries the **AdapterCreation** column for
  candidates; weights are governance-mutable with bounded score recomputation.
- **Adapter registration.** LoRA adapters created in the learning cycle's `Act`
  phase ([learning cycles](/research/learning)) are registered via `LoRAFactory`
  and distilled with a `ProvenanceChain` in `core/learning/src/adapters.rs`.
- **Pricing.** A mentee's fee to a mentor is calibrated by `ComputePricingOracle`
  so mentoring is paid but not rent-extracting.

## Honest status

`ContributionAccounting` (7-type tracking + weight-update recompute),
`LoRAFactory` registration, and the `LearningPool`/`LearningCycleManager` state
machines are **implemented** per the paper's reality-check table. The
**mentor–mentee matching algorithm**, per-cycle blue-score-gated assignment, and
the Sybil trust-floor enforcement are **specified, not yet on-chain** (the
paper's `RM-MENT-*` sprint family). The Halo2-KZG adapter-verification *primitive*
exists (precompile `0x0108`); the application-layer verification flow is pending.
Treat mentorship as a designed protocol with implemented primitives and a
not-yet-shipped orchestration layer.

## Source & verification

- **Paper (linked, not copied):**
  `citrate-docs/gradient_papers_v3/Gradient_Papers_No3_Mentorship_Protocol_v3.md`.
- **Code anchors (citrate-chain @ `03d7851`):** `core/learning/src/adapters.rs`
  (LoRA + provenance), `core/learning/src/mentor.rs` (`MentorPairing`,
  checkpoint-time mentor selection), `contracts/src/ContributionAccounting.sol`,
  `contracts/src/LoRAFactory.sol`, `contracts/src/LearningPool.sol`,
  `contracts/src/ComputePricingOracle.sol`.
- **Related:** [Paraconsistent consensus](/research/paraconsistent),
  [Federated learning cycles](/research/learning),
  [Verifiable inference](/research/verifiable-inference).
- **No secrets on this page.** Contract *addresses* in the paper are public; no
  keys or credentials are reproduced here.
