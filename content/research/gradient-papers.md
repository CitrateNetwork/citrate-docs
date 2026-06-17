---
title: The Gradient Papers (v3)
codex_slug: /research/gradient-papers
tier: academic
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/
surfaces: [RES-papers]
audited_against_sha: c3f8c3da
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The Gradient Papers (v3)

> A ten-part working dissertation on the Citrate Network, the thesis that
> distributed learning and distributed consensus are the same problem under
> different names. For researchers, engineers, and reviewers who want the
> "why" behind the protocol. Codex **links** these papers; it does not copy them.

## Overview

The Gradient Papers are the canonical research corpus for Citrate, an AI-native
Layer-1 BlockDAG (chain id 40204). The v3 revision was written in April 2026
against the v0.5.0 testnet so that every mechanical claim is traceable to a file
path or contract address in the source repository. v3 introduces three
maturity tags carried in each paper's header:

- **Verified**, the claim has on-chain evidence or external audit.
- **Practiced**, the methodology is in active use (sprints, review gates).
- **Implemented**, code exists in `main` and is exercised by tests + benchmarks.

The series thesis: a blockchain (machines agreeing on one view of truth) and a
learning network (machines converging on one representation of the world) are
the same shape, both gradient-descent processes, one over disagreement, one
over loss. The papers make that identity load-bearing.

Source lives at `citrate-docs/gradient_papers_v3/`. The series index is
`Gradient_Papers_No0_Series_Index_v3.md`, which also carries the v2→v3 change
log and per-audience reading paths.

## Index

Ten papers (No.1–No.10) plus the No.0 series index. Each row links to its
source file; the one-line abstract is a summary, not a copy.

| No. | Paper | Maturity | Source file |
|-----|-------|----------|-------------|
| 0 | **Series Index**, change log, maturity tags, reading paths by audience. |, | [`Gradient_Papers_No0_Series_Index_v3.md`](../../gradient_papers_v3/Gradient_Papers_No0_Series_Index_v3.md) |
| 1 | **Citrate: Protocol Specification for an AI-Native BlockDAG Network**, the foundational spec; a Layer-1 BlockDAG with an EVM-compatible Lattice VM and AI-native precompiles (`0x0107–0x010F`) that make models first-class on-chain assets. | Verified (testnet 40204, 38 contracts) | [`Gradient_Papers_No1_Citrate_Technical_Paper_v3.md`](../../gradient_papers_v3/Gradient_Papers_No1_Citrate_Technical_Paper_v3.md) |
| 2 | **Paraconsistent Consensus: Federated Meta-Learning Over BlockDAG Finality**, treats disagreement as information; runs federated meta-learning on top of GhostDAG/BFT checkpoints, aggregating embedding dimensions with Belnap four-valued logic. | Specified | [`Gradient_Papers_No2_Paraconsistent_Consensus_v3.md`](../../gradient_papers_v3/Gradient_Papers_No2_Paraconsistent_Consensus_v3.md) |
| 3 | **The Mentorship Protocol: Organizational Learning Theory for Decentralized Agent Swarm Orchestration**, the social fabric of consensus: how nodes find one another to learn from, who earns mentor status, anchored in `LearningPool`. | Specified | [`Gradient_Papers_No3_Mentorship_Protocol_v3.md`](../../gradient_papers_v3/Gradient_Papers_No3_Mentorship_Protocol_v3.md) |
| 4 | **Behavioral Issues: BDD as Engineering Methodology for Agentic Systems**, catalogues five reproducible agent failure modes and the Behavior-Driven Development discipline (Gherkin contracts) that structurally blocks each. | Practiced | [`Gradient_Papers_No4_Behavioral_Issues_v3.md`](../../gradient_papers_v3/Gradient_Papers_No4_Behavioral_Issues_v3.md) |
| 5 | **ATIS: Analog Token Importance Scoring for Energy-Efficient Transformer Attention Pruning**, proposes computing attention-pruning importance scores in analog hardware (FPAA) before digital Q/K projection; honest DAC-bottleneck analysis. | Theoretical (no prototype) | [`Gradient_Papers_No5_ATIS_v3.md`](../../gradient_papers_v3/Gradient_Papers_No5_ATIS_v3.md) |
| 6 | **The Memetic Money Portal v3, Bridge Architecture and Contracted Market-Maker Model**, moving capital in/out of Citrate; replaces v2's AMM bridge with a contracted full-time market-maker governed by `MarketMakerAllocation.sol`. | Specified (Sepolia partial; MM live on testnet) | [`Gradient_Papers_No6_Memetic_Money_Portal_v3.md`](../../gradient_papers_v3/Gradient_Papers_No6_Memetic_Money_Portal_v3.md) |
| 7 | **The Citrate Inc.: Cooperative Capitalism and Shared Ownership of AI Infrastructure**, a third path between VC concentration and flat cooperatives: ownership proportional to contribution, tracked on-chain by `ContributionAccounting`. | Specified (7-type tracking on-chain) | [`Gradient_Papers_No7_Citrate Inc._v3.md`](../../gradient_papers_v3/Gradient_Papers_No7_Citrate Inc._v3.md) |
| 8 | **The BR1J Constitution: DAO Governance Declaration and Code of Ethics**, the constitutional law of the Citrate DAO; the boundaries no proposal can cross, enforced via `TreasuryGovernor`. | Specified (Governor deployed; entity filed) | [`Gradient_Papers_No8_BR1J_Constitution_v3.md`](../../gradient_papers_v3/Gradient_Papers_No8_BR1J_Constitution_v3.md) |
| 9 | **The Medusa Paradigm: Cnidarian Biological Architectures as Design Principles for Distributed AI**, derives Citrate's architecture from cnidarian biology (nerve nets, siphonophore colonies, *Turritopsis*); motifs map to `NematocystSlashing` and `TEEAttestationRegistry`. | Specified + Practiced | [`Gradient_Papers_No9_Medusa_Paradigm_v3.md`](../../gradient_papers_v3/Gradient_Papers_No9_Medusa_Paradigm_v3.md) |
| 10 | **The Substrate of Verifiable Inference: Halo2-KZG, Q16 Compute, and Attestation Gates**, how on-chain verification of off-chain AI work is mechanized: Halo2-KZG proofs, Q16 deterministic compute, attestation gates. | Implemented (on testnet 40204) | [`Gradient_Papers_No10_Substrate_of_Verifiable_Inference_v3.md`](../../gradient_papers_v3/Gradient_Papers_No10_Substrate_of_Verifiable_Inference_v3.md) |

## How to read

Suggested reading paths by role (from the No.0 index):

- **Engineers**, I → X → IV → II → III → V → VI
- **Researchers**, IX → V → II → X → III → I
- **Investors**, I → VI → VII → VIII → II
- **Operators**, I → IV → X → IX → VIII
- **Community**, VIII → VII → VI → IX → I

Each paper opens with an Abstract and carries a `maturity:` line in its
frontmatter stating what is implemented vs. specified vs. hypothesized. The
honesty principle is explicit: where a claim is conjectural it is tagged
`[Hypothesis]`; numeric claims either cite code or fail the
`paper-claim-audit.yml` CI gate that moves a paper from `draft` → `active`.

## Source & verification

- **Source:** `citrate-docs/gradient_papers_v3/` (this repo).
- **Audited against SHA:** `c3f8c3da` (citrate-docs).
- **Authorship:** Larry Klosowski, with Lauren Mendenhall (BR1J), Saul Loveman
  (engineering), and the Claude Opus 4.x lineage.
- **Rule 9 (link, don't copy):** this page is an annotated index. The papers
  themselves are the truth; Codex links them and never duplicates their text.
- **No secrets.** The papers cite public contract addresses and the public
  testnet RPC only. No keys, mnemonics, or private endpoints appear here.
