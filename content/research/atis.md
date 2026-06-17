---
title: ATIS, Analog Token Importance Scoring
codex_slug: /research/atis
tier: academic
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/Gradient_Papers_No5_ATIS_v3.md
surfaces: [RES-atis]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# ATIS, Analog Token Importance Scoring

> A research-frontier idea: compute transformer attention's token-importance
> score in analog hardware to push inference energy below the digital floor.
> Summary + link to Gradient Paper V.

## Overview

Token-level pruning of transformer attention is a well-studied software
optimization (typically 2–4× speedups by discarding low-contribution tokens).
**ATIS** proposes computing the importance score itself in **analog hardware**, a Field-Programmable Analog Array (FPAA) sitting before the digital Q/K
projection, to drop the energy floor below what digital compute can reach.

This page documents a **theoretical** paper. There is **no FPAA prototype, no
SPICE campaign, and no measured silicon energy numbers.** Its value is the
*framing* ("filter tokens before the expensive operation") and an honest analysis
of why the naïve version doesn't pay off.

## Concept

Transformer attention is `O(n²)` in sequence length; for long contexts the
attention matrix dominates memory bandwidth and energy. ATIS inserts an analog
filter stage between embedding and digital attention: DAC → FPAA approximate
dot-products against a learned query prototype → comparator → binary keep/discard
mask → the digital pipeline runs only on surviving tokens.

**The honest DAC bottleneck.** The naïve design **does not pay off**, because the
energy budget is dominated by the DAC, not the analog compute, a 12-bit DAC over
~768 dimensions can cost more than the entire digital attention stage it was
meant to bypass. The paper's sharpened v3 conclusion: ATIS needs **DAC-free**
architectures. Three candidate paths (all hardware-research, multi-year horizons):
charge-domain compute in DRAM sense amplifiers; mixed-signal embedding stores that
never digitize; and photonic dot-products with laser-modulator inputs.

**System-level value regardless of hardware.** Even purely digital, the ATIS
*framing* has value: a tiny importance-MLP predicting token importance can run
cheaply, and pruning shrinks the attention matrix **quadratically**, ~70%
pruning compounds to a much smaller attention matrix across layers. So a "software
ATIS" is a node-operator optimization even if the analog hardware never ships.

## How it maps to the network

ATIS is in the Gradient series because Citrate's node-hardware roadmap
eventually intersects hardware research:

- **Citrate pays for inference in SALT**, so energy savings flow directly to
  operator profit, the economic incentive for the hardware R&D.
- **The inference router is hardware-agnostic.** A model can be served on any
  backend (CPU, GPU, future ATIS hardware); the protocol only cares about the
  `(input, output, attestation)` tuple. See
  [verifiable inference](/research/verifiable-inference).
- **TEE attestation extends to custom hardware.** An FPAA-equipped node could
  attest to its filter parameters against a signed firmware hash (pending the
  CM-08 attestation deployment).

## Honest status

**Aspirational / theoretical.** Nothing in this paper is implemented: no FPAA
prototype, no SPICE simulation. The software importance-MLP is "specified, researchers' choice," and the TEE-attestation extension for custom hardware is
specified pending the CM-08 attestation ship. There is **no `citrate-chain` code
path** for ATIS; the registry row correctly carries no code anchor. This page
exists to frame the research direction honestly, not to claim a feature.

## Source & verification

- **Paper (linked, not copied):**
  `citrate-docs/gradient_papers_v3/Gradient_Papers_No5_ATIS_v3.md`.
- **Code anchor:** none, this is hardware research with no implementation.
- **Indirect network touchpoints:** the hardware-agnostic inference router and
  TEE attestation gates described in
  [verifiable inference](/research/verifiable-inference).
- **No secrets on this page.**
