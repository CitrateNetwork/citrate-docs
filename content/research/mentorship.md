---
title: The Mentorship Protocol
codex_slug: /research/mentorship
tier: public
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/Gradient_Papers_No3_Mentorship_Protocol_v3.md
surfaces: [RES-mentorship]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The mentorship protocol is how a weaker node in the Citrate Orchard finds a stronger one to learn from.
At each checkpoint the network pairs nodes by their measured strengths and weaknesses, the stronger node
produces a small update that moves the weaker one toward it, and the whole exchange is recorded. This
page is for researchers and operators; it documents the matching code that runs today and summarizes
Gradient Paper III for the protocol design around it.

## What it is

Think of the Orchard as a grove where some trees fruit well in one season and poorly in another. Rather
than let each tree learn alone, the network grafts: a node strong in some region of the model's behavior
lends a weaker node an adapter, a small set of weights that nudges the weaker node's representation
toward the stronger one's. The paper's argument is that distributed model swarms fail the way human
organizations fail, when knowledge transfer is implicit, unrecorded, and one-directional, so Citrate
makes each transfer an explicit, recorded action.

Two layers are worth keeping separate. The matching layer, which decides who learns from whom, runs in
the node software today. The fuller protocol around it, the trust gating and pricing and dispute handling
the paper describes, is partly on the ledger and partly still specified. The sections below say which is
which.

## How to use it

Matching is not something an operator invokes by hand; it runs inside the learning cycle. The path it
takes each checkpoint is:

1. Each participant carries a performance profile, its measured accuracy and the domains it works in.
2. Participants are sorted by accuracy. The stronger half are candidate mentors, the weaker half candidate mentees.
3. Each mentee is matched to the mentor with the highest complementarity that still has spare capacity, where complementarity rewards a wide accuracy gap and shared working domains.
4. The chosen mentor produces a delta adapter, the element-wise difference between its embedding and the mentee's, which applied to the mentee moves its representation toward the mentor's.
5. The adapter is wrapped with provenance and a content hash so the exchange can be checked later.

To follow the surrounding surfaces, read [federated learning cycles](/research/learning) for where
matching sits in the cycle, and [model contracts](/contracts/models) for the LoRAFactory registry that
records adapters on the ledger.

## Reference

The matching surface, anchored in `citrate-chain` at `03d7851`.

| Surface | Where | What it does |
|---|---|---|
| `select_mentors` | `core/learning/src/mentor.rs` | Sorts participants by accuracy, splits into mentor and mentee halves, and pairs each mentee to the best uncapped mentor. |
| `MentorPairing` | `core/learning/src/mentor.rs` | The record of one pairing: mentor, mentee, complementarity score, both accuracies, and shared domains. |
| `generate_delta_adapter` | `core/learning/src/mentor.rs` | Computes the mentor-minus-mentee embedding delta, rejecting mismatched dimensions or non-finite values. |
| `generate_adapter_for_mentee` | `core/learning/src/mentor.rs` | Wraps the delta in a `LearningAdapter` with metadata, provenance, and hash, ready to broadcast. |
| `validate_pairing` | `core/learning/src/mentor.rs` | A pure predicate mirroring the `MentorMatcher.sol` contract check, in Q16.16 fixed point so the node and the contract agree exactly. |

The constants that bound matching are explicit in the code: `MIN_ACCURACY_GAP` is `0.05`, so a mentor
must be at least five points more accurate than its mentee, and `MAX_MENTEES_PER_MENTOR` is `3`, so no
mentor can take more than three mentees in a cycle. The complementarity score is
`max(1, shared_domains) * accuracy_gap`, which keeps zero-overlap pairs scorable while rewarding shared
ground. The `validate_pairing` helper enforces the on-ledger gate in lockstep with the contract, and its
variant order is load-bearing because it ABI-decodes from the Solidity enum:

```rust
pub enum PairingValidity {
    Ok = 0,
    SelfMentor = 1,
    MentorBelowTrustFloor = 2,
    AccuracyGapTooSmall = 3,
    MentorAtCapacity = 4,
    MenteeAlreadyAssigned = 5,
}
```

The paper adds the protocol layer the matching code rides on. The `ContributionAccounting` contract
weights seven contribution types, with adapter creation weighted highest at 2.0, so the candidate pool is
nodes that have actually produced useful adapters. A node's standing in consensus, its blue score from
GhostDAG, is reused as a necessary trust floor: a node that cannot keep up with consensus is an unlikely
source of good adapters, though a high blue score alone does not earn mentor standing. A first-time
mentee can require a Halo2-KZG proof of adapter quality before integrating, described under
[verifiable inference](/research/verifiable-inference). Fees are calibrated by a pricing oracle so
mentoring is paid but not rent-extracting.

## Design rationale

The matching code is deliberately fixed point, not floating point, on its on-ledger path. Float results
are not guaranteed identical across processors, and the node and the contract must agree on whether a
pairing is valid; the Q16.16 representation in `validate_pairing` makes the two implementations produce
the same answer over the full input space, which the property tests in the file pin. The accuracy-gap
floor and the per-mentor capacity cap are the smallest set of rules that prevent the obvious failures: a
node mentoring itself, a node with no standing posing as a mentor, a pairing with no real gap to learn
across, and one strong node saturating all demand. The paper's wider counters, an open adapter registry
so any mentee can use a published adapter, per-checkpoint rotation, usage-weighted scoring so spam
adapters earn nothing, and slashing for adapters later proven adversarial, address mentor capture and
adapter pollution at the protocol level.

## Access and canon

Academic tier. The mentorship surface runs inside the on-premise node software in the Citrate Orchard;
matching operates over performance profiles and embeddings that stay on the operator's hardware, and only
the adapter and its provenance are published when an operator chooses to. Contract addresses cited in the
paper are public; no keys or credentials appear here.

## Source and verification

- Paper, linked, not copied: `citrate-docs/gradient_papers_v3/Gradient_Papers_No3_Mentorship_Protocol_v3.md`.
- Code anchor, citrate-chain at `03d7851`: `core/learning/src/mentor.rs` for matching, delta-adapter
  generation, and the `validate_pairing` mirror; surrounding surfaces in `core/learning/src/adapters.rs`,
  `contracts/src/ContributionAccounting.sol`, `contracts/src/LoRAFactory.sol`, and `contracts/src/MentorMatcher.sol`.
- Status: Implemented for matching. `select_mentors`, the delta-adapter pipeline, and the
  `validate_pairing` predicate exist, run, and are covered by unit and property tests in `mentor.rs`; this
  is pre-audit. Specified for the full distillation pipeline: the wider protocol the paper describes,
  blue-score trust gating, on-ledger per-cycle assignment, priced mentoring, and the application-layer
  proof-of-quality flow, is designed and partly built but not yet shipped end to end. The delta adapter
  in the code is a real update vector, not the full low-rank LoRA decomposition the paper envisions.
- Related: [federated learning cycles](/research/learning), [model contracts](/contracts/models),
  [paraconsistent consensus](/research/paraconsistent), [verifiable inference](/research/verifiable-inference),
  [the Gradient Papers](/research/gradient-papers).
