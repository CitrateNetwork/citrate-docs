---
title: "Paraconsistent Consensus: Federated Meta-Learning Over BlockDAG Finality (v3)"
version: v3
created: 2026-04-28T03:25:00Z
branch: main
author: Larry Klosowski + Claude Opus 4.7
status: active
maturity: Specified — see §7 for what's implemented vs hypothesized
supersedes: v2
---

# Paper II — Paraconsistent Consensus (v3)

## Abstract

Classical BFT treats disagreement as a defect to be eliminated:
honest nodes must converge on a single value before a decision
counts. **Paraconsistent consensus** refuses that frame. It says:
disagreement is information about the network's epistemic state,
and a system that *averages it away* is throwing away the very
data that distinguishes a healthy decentralized network from a
collapsed one.

This paper proposes a federated meta-learning protocol that runs
**on top of** the GhostDAG / BFT checkpoint mechanism described
in Paper I. Each checkpoint becomes a synchronization barrier
not just for blocks but for **routing weights, adapter
registrations, and embedding aggregations**. The novel ingredient
is the use of **Belnap's four-valued logic** to aggregate
embedding dimensions across nodes — preserving "both" and
"neither" as first-class outcomes rather than collapsing them.

v3 substantively revises the v2 spec by tying every aggregation
step to a concrete contract (`LearningPool`, `LearningCycleManager`)
and a concrete data path (the optional `learning_payload` field in
the BlockHeader). What v2 left vague — *how* a node decides to
trust another node's gradient — v3 anchors in
`ContributionAccounting.sol`'s scoring.

## 1. The frame

### 1.1 Belnap FOUR

Nuel Belnap's 1977 four-valued logic admits four truth values:

| Symbol | Reading | Network analog |
|--------|---------|----------------|
| **T** | True | All known sources agree this dimension is positive. |
| **F** | False | All known sources agree this dimension is negative. |
| **B** | Both | Sources disagree (some say T, some F). Information is contradictory. |
| **N** | Neither | No source has spoken; we don't know. |

Classical aggregation (mean, median, weighted average) collapses
B and N into the T/F continuum. Paraconsistent aggregation
**preserves** them. A network that knows it doesn't know about
some embedding dimension is more honest, and more debuggable,
than a network that pretends to a fictional consensus.

### 1.2 Why this matters for AI

A federated learning network has nodes with **different data
distributions**. If node A's training data implies dimension 47
should be `+0.8` and node B's data implies it should be `-0.6`,
the mean (`+0.1`) is not the right answer for either node. It's
the right answer for the *projection* of both onto a single point
— which is fine if you're doing one-shot training, but disastrous
when the underlying data distributions are genuinely different
(personalized models, regional dialects, domain-specialist
adapters).

Paraconsistent aggregation says: "dimension 47 is in state B for
this checkpoint. Routing decisions over dimension 47 should
consult both adapter A and adapter B, not a synthesized average."

## 2. Mechanism

### 2.1 Three-phase learning protocol

**Phase 1 — Embedding collection (continuous).** Every node that
serves an inference request optionally posts an embedding
contribution to its local pool, signed by its validator key. The
contribution is a (768- or 1024-dimensional) embedding plus a
**confidence vector** of the same dimension.

**Phase 2 — Routing activation (per checkpoint).** When the BFT
committee assembles for the checkpoint at height `H`, the
checkpoint payload includes three additional hashes:

| Field | Bytes | What it commits to |
|-------|-------|--------------------|
| `routing_weights_root` | 32 | Merkle root of routing model parameters |
| `adapter_registry_root` | 32 | Merkle root of registered LoRA adapters |
| `performance_profile_root` | 32 | Merkle root of node performance scores |

Validators co-sign these alongside the standard checkpoint, and
nodes that follow the checkpoint pull the new routing model.

**Phase 3 — LoRA adapter mentorship (continuous, between
checkpoints).** Nodes whose performance profile shows a gap on
some embedding region can request a LoRA adapter from a node
whose profile is strong there. The exchange is recorded on-chain
via `LoRAFactory` (canonical address in
`TESTNET_ADDRESS_BOOK_2026_04_27.md` §A.3) and the requesting
node's score is debited a small fee, paid to the providing node.

### 2.2 Lightweight routing model

The routing model is intentionally small — a 100K to 500K
parameter MLP that maps `(query_embedding) → (chosen_node_id,
chosen_adapter_id, confidence)`. v3 specifies the architecture
as a 3-layer feed-forward network with hidden dim 128, ReLU
activations, softmax output. At 500K params and Q16.16
quantization (matching precompile `0x010E` Q16_LINEAR), the
routing model is **8 MB on disk** — small enough to live in every
validator's RAM and be re-trained between checkpoints.

The routing model itself is trained **on-chain** in the limited
sense that its parameters are committed via Merkle root in each
checkpoint. The actual gradient updates happen off-chain (no
gradient descent in EVM), but the chain certifies the
commitments.

### 2.3 Extended block fields

Each block in v3 carries an **optional** `learning_payload`:

```
learning_payload : Option<{
  embedding_contribution: Option<{
    embedding: [Q16; 768],
    confidence: [Q16; 768],
  }>,
  routing_weights_diff: Option<MerkleProof>,
  adapter_registration: Option<{
    adapter_id: bytes32,
    lora_factory_tx: bytes32,
  }>,
}>
```

Worst-case size: ~6 KB per block (768 dims × 4 bytes Q16 × 2
vectors). At 0.5s block time, this is 12 KB/s of learning
traffic per node — well inside libp2p's bandwidth envelope.

**Status: this field is specified in the v3 paper but not yet
implemented in the BlockHeader struct.** Implementation lands in
the RM-PARA-1 sprint.

## 3. Belnap aggregation algorithm

For each dimension `d` of an embedding, given contributions
`{(c_i, w_i)}` from `n` nodes (where `c_i ∈ Q16` is the
contribution and `w_i ∈ Q16` is the confidence weight):

```
threshold_high = +0.5  (Q16: 0x0000_8000)
threshold_low  = -0.5  (Q16: 0xffff_8000)

count_T = |{i : c_i ≥ threshold_high  ∧ w_i > w_min}|
count_F = |{i : c_i ≤ threshold_low   ∧ w_i > w_min}|
count_unknown = |{i : w_i ≤ w_min}|

if count_T > 0 ∧ count_F > 0:                 state = B  (both)
elif count_T > 0:                              state = T
elif count_F > 0:                              state = F
elif count_unknown == n:                       state = N  (neither)
```

The output of aggregation for dimension `d` is the Belnap state
plus the weighted mean restricted to consenting sources:

```
if state ∈ {T, F}:    mean = Σ(c_i · w_i) / Σ(w_i) over consenting i
if state = B:         mean = (mean_T, mean_F) — pair, not scalar
if state = N:         mean = ⊥ (undefined)
```

The routing model receives this **enriched** representation, not
a flat scalar mean. A query that activates a B-state dimension
is routed to multiple downstream nodes for cross-validation, not
to "the mean."

This algorithm is implementable as a Q16 precompile — proposed
address `0x0110` in the `0x0110–0x011F` range reserved for
quantized inference (RM-M2b). Specification — not yet implemented.

## 4. Three experimental hypotheses

The paper makes three falsifiable claims that v3 elevates from
"design intuition" to "experiments to run":

**H1 — Aggregation quality.** Paraconsistent aggregation
preserves recall on B-state dimensions ≥ 5% better than
weighted mean averaging on a synthetic dataset with
deliberately conflicting node populations. *Experiment:*
construct a 4-region MNIST-like dataset where each region's
training set has 25% mislabeled samples in different label
classes. Compare classifier accuracy of (a) flat-mean
aggregated model, (b) Belnap-aggregated routed model.

**H2 — Adapter composition over time.** As more LoRA adapters
register, aggregate accuracy on the union of all node's tasks
strictly increases, with diminishing returns described by a
power-law in adapter count. *Experiment:* register N adapters
incrementally; measure accuracy on a held-out test set spanning
all task domains; fit power law `acc(N) = α − β·N^{−γ}`.

**H3 — Convergence under Byzantine conditions.** With ≤ 1/3
Byzantine validators, the routing model parameters converge
within `O(log H)` checkpoints from any starting point. *Experiment:*
inject random Byzantine validators, measure parameter drift over
checkpoints, fit logarithmic-vs-linear residuals.

These experiments are **not run yet**. The paper specifies them
so a researcher can run them when the implementation lands.

## 5. Connection to GhostDAG finality

The protocol is **deliberately checkpoint-aligned**. We do not
ask validators to vote on routing weights at every block
(communication explosion); we ask them to vote on the routing
model's Merkle root at every checkpoint (50× cheaper).

This means:

1. The **safety** of paraconsistent learning inherits from BFT
   safety. If 67/100 validators agree on a checkpoint, they
   also agree on the routing model active for the next 50 blocks.
2. The **liveness** of paraconsistent learning inherits from
   GhostDAG liveness. As long as the chain advances, learning
   epochs advance.
3. **Slashing** of a Byzantine routing-weight signer happens
   through the same NematocystSlashing contract that punishes
   block-withholding and double-signing — paraconsistent
   learning is not a separate trust domain, it's another column
   of the same accountability table.

This is the load-bearing claim of the paper: *consensus and
learning are the same process at different time scales.*

## 6. Implementation reality check

| Component | Status | File |
|-----------|--------|------|
| BFT checkpoint with extended payload | Specified | `core/consensus/src/finality.rs` (current payload doesn't include learning fields) |
| `LearningPool` contract | Implemented | `contracts/src/LearningPool.sol` (`0x9a58E44f8DD6fd6a75637A32e6E51c16440996F8`) |
| `LearningCycleManager` contract | Implemented | `contracts/src/LearningCycleManager.sol` (`0x20a0B74c766E84B20558ABD76a7a0Fd6434A4c4c`) |
| `LoRAFactory` contract | Implemented | `contracts/src/LoRAFactory.sol` (`0xAc6Bfb1709BCba5A005FE2823B4D8bC55db2b7D9`) |
| Belnap aggregation precompile | Specified (proposed `0x0110`) | not yet started |
| Routing model training pipeline | Specified | not yet started |
| Three experimental hypotheses | Specified | no test rig yet |

What's running today: a learning-cycle state machine on-chain,
contributors registering adapters, classroom pilots tracking
participation. What's not running today: actual federated
gradient aggregation with paraconsistent semantics. v3 is honest
about this gap.

## 7. References

- Belnap, N. (1977). *A useful four-valued logic*. In *Modern
  Uses of Multiple-Valued Logic*.
- McMahan, B. et al. (2017). *Communication-Efficient Learning
  of Deep Networks from Decentralized Data*. AISTATS.
- Hu, E. et al. (2021). *LoRA: Low-Rank Adaptation of Large
  Language Models*. arXiv:2106.09685.
- Citrate Paper I — protocol foundation.
- Citrate Paper III — mentorship protocol (the social-layer
  counterpart of this technical mechanism).
- Citrate Paper X — Q16 substrate making in-circuit aggregation
  bit-deterministic.
