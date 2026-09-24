---
title: "The Mentorship Protocol: Organizational Learning Theory for Decentralized Agent Swarm Orchestration"
subtitle: "Central Oracle Design, SECI Knowledge Mapping, and Double-Loop Learning at BFT Checkpoints"
series: "The Gradient Papers — No. III"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Implemented mechanism, Hypothesis outcomes
supersedes: "v2 (February 2026), v3-April draft"
---

# The Mentorship Protocol
### Organizational Learning Theory for Decentralized Agent Swarm Orchestration
#### Central Oracle Design, SECI Knowledge Mapping, and Double-Loop Learning at BFT Checkpoints

**The Gradient Papers — No. III**
Larry Klosowski, Lauren Mendenhall · Citrate Inc.
Preprint — not yet peer reviewed.

> **Maturity: [Implemented] mechanism, [Hypothesis] outcomes.** This paper gives the
> organizational-design rationale behind Paper II. In February 2026 the mechanism it motivates
> was specified; it is now built, the mentor-mentee loop, adapter generation, and the on-chain
> registry all cite source and deployed contracts. What remains untested is whether the
> *organizational-learning outcomes* the theory predicts actually emerge, and those stay
> explicit hypotheses with a stated methodology.

## Abstract

Federated learning treats aggregation as a stateless operation, discarding the organizational
intelligence that human institutions encode through mentorship, hierarchical knowledge transfer,
and double-loop learning. This paper provides the organizational-design rationale for the
Paraconsistent Consensus protocol of Paper II, arguing that three pillars of organizational
learning theory, Senge's systems thinking, Nonaka and Takeuchi's SECI knowledge-creation spiral,
and Argyris and Schön's double-loop learning, map to concrete architectural patterns for
decentralized agent swarms. The central contribution is the Central Oracle: a knowledge
aggregation hub, first proposed in the author's 2023 internal note, that maps to BFT finality
checkpoints in the Citrate Network. The Oracle maintains performance profiles, generates targeted
LoRA-adapter mentorship signals, and improves its own aggregation strategy over time, realizing
double-loop learning at the protocol level. We are explicit about the boundaries of the analogy:
the SECI mappings are structural analogies that motivated the architecture, not functional
equivalences that validate it. Unlike the February 2026 draft, the mechanism is now implemented,
we cite the adapter and mentor code and the deployed contracts, but the organizational-outcome
predictions remain hypotheses, and we report no simulation results in their place.

**Keywords:** organizational learning, mentorship, agent swarms, federated meta-learning, Central
Oracle, knowledge aggregation, double-loop learning, SECI model, Citrate Network

## 1. Introduction

The aggregation server in Federated Averaging [2] computes a weighted mean and forgets. It
maintains no model of which clients excel at which tasks, provides no targeted guidance, and
cannot improve its own aggregation strategy. This is not a limitation of the mathematics; it is a
limitation of the organizational design.

Human organizations solved this through mentorship: experienced practitioners observe individual
strengths, provide targeted guidance, and improve as teachers through the act of teaching [3, 4].
The recursive relationship between teaching quality and student outcomes is the engine that drives
organizations from competent to excellent [5]. This paper asks: what organizational-design
principles, drawn from decades of management science, should govern the architecture of a
decentralized learning system?

We answer by formalizing the Mentorship Protocol, which operationalizes three pillars of
organizational learning theory as agent-swarm patterns. From Senge [3], organizational
intelligence emerges from interaction patterns between individuals, not from any individual's
capability alone. From Nonaka and Takeuchi [4], the SECI spiral transforms tacit expertise into
explicit, transferable knowledge. From Argyris and Schön [5], the distinction between single-loop
learning (correcting errors within a framework) and double-loop learning (questioning the
framework itself).

The central contribution is the Central Oracle, a knowledge aggregation hub that collects
observations from all agents, maintains performance profiles, and generates targeted mentorship
signals. In the Citrate Network this Oracle is realized as the BFT finality checkpoint: a
distributed, trustless commitment that periodically crystallizes the network's collective
intelligence and propagates LoRA-adapter mentorship signals to individual node-models. The
concept was first proposed in the author's 2023 internal note and is updated here to reflect its
implementation path through the consensus architecture (Paper I) and paraconsistent aggregation
(Paper II).

**Prior work.** da Silva [6] formalized Senge's Fifth Discipline from a multi-agent-systems
perspective (JASSS), using the SMART framework and Z specification. da Silva's findings, that
learning-organization agents must be honest, cooperative, and tenacious, and that trust is
fundamental, align with the Byzantine-fault-tolerance requirements of our checkpoint-based system.
We extend that formalization to federated learning, where the learning organization is a
decentralized network and the knowledge-transfer mechanism is LoRA-adapter generation at consensus
checkpoints.

**Implementation status.** This paper is design rationale, the *why* behind the *what* of Paper
II. Sections marked **[Rationale]** provide motivation; **[Hypothesis]** flags testable
predictions; **[Implemented]** cites code or a deployed contract. The consensus infrastructure is
implemented (Paper I), and, unlike the February draft, the learning mechanism is now built too
(Paper II); the organizational-outcome predictions remain untested.

## 2. Organizational Learning Foundations

### 2.1 Senge's Five Disciplines

**[Rationale]** Senge's *The Fifth Discipline* [3] identifies five practices that distinguish
learning organizations: personal mastery, mental models, shared vision, team learning, and
systems thinking. The fifth is integrative: organizations fail not because individuals are
incompetent but because interactions between individuals produce emergent dysfunctions no single
participant can observe or correct.

For agent swarms this applies directly. A swarm of individually capable models can produce
collectively poor outcomes if contributions interfere destructively, the aggregation problem that
motivates paraconsistent consensus (Paper II). Systems thinking demands that the orchestration
layer model not just individual performance but the interaction patterns between agents: which
complement each other, where redundancy helps, and where contradiction signals genuine
disagreement versus noise. da Silva's formalization [6] shows that systems thinking requires
agents that reason about organizational structure, not just local state, and that this depends on
honest, cooperative behavior that emerges only in trust-rich environments. In Citrate, the BFT
consensus mechanism provides the trust substrate: only nodes with blue scores above a threshold
have demonstrated honest participation, and only these can serve as mentors (Section 4.2). This is
da Silva's trust requirement realized through consensus.

### 2.2 The SECI Knowledge-Creation Spiral

**[Rationale]** Nonaka and Takeuchi [4] formalize knowledge creation as a spiral through four
modes: Socialization (tacit → tacit), Externalization (tacit → explicit), Combination
(explicit → explicit), and Internalization (explicit → tacit).

**Table 1. SECI model → agent-swarm mapping.**

| SECI mode | Knowledge transition | Agent-swarm mechanism | Analogy strength |
|-----------|----------------------|-----------------------|------------------|
| Socialization | Tacit → Tacit | Agents observe peer embeddings via DAG gossip | Weak (see note) |
| Externalization | Tacit → Explicit | Internal model state encoded as embedding in a block | Moderate |
| Combination | Explicit → Explicit | Paraconsistent aggregation at BFT checkpoint combines embeddings | Strong |
| Internalization | Explicit → Tacit | Node applies a LoRA adapter, modifying internal behavior | Strong |

**Note on analogy strength.** We rate each mapping because SECI describes human knowledge
processes, not computational ones. Socialization is the weakest: in Nonaka's framework it involves
shared physical experience, apprentices learning by observing masters, whereas gossip-protocol
propagation is data broadcast, not shared experience. We include it for completeness without
claiming it captures the richness of human socialization. Combination is the strongest: Nonaka's
synthesis of explicit knowledge from multiple sources into new explicit knowledge is precisely what
paraconsistent aggregation does when it combines node embeddings into routing weights and Belnap
state vectors at checkpoints. Internalization is also strong: applying a LoRA adapter transforms
explicit, transferable knowledge (the adapter weights) into modified internal behavior, Nonaka's
"learning by doing."

### 2.3 Single-Loop and Double-Loop Learning

**[Rationale]** Argyris and Schön [5] distinguish two learning modes. Single-loop learning
corrects errors within a framework: the model predicted incorrectly, so we adjust weights.
Double-loop learning questions the framework: the model keeps failing on this input class, so
perhaps the routing strategy is wrong or the node should specialize. In the Mentorship Protocol,
single-loop learning corresponds to LoRA-adapter generation, a targeted correction for a specific
weakness, and double-loop learning corresponds to the meta-model modifying its own routing weights,
changing which nodes receive which queries. Each checkpoint is an opportunity for both. This is the
organizational argument for why the routing model must be trainable rather than static: a fixed
routing function can only perform single-loop corrections, while a trainable one can perform the
double-loop restructuring Argyris and Schön identify as the primary driver of organizational
transformation.

## 3. The Central Oracle

### 3.1 Architecture and History

The Central Oracle of Truth and Knowledge was first proposed in the author's 2023 internal note as
the organizational hub of a mentorship-driven swarm, maintaining three structures: a knowledge base
aggregating observations from all agents, a performance profile tracking each agent's accuracy
across input classes, and a mentorship registry mapping mentor-mentee pairs by complementary
strengths.

**[Implemented]** In the Citrate Network the Oracle is not a server process; it is the BFT finality
checkpoint itself, and its three structures now have concrete homes. The knowledge base is the
committed set of embeddings; the performance profile and macro-phase are fields of the
`LearningCheckpoint` (`core/learning/src/checkpoint.rs:14`, with the per-node metrics root at
`:45`); and the mentorship registry is the on-chain adapter registry in **`LoRAFactory.sol`**
(deployed `0x6e564d22…`), not the "0x1003 precompile" the February draft named, which held
`adapterModelCommitment` and `verifyAdapterAt` for proof-backed adapter commitment. Pool
membership and cycles are managed by `LearningPool.sol` (deployed `0xfc514b82…`), and mentor-mentee
pairing is matched on-chain by `MentorMatcher.sol`. The Oracle is not a single point of failure: a
checkpoint requires 67 of 100 validator signatures (Paper I §2.3), making it trustless and
verifiable.

**Honesty note on "checkpoint."** `LearningPool` exposes **cycles** (`startCycle`/`endCycle`), not
literal per-block checkpoints; the proof-backed commitment semantics the Oracle relies on live in
`LoRAFactory`'s `adapterModelCommitment`/`verifyAdapterAt`, and the finality checkpoint that binds
them is the BFT committee checkpoint of Paper I, whose default interval is 50 blocks. Where this
paper says "at each checkpoint," read it as "at each learning cycle boundary, committed against a
BFT checkpoint," not as a per-block event.

### 3.2 From Centralized Oracle to Distributed Checkpoint

The migration from the 2023 centralized Oracle to the 2026 distributed checkpoint follows a pattern
familiar in organizational design: a function that begins as a single role (chief knowledge officer,
lead mentor, architect) is distributed across the organization as processes mature. In the
centralized formulation the Oracle was a single server aggregating client updates; in the
distributed formulation its functions are performed collectively by the finality committee, with
BFT consensus ensuring no single member can corrupt the aggregation. This addresses the primary
criticism of the original concept, that it reintroduces the single point of failure decentralization
was meant to eliminate, by providing the Oracle's aggregation and mentorship-generation functions
while inheriting the consensus safety guarantees (Paper I §6.1).

The organizational reading matters because it explains a design choice that would otherwise look
arbitrary. A naive decentralization would simply delete the Oracle and let each node train in
isolation, which is what plain FedAvg approximates when its server is a thin averaging step. But an
organization that deletes its knowledge-coordination function does not become more capable; it
becomes a collection of individuals who cannot learn from each other. The distributed checkpoint
keeps the coordination function while removing the trusted custodian, the same move a mature
institution makes when it turns a founder's tacit judgment into an explicit, auditable process that
survives the founder. The BFT committee is that process: it performs the Oracle's role without any
member being the Oracle, so the coordination benefit of centralization is retained while its failure
mode is not.

### 3.3 Mentor-Mentee Assignment

**[Implemented]** The Oracle assigns mentor-mentee relationships by complementary performance
profiles. Let Pᵢ(c) denote node i's accuracy on input class c and P̄(c) the network median. A node
is a candidate mentor for c if Pᵢ(c) > P̄(c) + δ, and a candidate mentee if Pᵢ(c) < P̄(c) − δ. The
mentorship signal is a LoRA adapter generated from the gradient of the collective loss restricted to
class c, compressed to rank r (default 16 [9]). This is realized in `core/learning/src/mentor.rs:3`,
which at each checkpoint identifies mentor-mentee pairs by a complementarity metric,
`|shared_domains| · (mentor.accuracy − mentee.accuracy)`, and forms a delta adapter as the
element-wise difference of mentor and mentee embeddings. Assignment is dynamic: pairs are
re-evaluated each cycle, and a node that was a mentee may become a mentor after receiving and
applying adapters. This mobility is the organizational-learning property: the system rewards
improvement, not just initial capability, mapping to Senge's personal mastery [3].

## 4. Security and Trust

### 4.1 The Mentorship Trust Surface

The mentor-mentee dynamic introduces a trust surface flat aggregation avoids: a malicious mentor
could generate poisoned adapters that systematically degrade mentee performance. This is not
theoretical, the federated-learning literature documents data- and model-poisoning attacks where
Byzantine participants manipulate aggregated updates [10].

### 4.2 Trust Mechanisms

**[Implemented]** The protocol addresses this through three mechanisms grounded in the Paper I
infrastructure. **Blue-score gating:** only nodes with blue scores above a configurable threshold
can serve as mentor candidates, a consensus-derived trust metric matching da Silva's honesty
requirement [6]. **Adapter verification:** all adapters are committed on-chain with deterministic
hashes and can be re-derived from the committed embeddings and routing state; any node can verify by
replaying generation, and the verify-and-rollback path is implemented
(`core/learning/src/adapters.rs`: `apply_lora`, `remove_lora`, `verify_lora_hash`), with the
optimistic fraud-proof window of Paper I §3.3 for disputes and on-chain challenge in
`AggregationChallenge.sol`. **Performance-regression detection:** the routing model tracks per-node
performance before and after adapter application; systematic regression triggers adapter revocation,
the organizational analogue of terminating mentorship that consistently produces worse outcomes.

### 4.3 Byzantine Mentorship

These mechanisms inherit the BFT safety guarantees: with fewer than n/3 Byzantine committee members,
the committed routing state is correct and adapters derived from it are correctly generated. A
residual risk remains: a Byzantine coalition controlling fewer than n/3 seats could generate subtly
degrading adapters that pass fraud-proof verification but introduce long-term drift. Detecting this
requires longitudinal performance monitoring across many checkpoints, a capability the immutable
checkpoint chain enables but whose analysis tooling is not yet built. We flag this as an open
problem rather than claiming it solved.

## 5. Emergent Specialization

**[Hypothesis]** We hypothesize the Mentorship Protocol drives emergent specialization through a
reinforcing loop: nodes that perform well on specific input classes receive more queries for those
classes (via routing), generate more training signal there, and accumulate more specialized adapters.
Over successive cycles this produces a network of complementary experts rather than homogeneous
generalists. This is the organizational analogue of what Senge [3] calls team learning, capabilities
exceeding the sum of individual ones, with the routing model as coordination mechanism ensuring
specializations are complementary rather than redundant. The paraconsistent aggregation of Paper II
preserves the information this needs: the Belnap state vector tells the routing model where nodes
agree (T), disagree (B), are uncertain (N), or are confidently wrong (F). Whether emergent
specialization actually occurs, and whether it beats uniform model replication, is an empirical
question with methodology in Section 7.

## 6. Relationship to the Gradient Papers Series

Paper I provides the infrastructure (GhostDAG, BFT checkpoints, the LVM with AI precompiles, the
adapter registry); the Mentorship Protocol depends on it without modifying it. Paper II implements
the protocol at the protocol level: the Central Oracle becomes the BFT checkpoint, mentor-mentee
dynamics become the LoRA-adapter loop, and this paper supplies the rationale for why a learned
routing model (mentor) should outperform a stateless aggregator (FedAvg). Paper VII (Mozi
Cooperative) extends the knowledge-sharing framework to economics: the principle that value is
created through knowledge transfer, not hoarding, is the organizational foundation for cooperative
ownership. Paper IX (Medusa Paradigm) provides the biological inspiration: the jellyfish nerve net's
combination of local autonomy and global coordination through periodic synchronization pulses is the
biological analogue of the checkpoint-based mentorship cycle, an inspirational analogy, not a formal
justification.

## 7. Experimental Hypotheses

Earlier versions of this paper reported simulation figures (faster task completion, error reduction,
faster adaptation) that were placeholders and did not represent measured outcomes. We keep them
removed and state three explicitly labelled hypotheses with designs.

**H1 — Targeted mentorship outperforms flat aggregation.** *Claim:* a mentorship-driven swarm
converges faster to a given accuracy threshold than flat FedAvg on a heterogeneous task distribution.
*Rationale:* targeted guidance reduces the search space for improvement [3, 5]; a targeted adapter
provides a gradient direction pre-computed from the mentor's expertise, where FedAvg requires the
mentee to discover it. *Methodology:* N = 50 non-IID nodes on the testnet, comparing FedAvg baseline
and the Mentorship Protocol; measure rounds to a 90% accuracy threshold, final accuracy, per-domain
variance, and total communication overhead, over 10 runs with confidence intervals. *Expected:*
fewer rounds but higher per-round overhead; whether total cost is lower is a prediction, not a
result.

**H2 — Double-loop learning improves routing over time.** *Claim:* a trainable routing model beats a
fixed routing function after sufficient training. *Methodology:* compare static (round-robin),
fixed-weight (blue-score proportional), and learned routing over ~10,000 checkpoints on routing
accuracy; if learned routing does not beat fixed-weight routing significantly, the double-loop
mechanism adds complexity without benefit.

**H3 — Emergent specialization produces complementary experts.** *Claim:* over successive cycles,
mentorship produces greater specialization diversity than a network without it. *Methodology:*
measure specialization via the Herfindahl index of per-node accuracy profiles, compare mentorship
against flat aggregation over ~10,000 checkpoints, and test whether specialization is complementary
(different classes) or redundant (same classes); complementary specialization is the predicted
outcome, redundant would indicate a failure of the routing model's diversity regularization.

## 8. Conclusion

The Mentorship Protocol provides the organizational-design rationale for the Paraconsistent Consensus
architecture of Paper II. Its central contribution, the Central Oracle realized as a BFT finality
checkpoint, transforms stateless federated aggregation into a stateful, adaptive, knowledge-
accumulating system. The mappings from Senge, Nonaka and Takeuchi, and Argyris and Schön provide the
theoretical frame: systems thinking explains why modeling interactions matters, the SECI spiral how
knowledge transforms between tacit and explicit, and double-loop learning why the routing model must
be trainable. We have been explicit about the analogies' boundaries, strong for Combination and
Internalization, weak for Socialization, and about status: the mechanism is now built (mentor loop,
adapter lifecycle, on-chain registry), and the organizational-outcome predictions are hypotheses, not
results. The fabricated metrics of earlier versions stay removed. What remains is the empirical
validation the infrastructure now makes possible.

## Acknowledgments

Drafting and literature triage were assisted by AI systems; all mechanical claims were verified by
the authors against the referenced source files and deployed contracts on chain 40204. This work
received no external funding.

## References

[1] Klosowski, L. (2023). Mentor/Mentee Relativity: Organizational Learning in Mentorship-Driven Swarms. Unpublished internal note, Citrate Inc.
[2] McMahan, B., et al. (2017). Communication-efficient learning of deep networks from decentralized data. *AISTATS*, 1273–1282.
[3] Senge, P. M. (1990). *The Fifth Discipline: The Art and Practice of the Learning Organization.* Doubleday.
[4] Nonaka, I., & Takeuchi, H. (1995). *The Knowledge-Creating Company.* Oxford University Press.
[5] Argyris, C., & Schön, D. A. (1978). *Organizational Learning: A Theory of Action Perspective.* Addison-Wesley.
[6] da Silva, L. P. (2005). A formal model for the Fifth Discipline. *Journal of Artificial Societies and Social Simulation (JASSS)*, 8(3), 6. *(Verify locator before final submission.)*
[7] Klosowski, L., Mendenhall, L. (2026). Citrate: Protocol Specification for an AI-Native BlockDAG Network. *The Gradient Papers No. I* (this series).
[8] Klosowski, L., Mendenhall, L. (2026). Paraconsistent Consensus. *The Gradient Papers No. II* (this series).
[9] Hu, E. J., et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models. *ICLR 2022.*
[10] Blanchard, P., et al. (2017). Machine learning with adversaries: Byzantine-tolerant gradient descent. *NeurIPS.*
[11] Demers, A., et al. (1987). Epidemic algorithms for replicated database maintenance. *ACM PODC*, 1–12.
[12] Shazeer, N., et al. (2017). Outrageously large neural networks: the sparsely-gated mixture-of-experts layer. *ICLR.*
[13] Sompolinsky, Y., & Zohar, A. (2018). PHANTOM and GHOSTDAG. *IACR ePrint.*
[14] Kaspa Network. (2025). KIP-14: Crescendo Hardfork. Activated May 5, 2025.
[15] Belnap, N. D. (1977). A useful four-valued logic. In Dunn, J. M., Epstein, G. (eds), *Modern Uses of Multiple-Valued Logic*, Reidel.
[16] Biderman, D., et al. (2024). LoRA learns less and forgets less. *Transactions on Machine Learning Research.*
[17] Ilharco, G., et al. (2023). Editing models with task arithmetic. *ICLR.*
[18] Bonabeau, E., Dorigo, M., Theraulaz, G. (1999). *Swarm Intelligence: From Natural to Artificial Systems.* Oxford University Press.
[19] Busoniu, L., Babuska, R., De Schutter, B. (2008). A comprehensive survey of multiagent reinforcement learning. *IEEE Trans. Syst. Man Cybern.* 38(2), 156–172.
[20] Kirkpatrick, J., et al. (2017). Overcoming catastrophic forgetting in neural networks. *PNAS*, 114(13), 3521–3526.

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
