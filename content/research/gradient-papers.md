---
title: The Gradient Papers (v3)
codex_slug: /research/gradient-papers
tier: public
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/
surfaces: [RES-papers]
audited_against_sha: cd729ed
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Gradient Papers are the research corpus the Citrate Network grew from, a ten-part working
dissertation plus a series index. This page is for researchers, engineers, and reviewers who want the
reasoning behind the design. It indexes the papers and points each one at the surface in Almanac that
treats it; following Rule 9, it summarizes and links the papers, it does not copy them.

## What it is

The papers argue one thesis: a public ledger and a learning network are the same shape. A ledger is many
machines agreeing on one view of truth; a learning network is many machines converging on one
representation of the world. Both are gradient processes, one over disagreement, one over loss. The
series makes that identity load-bearing, so every paper that claims to learn points at a contract that
records contribution, and every paper that claims to reach consensus points at a finality mechanism that
treats disagreement as data.

The papers are research, not a product manual. Some describe surfaces that run on testnet today, some
describe designs written down but not yet built, and one describes a hardware direction with no code at
all. We keep those honest by carrying a maturity tag on each paper and, in the table below, naming the
Almanac page where the work actually lives when it has been built.

The v3 revision was written in April 2026 against the v0.5.0 testnet on chain id 40204, so every
mechanical claim traces to a file path or a public contract address in the source. The series index,
`Gradient_Papers_No0_Series_Index_v3.md`, carries the v2 to v3 change log and the reading paths by role.

## How to use it

Read the index first, then the paper your role calls for. The suggested orders, taken from the No.0
index, are:

| Reader | Suggested order |
|---|---|
| Engineers | I, X, IV, II, III, V, VI |
| Researchers | IX, V, II, X, III, I |
| Operators | I, IV, X, IX, VIII |
| Community | VIII, VII, VI, IX, I |

When a paper has a surface in Almanac, read the Almanac page for what is built and the paper for why it is
built that way. When a paper is theoretical, the paper is all there is, and the page says so.

## Reference

Ten papers numbered No.1 through No.10, plus the No.0 series index. The maturity column is the paper's
own header tag. The Almanac page column links to the surface that treats the work; where a paper is
research with no built surface, that is stated instead.

| No. | Title | One line | Treated in Almanac |
|---|---|---|---|
| 0 | Series Index | The map: change log, maturity tags, and reading paths by role. | this page |
| 1 | Citrate Technical Paper | The foundational specification, a Layer-1 BlockDAG with the EVM-compatible Lattice VM and AI-native precompiles that make models first-class on the ledger. | [Lattice VM](/chain/lvm), [precompiles](/chain/precompiles) |
| 2 | Paraconsistent Consensus | Treats disagreement as information; runs federated meta-learning over GhostDAG and BFT checkpoints, combining views with Belnap four-valued logic. | [paraconsistent consensus](/research/paraconsistent) |
| 3 | The Mentorship Protocol | The social layer of learning: how a weaker node finds a stronger one to learn from, who earns mentor standing, and how a mentorship is told apart from extraction. | [mentorship](/research/mentorship) |
| 4 | Behavioral Issues | Catalogues five reproducible agent failure modes and the behavior-driven development discipline, Gherkin contracts, that blocks each one. | [behavior-driven development](/research/bdd) |
| 5 | ATIS | Proposes computing transformer attention's token-importance score in analog hardware before the digital projection; carries an honest analysis of why the naive version does not pay off. | [ATIS](/research/atis) |
| 6 | The Memetic Money Portal | Moving value in and out of the network; replaces the earlier automated bridge with a contracted market-maker model governed on the ledger. | [the bridge](/chain/bridge) |
| 7 | The Cooperative Model (conceptual) | A conceptual, currently-tabled research direction: a third path between concentrated ownership and flat cooperatives, where standing accrues in proportion to contribution, recorded on the ledger. Not a current legal entity. | [marketplace economics](/contracts/economics) |
| 8 | The BR1J Constitution | The constitutional law of the Citrate organization, the boundaries no proposal can cross, enforced through the treasury governor. | [governance](/contracts/governance) |
| 9 | The Medusa Paradigm | Derives the architecture from cnidarian biology, nerve nets, siphonophore colonies, and Turritopsis, mapping the motifs to slashing and attestation surfaces. | research only; motifs surface in [security](/contracts/security) |
| 10 | The Substrate of Verifiable Inference | How on-chain verification of off-chain model work is mechanized: Halo2-KZG proofs, deterministic Q16 compute, and attestation gates. | [verifiable inference](/research/verifiable-inference) |

## Design rationale

The series is written to be auditable, not persuasive. v3 added a Verified tag for claims with on-chain
or audit evidence, switched code references from filenames to file and line against a pinned commit, and
replaced hand-waved statistics with measured benchmarks. The stated honesty principle is that each paper
says plainly whether a thing works today, is specified, or is conjectural, and a continuous-integration
check moves a paper out of draft only once every numeric claim either cites code or is tagged as a
hypothesis. We index them the same way: the table above does not promote a theoretical paper to a built
feature, and the maturity column is the paper's own, not ours.

## Access and canon

Academic tier. The papers cite public contract addresses and the public testnet RPC only; no keys,
recovery phrases, or private endpoints appear in them or here. The network is a public ledger paired with
private on-premise instances, and the research describes the public half. Authorship is Larry Klosowski,
with Lauren Mendenhall on the constitution, Saul Loveman on engineering, and the Claude Opus lineage.

## Source and verification

- Source: `citrate-docs/gradient_papers_v3/` in this repository, ten numbered papers plus
  `Gradient_Papers_No0_Series_Index_v3.md`.
- Audited against SHA: `cd729ed` (citrate-docs).
- Rule 9: this page is an annotated index. The papers are the source of truth; Almanac links them and does
  not duplicate their text.
- Status: Specified. The papers are a written corpus; the maturity of each described surface is the
  paper's own tag, shown above and detailed on the linked Almanac pages.
