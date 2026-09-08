---
title: Paraconsistent aggregation, Belnap four-valued logic
codex_slug: /research/paraconsistent
tier: academic
org_scope: ~
source_kind: authored
source: citrate-chain/core/learning/src/belnap.rs
surfaces: [RES-paraconsistent]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

When nodes in Citrate Orchard disagree about what a model should have learned, the network records the disagreement as information rather than averaging it into a single answer nobody holds. It does this with Belnap's four-valued logic. This page documents the implementation and is written for researchers.

## What it is

Classical agreement treats a difference of opinion as a fault to be resolved: honest parties are expected to converge on one value. Paraconsistent aggregation declines that frame. If one node's data says a given dimension of an embedding should be strongly positive and another node's says it should be strongly negative, the mean sits near zero, a value that is right for neither and that quietly erases the fact that the two nodes saw different worlds. That difference is often the most useful thing in the data: it is what distinguishes a personalized model, a regional dialect, or a domain specialist from a generic one.

So the aggregator produces two outputs per dimension, computed independently. One is a numeric value, a confidence-and-trust-weighted mean over the consenting sources. The other is a Belnap state, a label that says whether the sources agreed, disagreed, or said nothing. The router downstream reads both, so a dimension marked as contradictory can be sent to several sources for cross-validation instead of being trusted as a fictional average.

## The four values

Nuel Belnap's logic admits four truth values. In `belnap.rs` they are the variants of `BelnapValue`, and each carries a meaning for the network.

| Value | In code | Reading | Network meaning |
|---|---|---|---|
| True | `BelnapValue::True` | known true | the trusted sources agree this dimension is positive |
| False | `BelnapValue::False` | known false | the trusted sources agree it is negative |
| Both | `BelnapValue::Both` | true and false at once | sources of comparable trust genuinely disagree |
| Neither | `BelnapValue::Neither` | no information | no source spoke with enough confidence |

A mean collapses Both and Neither into the True/False continuum and loses them. The four-valued reduction keeps them. A `Both` is the signal that a dimension is contested; a `Neither` is the signal that it is simply unknown.

## How the implementation works

The four values form a bilattice with two orderings. `belnap.rs` implements both: a knowledge ordering, where Neither sits below True and False, which sit below Both, and a truth ordering, where False sits below Neither and Both, which sit below True. The operations are `join` (combine information), `meet` (keep only what both inputs agree on), and `negation` (swap True and False, leave Both and Neither unchanged). Property tests check that join and meet are commutative, associative, idempotent, satisfy absorption, and that negation is its own inverse.

Aggregation runs in three steps inside `ParaconsistentAggregator::aggregate_paraconsistent` (`aggregation.rs`):

1. Trust weights come from consensus. Each source's blue score is turned into a softmax weight, `softmax(blue_score / temperature)`, so a node that cannot keep up with consensus carries little weight in learning (`belnap.rs::softmax_weights`, `blue_scores_to_trust_weights`).
2. Each source is classified per dimension by the function `classify_belnap`. A source above the high-confidence threshold that agrees with the trust-weighted majority is True; one that disagrees alone is False; one that disagrees but has a comparably trusted ally on its side is Both; one below the threshold is Neither.
3. The per-source classifications are reduced to one state vector by joining across sources (`reduce_belnap_states`). If any source is Both, or sources split True against False, the result is Both. If all agree, it is True. Neither is absorbed by any other value.

The numeric embedding is computed separately, as a weighted mean using each source's trust weight times its per-dimension confidence. The two outputs, the embedding and the state vector, never read each other, which is what lets a dimension be numerically near zero and still be labelled Both.

## How it maps to the network

- The aggregation is checkpoint-aligned. Validators co-sign learning roots at the checkpoint barrier rather than per block, so learning safety inherits from the chain's safety and learning liveness from its liveness. See [the checkpoint mechanism](/chain/consensus).
- The state vector is carried into [the learning cycle](/research/learning): the router reads it, and the macro-phase progression uses the aggregation's confidence.
- A verifiable, in-circuit form of this aggregation is proposed but not built. The plan is a Belnap reduction over a fixed-point representation so the result is bit-deterministic and can be proved, which would let the aggregation be checked rather than trusted. See [zero-knowledge precompiles](/chain/precompiles-zkp) and [verifiable inference](/research/verifiable-inference).

## Reference

| Item | Kind | Source |
|---|---|---|
| `BelnapValue` | the four values | `core/learning/src/belnap.rs` |
| `join`, `meet`, `negation` | lattice operations | `core/learning/src/belnap.rs` |
| `k_leq`, `t_leq` | knowledge and truth orderings | `core/learning/src/belnap.rs` |
| `softmax_weights`, `blue_scores_to_trust_weights` | trust weights from blue scores | `core/learning/src/belnap.rs` |
| `classify_belnap` | per-source per-dimension classification | `core/learning/src/belnap.rs` |
| `reduce_belnap_states` | reduce sources to one state vector | `core/learning/src/belnap.rs` |
| `ParaconsistentAggregator::aggregate_paraconsistent` | the dual-output aggregation | `core/learning/src/aggregation.rs` |

## Design rationale

Averaging is cheap and almost always wrong when the inputs come from different distributions. Treating disagreement as information costs a richer representation, a state vector alongside the numbers, and a router that knows how to read it. The return is that the network can tell the difference between a dimension everyone agrees on, one that is genuinely contested, and one nobody has an opinion on, and it can act differently in each case. The two outputs are kept independent so that the label is never quietly derived from the number it is meant to qualify.

## Access and canon

Academic tier. No keys, endpoints, or credentials appear here. The logic is a research contribution; the in-circuit precompile that would make the aggregation verifiable is a design direction, labelled below.

## Source and verification

- Source: `citrate-chain/core/learning/src/belnap.rs` and `aggregation.rs`, audited against SHA `e68af83`. Adversarial tests in `core/learning/tests/belnap_adversarial.rs`.
- Status by surface. The Belnap lattice, the classification function, the reduction, and the dual-output aggregator are Implemented (pre-audit), with property tests for the lattice laws. The fixed-point, in-circuit aggregation precompile and the proof tie-in are Specified, not yet built.
- Related: [Citrate Orchard, federated learning cycles](/research/learning), [zero-knowledge precompiles](/chain/precompiles-zkp), [verifiable inference](/research/verifiable-inference).
