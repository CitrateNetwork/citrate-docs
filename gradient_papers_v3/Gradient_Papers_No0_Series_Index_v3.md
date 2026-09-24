---
title: "The Gradient Papers — Series Index (v3)"
series: "The Gradient Papers — No. 0"
version: v3
created: 2026-08-29T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
supersedes: "v2 (February 2026), and the April 2026 v3 draft"
---

# The Gradient Papers — Series Index (v3)

> *"Models are smarter together than apart; consensus and learning are the same process; and a
> network that learns by reaching consensus will outperform any network that treats intelligence and
> agreement as separate concerns."*

The Gradient Papers are an eleven-part working dissertation (plus this index) documenting the
**Citrate Network**, an AI-native Layer-1 BlockDAG built on the thesis that distributed learning and
distributed consensus are the same problem under different names. They are authored by **Larry
Klosowski and Lauren Mendenhall** and published by **Citrate Inc.**

This **v3** revision was written in August 2026 against the live chain-id 40204 testnet. Every
mechanical claim is traceable to a file path or a deployed contract address in the canonical
repositories. Where a claim is a target, a hypothesis, or not-yet-built, the paper says so.

---

## What changed from v2, and from the April 2026 draft

There were two prior generations. **v2** (February 2026) was the substantive, full-length set. An
**April 2026 draft** (also labelled "v3") added Paper X but compressed every paper to roughly a third
of its length and left its evidence audit unfinished. This definitive v3 treats **v2 as the length
and substance anchor** and updates it to current reality, rather than polishing the thin April draft.

The material changes in this generation:

- **Every claim re-anchored** to a current `file:line` or a 40204 contract address, re-verified rather
  than inherited. Several stale parameters were corrected against the running chain (chain-id is
  40204, block time is ~2 s on testnet, the BFT checkpoint interval is 50 blocks).
- **Organizations scrubbed to Citrate Inc.** The former publisher/affiliation lines (a foundation, a
  separate health company) are removed; the subject concepts (the BR1J DAO, the Mozi Cooperative) and
  the cnidarian *biology* of Paper IX are kept, as are all third-party academic citations.
- **Authorship** is Larry Klosowski and Lauren Mendenhall on all twelve, with a standard
  AI-assistance disclosure in each Acknowledgments section rather than an AI co-author byline.
- **NAT joins the series as Paper XI**, the strongest "we actually built it" artifact.
- **Honesty upgrades and one major correction:** Paper VI's NFT bridge was never deployed and is now
  documented as a superseded design, with the implemented money-path (a wrapped token, a market-maker,
  a price feed) put in its place; Paper XI's results are framed as registered non-inferiority with the
  larger-scale widening left explicitly unresolved; Paper X's zero-knowledge verifier is flagged as
  shipping off by default; and Paper V is kept honestly theoretical, with no prototype built.

**Honesty principle.** v3 cites the testnet's actual state. Where v2 leaned on aspirational language,
v3 says "this works today," "this is specified," or "this is conjectural," and a reader can audit each
claim against the linked code.

---

## Paper inventory (v3 status)

| # | Title | v3 status | Lead anchor |
|---|-------|-----------|-------------|
| 0 | Series Index (this) | — | `gradient-papers/` |
| I | Citrate: Protocol Specification for an AI-Native BlockDAG | **Verified** (testnet 40204) | `core/consensus/src/ghostdag.rs:54`; 39 contracts |
| II | Paraconsistent Consensus | **Implemented** | Belnap precompile `0x0110` (`q16/belnap.rs:77`) |
| III | The Mentorship Protocol | **Implemented** mechanism, **Hypothesis** outcomes | `LearningPool 0xfc514b82`, `LoRAFactory 0x6e564d22` |
| IV | Behavioral Issues (BDD as methodology) | **Practiced** | codified as the Agentile framework |
| V | ATIS: Analog Token Importance Scoring | **Theoretical** (no code, honest) | external hardware only |
| VI | The Memetic Money Portal | **Partially Implemented** | `WrappedSALT 0xaa918302` + market-maker + oracle |
| VII | The Mozi Cooperative | **Implemented** accounting, **Specified** suite | `ContributionAccounting 0xcdd24773` |
| VIII | The BR1J Constitution | **Implemented** governance | `TreasuryGovernor 0x62e268f2` |
| IX | The Medusa Paradigm | **Specified + Practiced** (design inspiration) | `NematocystSlashing 0xfeb23abd` |
| X | The Substrate of Verifiable Inference | **Implemented**, feature-gated | `zkp/halo2/mod.rs:199` (behind `halo2-substrate`) |
| XI | The Neuroarchitectural Transformer (NAT) | **Implemented** | 15 crates; 8 TLA+ specs TLC-green |

Three maturity tags carry evidence: **Verified** (on-chain or audited), **Practiced** (a methodology
in active use), **Implemented** (code in `main`, exercised by tests). **Specified**, **Hypothesis**,
and **Theoretical** mark, in decreasing order, what is designed, conjectured, or purely proposed.

---

## Reading paths

| Audience | Recommended order |
|----------|-------------------|
| **Engineers** | I → X → XI → IV → II → III |
| **Researchers** | XI → II → V → X → III → I |
| **Investors** | I → VI → VII → VIII → II |
| **Operators** | I → IV → X → IX → VIII |
| **Community** | VIII → VII → VI → IX → I |

The architecture reads either bottom-up (I → XI) or top-down (XI → I). Paper IX (the biological
inspiration) is placed last on purpose: the engineering should stand on its own before the analogy is
appreciated.

---

## The series thesis, restated

A blockchain is a system for many machines to agree on a single view of truth. A learning network is a
system for many machines to converge on a single, or richer, representation of the world. These are the
same shape: both are gradient-descent processes in disguise, one over disagreement (slashing-driven
equilibrium), one over loss (training-driven equilibrium). v3 makes that identity load-bearing, every
paper that claims to "do learning" points at a contract that records contribution, and every paper that
claims to "do consensus" points at a finality mechanism that treats disagreement as data. The series
argues that the next generation of distributed intelligence will be built by networks that do not
separate consensus from cognition. Citrate is the first attempt to build one.

---

## Living-document protocol

The v3 papers are not frozen. Each carries a `status` and a `maturity` in its header, and a claim moves
from draft toward *active* only when its claims either cite current code or are tagged as hypothesis.
The canonical home for the series is `citrate-labs/gradient-papers/` (Markdown source of truth, a
shared arXiv LaTeX build, and rendered PDFs); the four older mirrors are superseded and should point
here. A companion media layer (`media/`) retells each paper as a 3–5 minute layman story in two
formats.

---

## Authorship and honesty

The Gradient Papers are written by Larry Klosowski and Lauren Mendenhall, published by Citrate Inc.
Drafting and literature triage were assisted by AI systems; every mechanical claim was verified by the
authors against the referenced source and the deployed contracts on chain 40204. The opinions in the
closing sections of each paper are the authors' honest assessment of where the work stands, a record of
what we know, and of what we know we do not yet know.

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
