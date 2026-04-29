---
title: "The Mentorship Protocol: Organizational Learning Theory for Decentralized Agent Swarm Orchestration (v3)"
version: v3
created: 2026-04-28T03:35:00Z
branch: main
author: Larry Klosowski + Claude Opus 4.7
status: active
maturity: Specified — design rationale, partial implementation in LearningPool
supersedes: v2
---

# Paper III — The Mentorship Protocol (v3)

## Abstract

Paper II describes the **mechanism** of paraconsistent
consensus. This paper describes the **social fabric** that makes
the mechanism work: how nodes find one another to learn from,
which nodes get to claim mentor status, and how the protocol
distinguishes a mentor relationship from an extraction
relationship.

The argument: distributed AI swarms fail in the same way human
organizations fail — when knowledge transfer is implicit,
unrecorded, and one-directional. Citrate solves this by making
mentorship **on-chain**: every adapter borrowed, every
performance profile updated, every routing decision is a
recorded action with cryptographic provenance.

## 1. Theoretical foundations

The protocol is grounded in three strands of organizational
learning theory:

### 1.1 Senge — Systems Thinking

Peter Senge's *The Fifth Discipline* argues that organizations
fail when members cannot see system-level feedback loops. The
mentorship protocol exposes **all** of the network's feedback
explicitly:

| Senge concept | Citrate analog |
|---------------|----------------|
| Reinforcing loop | Adapter quality → more requests → more usage data → better adapter |
| Balancing loop | Performance score → mentor status → workload → score regression toward mean |
| Limit to growth | Per-mentor request rate cap (RM-MENT-1 spec, address allocation) |
| Shifting the burden | Detected when a node uses adapters but never publishes its own — flagged in `ContributionAccounting` as low-Adapter score |

### 1.2 Nonaka & Takeuchi — SECI knowledge creation

Nonaka and Takeuchi's SECI model describes how organizations
convert tacit and explicit knowledge across four modes:

| SECI mode | Direction | Citrate primitive |
|-----------|-----------|-------------------|
| **S**ocialization | Tacit → Tacit | Validator gossip; learning-cycle co-attendance |
| **E**xternalization | Tacit → Explicit | A node publishing a LoRA adapter (its tacit specialization becoming explicit weights) |
| **C**ombination | Explicit → Explicit | Adapter composition — multiple adapters merged via weighted sum |
| **I**nternalization | Explicit → Tacit | Routing model parameters absorbed into a node's local inference behavior |

Every SECI transition leaves an on-chain trace. This is the v3
revision's strongest claim: the protocol is not just "inspired
by" organizational theory — it gives each transition a contract
event the auditor can read.

### 1.3 Argyris & Schon — Double-loop learning

Argyris distinguished **single-loop** learning (corrective
adjustment within an existing model of the world) from
**double-loop** learning (revision of the model itself). The
protocol's two learning rates correspond:

| Loop | Time scale | Mechanism | Code |
|------|-----------|-----------|------|
| Single (LoRA adaptation) | Continuous (~1 / inference request) | Adapter weight updates absorbed by routing model | `LoRAFactory.create()` |
| Double (routing restructure) | Per checkpoint (~25–50 s) | Routing model architecture allowed to change at checkpoint barriers | `LearningCycleManager.advanceCycle()` |

A network stuck in single-loop learning *over-fits its existing
routing taxonomy*. Double-loop checkpoints periodically
re-evaluate whether the taxonomy itself should change — e.g.,
splitting a large adapter cluster into specialized children.

## 2. Mentor-mentee assignment

The matching algorithm is run **per checkpoint** and re-evaluated
each cycle:

```
For each node N:
    profile[N] = ContributionAccounting.scores[N]   (per-type)
    weak_dimensions[N] = {d : profile[N][d] < threshold}

For each weak dimension d in weak_dimensions[N]:
    candidates = top_k(profile[*][d], k=5)
    candidates = candidates ∩ {nodes with available capacity}
    candidates = candidates ∩ {nodes with blue_score ≥ trust_floor}
    chosen_mentor[N, d] = candidates.first()
```

Three filtering passes — capacity, blue_score, trust — protect
against:

1. **Mentor overload.** A high-scoring node can only mentor `M_max`
   mentees per cycle (capacity-bounded).
2. **Sybil mentors.** A new validator with no blue_score history
   cannot claim mentor status (trust floor).
3. **Adverse selection.** Mentees pulling from low-blue mentors
   risk receiving adversarial adapters; the trust floor blocks
   that path.

The fee a mentee pays the mentor is calibrated by
`ComputePricingOracle` (`0x46773aeCA885BE65cD313B7d9BCE9625767d40b5`)
so the mentor is not extracting infinite rent. Source:
`contracts/src/ComputePricingOracle.sol`.

## 3. Trust mechanisms

### 3.1 Blue-score gating

Validator standing in GhostDAG (blue score from Paper I) is
**reused** as a trust signal. A node that has produced many
blocks accepted into blue sets has demonstrated:

- It runs a non-Byzantine consensus client.
- Its peers trust its proposed parents enough to extend from them.
- It hasn't been recently slashed (slashing zeroes blue score).

Blue score is **not** a perfect proxy for "produces good
adapters." It's a lower bound: a node that can't even keep up
with consensus is unlikely to produce useful learning
contributions. The protocol uses blue score as a **necessary**
condition for mentorship, not a sufficient one. The sufficient
condition is contribution-type score from
`ContributionAccounting`.

### 3.2 Adapter verification

When a mentee receives a LoRA adapter from a mentor, it can
optionally request a **proof of adapter quality** before
integrating. The mentor produces a Halo2-KZG inference proof
(precompile `0x0108`) over a benchmark input; the mentee verifies
it on-chain. This costs ~1M gas (cf. Paper X §5.1 gas cost) but
is amortized over the entire adapter lifetime — a one-time
verification, not a per-request cost.

For high-trust pairs (mentor with proven track record), the
verification step can be skipped; for first-time pairs, it's
mandatory by protocol-default.

## 4. The seven contribution types

The `ContributionAccounting` contract weights seven contribution
types (matching Paper VII's Mozi Cooperative framework):

| Type | Default weight | What it counts |
|------|---------------:|----------------|
| Validation | 1.0× | Block proposals + BFT signatures |
| ModelHosting | 1.5× | Inference requests served |
| AdapterCreation | 2.0× | LoRA adapters accepted by network |
| DataProvision | 1.5× | Training data CIDs registered |
| AppDevelopment | 1.0× | Tools / UIs deployed |
| BridgeInfra | 1.0× | Cross-chain relay operations |
| Governance | 0.5× | Votes cast + proposals |

Source: `contracts/src/ContributionAccounting.sol` lines 113–119
(default weights).

The mentorship protocol queries the **AdapterCreation** column
to find mentor candidates, but the holistic score (weighted sum
across all 7) is what determines blue-score-gating eligibility.
This means a node that *only* hosts models is not a mentor
candidate — mentorship requires that the candidate has actually
produced adapters worth borrowing.

The v3 revision makes the weights **governance-mutable** with the
RFI-04 / RFI26-08 fix (commit `be65c63e`): when governance
updates a weight, every contributor's cached score is
recomputed in the same call (bounded by `MAX_CONTRIBUTORS=1024`).
Source: `contracts/src/ContributionAccounting.sol::updateWeight`
lines 278–296.

## 5. Failure modes

### 5.1 Mentor capture

A small group of validators with high contribution scores could
theoretically refuse to mentor outside their clique, locking in
a power structure. The protocol counters this with:

- **Per-mentor request cap** prevents one mentor from saturating
  demand.
- **Open registry of adapters** means an adapter created by
  mentor M is usable by *any* mentee, not just M's preferred
  cohort. Once published, the adapter is on IPFS with a stable
  CID.
- **Rotation** via the per-checkpoint re-evaluation prevents
  stale assignments.

### 5.2 Adapter pollution

A malicious mentor publishes an adapter that subtly degrades
mentee inference. Counters:

- **Slashable behavior** under `NematocystSlashing` if a
  published adapter is later proven to have been adversarial via
  `DisputeResolution` (`0x8b36C15552394cE44173a29d054dc5CA482e65D3`).
- **Halo2-KZG verification** of adapter outputs (Paper X) on
  benchmark inputs before integration.
- **Crowd-sourced reputation** — when many mentees flag an
  adapter as harmful, the registry suspends it pending review.

### 5.3 Sycophant nodes

A node could earn AdapterCreation score by publishing many
trivial adapters that nobody uses. Counters:

- The score is **weighted by usage** — a published adapter that
  zero requests reference accrues zero score from
  `InferenceRouter` reward routing. Spam adapters are computed
  but unrewarded.

## 6. Implementation reality check

| Component | Status | Citation |
|-----------|--------|----------|
| `ContributionAccounting` 7-type tracking | **Implemented** | `0x1AFE987622ab5AdD275D2Fd21248F77F5e00667f` |
| Weight-update score recompute (RFI-04) | **Implemented** | commit `be65c63e` |
| `LoRAFactory` adapter registration | **Implemented** | `0xAc6Bfb1709BCba5A005FE2823B4D8bC55db2b7D9` |
| `LearningPool` cycle state machine | **Implemented** | `0x9a58E44f8DD6fd6a75637A32e6E51c16440996F8` |
| Mentor-mentee matching algorithm | **Specified** | not yet on-chain — RM-MENT-1 |
| Per-cycle blue-score-gated assignment | Specified | RM-MENT-1 |
| Halo2-KZG adapter verification flow | **Implemented** primitive (precompile 0x0108) | application layer pending |
| Sybil mentor protection (trust floor) | Specified | RM-MENT-1 |

The protocol's *primitives* are on-chain. The *orchestration* is
not yet. The next sprint family (RM-MENT-*) lands the matching
algorithm and the per-cycle routing decisions.

## 7. References

- Senge, P. (1990). *The Fifth Discipline: The Art and Practice
  of the Learning Organization*.
- Nonaka, I., & Takeuchi, H. (1995). *The Knowledge-Creating
  Company*.
- Argyris, C., & Schön, D. (1978). *Organizational Learning: A
  Theory of Action Perspective*.
- Citrate Paper II — the technical mechanism that mentorship
  rides on top of.
- Citrate Paper VII — the economic framework that pays mentors.
