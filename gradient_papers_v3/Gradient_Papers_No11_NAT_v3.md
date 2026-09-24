---
title: "The Neuroarchitectural Transformer: Verifiable-by-Construction, Capability-per-Parameter, and Paraconsistent Federated Training"
series: "The Gradient Papers — No. XI"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Implemented
note: "Source of truth for the arXiv build is arxiv/No11.tex (adapted from the NAT repo paper); this markdown is a generated mirror."
---

# Introduction

#### The blob of weights.

A transformer is, mechanically, an undifferentiated block of parameters through which every token is pushed in full. This is enormously effective and enormously opaque. When such a model emits an output, there is no architectural fact of the matter about *which part of it* was responsible; any account of “what the model was doing” must be reconstructed, after training, by external tooling (probing, sparse autoencoders, activation patching). Mechanistic interpretability has made real progress at this reconstruction , but it remains *post-hoc*: it approximates, after the fact, a structure the architecture never committed to. You cannot *prove* what ran; you can only *infer* it. For chat that is acceptable; for regulated decisions, on-chain inference where a decision must be replayable, and decentralized scientific training where a contribution must be verifiable to be rewarded, opacity is disqualifying. These settings do not want a better explanation of a black box. They want the box not to be black.

#### The thesis: structure is interpretability.

NAT’s wager is that one can largely dissolve the opacity problem by *declaring* structure the architecture must respect, rather than discovering it afterward. We **partition** the hidden representation into named zones, each mapped—as a *mimetic analog*, not a fidelity claim—to a functional role; **wire** them over a fixed, declared topology that an auditor and a model checker can both read, modulated per input by a learned router that cannot create an undeclared edge; **merge** the outputs by attention-scored pruning on a deterministic Q16.16 fixed-point path; and **emit** a structured provenance trace as a first-class output of every pass. The trace is not a debug aside; it is the deliverable.

#### One move, three properties.

The contribution we most want to land is that declaring structure is not a trade. **(1) Verifiable by construction.** Zero-knowledge ML can prove, expensively and after the fact, that *some* opaque computation ran on committed weights —verifying the output, not the reasoning. NAT’s trace is verifiable by construction: the recorded decision is decision-faithful and replayable with no per-inference SNARK, on the same Q16.16 substrate as Citrate’s verifiable-inference precompiles . **(2) Capability per parameter that does not pay an interpretability tax—and widens with scale.** Holding parameters, data, seed, and compute fixed and varying only the partitioning, zone partitioning attains *strictly lower* held-out loss than an equal-parameter dense baseline at every rung of a parameter-matched ladder, and the margin *grows* with scale ($`0.024 \to 0.141`$ bits/byte across an $`\approx`$<!-- -->8$`\times`$ parameter range, $`5/5`$ seeds per rung), reproducing the same-direction effect first measured at byte level (small scale, $`\le`$<!-- -->2M parameters, no MoE baseline or component ablation yet; §<a href="#sec:results" data-reference-type="ref" data-reference="sec:results">6</a>). **(3) Decentralizable.** Because zones are composable, a federation can train and evolve a single zone; independently-trained contributions reconcile through the deterministic merge locally and, across nodes, through paraconsistent (Belnap) aggregation that preserves disagreement (*Both*) and ignorance (*Neither*) rather than averaging them away, operationalizing the Citrate thesis that consensus and learning are one process .

#### Contributions.

We tag each by status: *\[demonstrated\]* (implemented and evaluated), *\[implemented\]* (built and tested, not an evaluation), *\[specified\]* (designed, where noted formally modeled, not yet demonstrated).

1.  *\[implemented\]* The **zone-partitioned architecture**: declared named zones over a fixed, auditable topology with learned-but-bounded routing (the router provably cannot create undeclared edges), hybrid SSM/attention cores by function, and a non-learned executive harness.

2.  *\[demonstrated\]* **Provenance-as-verifiable-output**—the primary contribution: a first-class, deterministically-hashable trace, decision-faithful and third-party-replayable on the Q16.16 path and on-chain-committable, distinct from model cards, logging, and post-hoc interpretability, with a precise decision-faithful vs. bit-faithful distinction.

3.  *\[specified\]* An **ecosystem-compatibility design**: a GGUF/ONNX sidecar; the flattened-dense export and Ollama-class round-trip are not yet built.

4.  *\[demonstrated, small scale\]* The **H-01 result**: an equal-parameter ablation on real text finding partitioning attains *strictly lower* held-out loss than a dense control at every rung of a parameter-matched ladder, with the margin *widening* as scale grows ($`5/5`$ seeds per rung, $`\le`$<!-- -->2M parameters)—with explicit scale, data-ceiling, and missing-baseline caveats.

5.  *\[specified; partially scaffolded\]* A **paraconsistent federated-training frame**: composable zones reconciled by Belnap aggregation on a verifiable Q16.16 substrate, with a signed, verify-before-compose zone gather now implemented (`nat-federated`; local determinism TLA+-checked; the multi-node training cycle is future work), and $`\mathrm{compute}\times\mathrm{data\text{-}quality}`$ incentives.

6.  *\[implemented\]* A **reproducible Rust reference implementation** with TLC-green TLA+ specifications of the stateful surfaces, and a companion case study on agent-led model building.

#### Honest posture.

Every quantitative claim is anchored to a file or commit, or labeled a hypothesis; the brain analogy is a heuristic the architecture is free to abandon; and the load-bearing capability claim is stated with its scale caveat in the same breath. If a larger run refutes H-01, the honest move is to say so and change course—and the scale ladder exists so we, and the reader, can find out cheaply.

# Related work

#### Modular deep learning and mixture-of-experts.

Modular architectures route inputs through a subset of parameter-efficient modules and aggregate the result ; sparse mixture-of-experts realizes this for transformers . NAT shares the conditional-computation instinct but inverts the routing’s epistemics: MoE experts are discovered, interchangeable, and unnamed, and the gate is a black box. We do not claim named modules or fixed routing are new—hash/fixed-routed MoE fixes the assignment, named modules are surveyed in , and named, fixed-topology functional modules are decades old in cognitive architectures (ACT-R, Leabra). What is distinctive is not the naming but that the topology is a *machine-checkable auditable object*—a learned router that *provably* cannot create an undeclared edge (§<a href="#sec:arch" data-reference-type="ref" data-reference="sec:arch">3</a>, with the merge and gather model-checked, §<a href="#sec:verif" data-reference-type="ref" data-reference="sec:verif">4</a>)—composed with the provenance trace. MoE optimizes throughput; NAT optimizes auditability and capability-per-parameter at equal total parameters.

#### Brain-inspired language models.

The closest prior art is BriLLM , which also takes neuroscience as its starting point and claims full interpretability via a “signal fully-connected flowing” (SiFu) mechanism over a graph that *replaces attention entirely*. The differences are decisive: BriLLM abandons the transformer and with it the GGUF/ONNX/Ollama ecosystem; NAT keeps the transformer and stays ecosystem-compatible through a sidecar (§<a href="#sec:arch" data-reference-type="ref" data-reference="sec:arch">3</a>). BriLLM’s interpretability is node-level token mapping; NAT’s is functional-zone provenance recorded as a deterministically hashable, on-chain-verifiable artifact, not merely a readable graph (§<a href="#sec:verif" data-reference-type="ref" data-reference="sec:verif">4</a>). And NAT advances a falsifiable per-parameter capability claim against an equal-parameter dense baseline, which BriLLM does not.

#### State-space and hybrid sequence models.

State-space models offer linear-time recurrence and an explicit state; hybrids such as Jamba interleave SSM and attention *layers*. NAT organizes the hybrid by declared function: SSM cores in the temporal zones (<span class="smallcaps">SM</span>, <span class="smallcaps">CB</span>), attention in the reasoning zones (<span class="smallcaps">HP</span>, <span class="smallcaps">PF</span>, <span class="smallcaps">CX</span>), each SSM zone carrying a thin attention head for cross-zone talk.

#### Interpretability.

Mechanistic interpretability reverse-engineers trained transformers and is overwhelmingly *post-hoc*: it reconstructs, after training, a structure the architecture never committed to, and so approximates but cannot prove what ran. NAT makes interpretability intrinsic by construction—the zones are declared, and the provenance trace makes “which functional component produced this” a recorded, replayable fact.

#### Verifiable and zero-knowledge ML.

ZkML proves, after the fact, that an opaque computation ran on committed weights , at heavy cost—zkLLM takes on the order of fifteen minutes per proof for a 13B model, and even zkGPT, the fast path, proves GPT-2 in tens of seconds—and says nothing about the reasoning. NAT is verifiable by construction: the decision-faithful trace is replayable with no per-inference proof, on the same Q16.16 substrate as Citrate’s verifiable-inference precompiles , with which it composes when bit-exact certification of the numeric layer is required (§<a href="#sec:verif" data-reference-type="ref" data-reference="sec:verif">4</a>).

#### Recent parallel work (2025–2026).

Since this work’s first draft, decentralized and modular training has advanced quickly. INTELLECT-2 trains a 32B reasoning model over a permissionless swarm and introduces TOPLOC for verifying rollouts from untrusted inference workers, a verification-of-untrusted-compute primitive adjacent to NAT’s provenance trace. FLEx constructs per-client experts for federated mixture-of-experts LLMs, and conflict-aware federated MoE targets exactly the conflicting-expert problem NAT’s Belnap aggregation addresses by preserving disagreement rather than averaging it away. Recent surveys of model merging and weight-space learning are the current framing for NAT’s zone-composition and GMN-encoder claims. NAT is distinguished from all of these by its fixed, declared topology and its decision-faithful, on-chain-committed provenance trace, rather than post-hoc verification or opaque averaging.

#### Decentralized and federated training.

Federated averaging and low-communication distributed training train *monolithic* models as periodically synchronized replicas. NAT federates composable named zones instead of whole replicas: a node owns and trains a zone, submits signed zone outputs, and the deterministic merge reconciles independently-trained contributions (§<a href="#sec:fed" data-reference-type="ref" data-reference="sec:fed">7</a>). Where DiLoCo averages, NAT aggregates with paraconsistent semantics.

#### Decentralized science and blockchain AI.

Networks such as Bittensor and Gensyn, and the broader DeSci/DeAI movement , incentivize *opaque* contributions scored by validators—you trust the score, not the computation. NAT supplies the verifiable substrate that line lacks: a contributor’s work is a signed, provenance-traced, Q16.16-deterministic update whose value is $`\mathrm{compute}\times\mathrm{data\text{-}quality}`$ (§<a href="#sec:fed" data-reference-type="ref" data-reference="sec:fed">7</a>).

#### Paraconsistent logic.

Belnap–Dunn’s four-valued logic , with values true, false, both, and neither, is designed for reasoning from multiple inconsistent or incomplete sources; its continuing imprint in computer science is traced in . NAT uses it as the federated-aggregation logic (§<a href="#sec:fed" data-reference-type="ref" data-reference="sec:fed">7</a>), preserving genuine disagreement and ignorance as first-class.

#### Scaling laws.

Compute-optimal scaling holds architecture fixed and trades off parameters, data, and compute. H-01 asks the orthogonal question those laws hold constant: at fixed parameters, data, seed, and compute, does *structure* change capability per parameter?

# The NAT architecture

## Zones

NAT partitions a transformer’s hidden representation of width $`D`$ into a fixed set of named zones, each owning a contiguous slice, its own sequence core, input projection, and internal state. There are six zones; five are learned and one is a non-learned executive harness (Table <a href="#tab:zones" data-reference-type="ref" data-reference="tab:zones">1</a>). The mapping to brain regions is a mimetic analog, not a fidelity claim; the load-bearing facts are that the zones are declared, the partition is fixed at build time, and the assignment of a representational slice to a named function is a property of the architecture rather than a discovery made after training. All six zones are declared and the forward pass is exercised end-to-end on all six (the L0 reference), but the *capability* evidence in §<a href="#sec:results" data-reference-type="ref" data-reference="sec:results">6</a> is on the three data-rich zones $`\{\textsc{HP},\textsc{PF},\textsc{CX}\}`$: the multimodal <span class="smallcaps">SM</span> and timing <span class="smallcaps">CB</span> zones have the thinnest data at this scale, so we hold them out of the load-bearing ablation until “the data earns it” (a staging decision). The architecture is six zones; the measured claims are three.

<div id="tab:zones">

| Zone | Role | Core |
|:---|:---|:---|
| <span class="smallcaps">SM</span> Sensorimotor | ingest + temporally bind multimodal input | state-space (SSM) |
| <span class="smallcaps">CB</span> Cerebellar | timing, sequencing, learned reflex | state-space (SSM) |
| <span class="smallcaps">HP</span> Hippocampal | memory consolidation, novelty/salience | attention |
| <span class="smallcaps">PF</span> Prefrontal | reasoning, planning, language (deepest) | attention |
| <span class="smallcaps">CX</span> Codec | reasoning $`\rightarrow`$ verifiable executable logic | attention |
| <span class="smallcaps">MX</span> MCP harness | validate / sequence / route tool use | none (state machine) |

The six zones. Temporal zones use state-space cores for linear-time recurrence and an explicit, loggable state; reasoning zones use attention. The SSM recurrence is computed as a single lower-triangular matmul, device-agnostic across CPU and GPU. The core backend is pluggable and recorded in every trace.

</div>

## Routing: fixed topology, learned modulation

The permitted inter-zone edges are declared in the sidecar and fixed at build time (default: $`\textsc{SM}{\to}\{\textsc{CB},\textsc{HP},\textsc{PF}\}`$, $`\textsc{CB}{\to}\textsc{PF}`$, $`\textsc{HP}{\to}\textsc{PF}`$, $`\textsc{PF}{\to}\textsc{CX}`$). For each input the router produces a zone-activation vector $`a\in[0,1]^{Z}`$ and an edge-modulation weight $`m_e\in[0,1]`$ for each *declared* edge. The crucial property—the one that keeps the system auditable while adaptive—is that the router can only modulate declared edges; **it cannot create an edge that is not there.** In the implementation this is structural: the router iterates the declared edge set and nothing else, so an undeclared edge has no code path to receive a weight. This is claim-shaped for IP review (C-1).

## Parallel execution and async gather

Zones execute in parallel and finish at different times. The merge boundary uses an async gather: each zone returns its output tagged with a confidence and a status; the merger waits up to a deadline, then composes with whatever arrived, recording a late zone as `timed_out`. This is the same gather discipline the federated case needs (§<a href="#sec:fed" data-reference-type="ref" data-reference="sec:fed">7</a>); its safety (no zone both `ok` and `timed_out`) and liveness (the window always closes) are model-checked (§<a href="#sec:verif" data-reference-type="ref" data-reference="sec:verif">4</a>).

## The merge

The merge runs four ordered steps on the gathered outputs: **score** each output; **prune** the bottom 70–80% by score (recording pruned contributions with their scores, so the decision is auditable not silent); **re-weight** the survivors to sum to one; **compose** by weighted sum. Steps 2–3 are a single canonical function used both to *produce* the trace and to *verify* it, so the verification in §<a href="#sec:verif" data-reference-type="ref" data-reference="sec:verif">4</a> is not circular. The compose step runs on the deterministic Q16.16 fixed-point path: a value $`v`$ is the integer $`\mathrm{round}(v\cdot 2^{16})`$ in an `i64`, with `i128` multiply intermediates. Integer arithmetic is bit-identical across CPUs and federated nodes where IEEE-754 float is not—the property that lets independently computed merges reconcile and on-chain provenance verify. The training-time merge is a differentiable form *reconciled to* this Q16.16 provenance merge: a battery test pins that its hardened survivor set equals the canonical survivors (the soft top-$`k`$ via temperature-annealed softmax converges to the hard survivors as $`\tau\to 0`$), so the model the gradient sees and the model the verifier replays make the same survivor decision; the composition weights are soft during training and anneal toward the hard recorded weights.

## The MCP harness

Tool use is mediated by a non-learned executive harness (<span class="smallcaps">MX</span>): a deterministic state machine plus a validator. It walks its states in order ($`\textsc{input\_validation}\to\cdots\to\textsc{return}`$) with two safety guards that fail closed: **no external side effect occurs before the action gate approves**, and **a failed Codec verification can never reach tool execution**. Because it is non-learned and side-effect-ordered, it is the most straightforwardly formalizable component; the TLA+ module states exactly these two invariants plus termination (claim C-4).

## Serialization: the GGUF sidecar

NAT keeps GGUF/ONNX as the tensor container and adds a sidecar (`.nat.json`) declaring the zone graph, topology, and merge parameters. A sidecar-unaware runtime runs the tensors opaquely; a sidecar-aware runtime runs the full zone pass with provenance. We are precise about status, because it is not yet built: a literal zone-partitioned graph with parallel heterogeneous SSM+attention zones does not serialize to a layout `llama.cpp` runs as-is, so the ecosystem onramp depends on a *flattened-dense* export that is **specified, not yet implemented**; the sidecar declares an `export_kind` field whose `FlattenedDense` variant is reserved for it, but only the `ZonePartitioned` form is produced today. The claim that NAT “runs in the existing inference ecosystem” is a design target, not a measured result.

# Verifiability by construction

## The trace

Every forward pass emits a structured provenance trace: an `input_hash`, the core `backend` (`toy-l0` / `candle-cpu` / `candle-cuda`), the router’s modulation, per-zone records (id, core, activated, confidence, latency, status), inter-zone flows, the merge (scores, prune threshold, survivors, weights), the codec verification, the harness transitions and tool calls, and an `output_hash`. It must be *complete* (every activated zone and prune decision recorded), *hashable* (deterministic serialization—stable field order, fixed-point values as raw integers, no map iteration), and *faithful* (next).

It is worth saying what is *not* novel: “logging what the model did” is old. Model cards , datasheets, and audit logs document a model or a run; activation caching records internals for post-hoc analysis. The trace differs on three specific counts, and the novelty is their conjunction: it is a **first-class output of the forward pass itself** (not an external probe); it is **decision-faithful and deterministically replayable** by a third party on the integer Q16.16 path, so the routing/prune decision can be re-derived bit-exactly rather than merely inspected; and it is **committed on-chain** as part of the inference transaction. No model-card or logging scheme offers third-party deterministic replay of the decision.

## Decision-faithful vs. bit-faithful

A naive reading of “replaying the logged zone mix reproduces the output” cannot be bit-exact, because the learned cores run in floating point and float is not deterministic across hardware. We distinguish two levels and claim only what holds. **Decision-faithful**: replaying the recorded scores through the canonical merge decision reproduces the recorded survivors and weights—a pure integer computation that always holds, and is what the verifier checks; because the same function produces and verifies the decision, this is non-circular rather than tautological in the sense that it confirms the implementation matches the specification. **Bit-faithful**: re-running the full pass reproduces `output_hash` bit-for-bit, which holds only under a deterministic-inference path (the Q16.16 merge is deterministic; the float cores are deterministic only in a deterministic mode). The decision-faithful guarantee is claim C-2; bit-faithful is an optional mode, and it composes with the cryptographic layer (§<a href="#sec:verif" data-reference-type="ref" data-reference="sec:verif">4</a>.4).

## On-chain commitment and replay

On Citrate, the trace hash becomes part of the inference transaction; an auditor pulls the committed weights, replays the recorded decision, and confirms it reproduces the output. That replayability is the opacity solution: we record the computation in a form a third party can re-check.

## Relation to Citrate’s verifiable-inference substrate

NAT does not replace verifiable inference; it supplies the structural layer zkML and TEE attestation lack. ZkML proves, after the fact and at heavy cost, that some opaque computation ran on committed weights, verifying the output not the reasoning. NAT’s trace verifies the reasoning, by construction, with no per-inference proof, because its merge uses the same Q16.16 substrate as Citrate’s verifiable-inference precompiles : a NAT trace hash is directly committable, and when bit-exact certification of the numeric layer is needed it can be wrapped in a Halo2-KZG proof or a TEE attestation as that work describes.

## Formal specifications

Eight TLA+ modules cover the stateful and federated surfaces; three cover the core forward path: `MergeDeterminism` (same gathered set $`\Rightarrow`$ same result; pruning correct, complete, tie-free), `AsyncGather` (terminates, respects the deadline, records every straggler), and `McpHarness` (<span class="smallcaps">NoUngatedSideEffect</span>, <span class="smallcaps">NoExecOnFailedCodec</span>, termination). The other five cover the federated and weight-space surfaces: `GradientAggregation` and `GradientAggregationAdversarial` (deterministic per-coordinate trimmed-mean reduction; Byzantine cannot flip the aggregate under honest dominance), `UnifiedSettlement` (weight conservation), `WeightCommitment` (commitment soundness, tamper detection), and `LoraRegistration` (only verified adapters register). **TLC is green on all eight** (via `scripts/run-tlc.sh`, 2026-06-27): `MergeDeterminism` over 31 distinct states, `AsyncGather` over 40, `McpHarness` over 10, `GradientAggregation` over 625, `GradientAggregationAdversarial` over 905, `UnifiedSettlement` over 8, `WeightCommitment` over 361, and `LoraRegistration` over 961, with no invariant violations. The remaining open formal item is counsel sign-off on the claim-shaped statements C-1–C-5, not the model checking. The defensible combination is *auditable-by-construction, GGUF-compatible, zone-partitioned, with on-chain-verifiable provenance and a formally-specified tool harness.*

# Hypotheses and experimental design

#### The ledger.

**H-01** (load-bearing): zone partitioning does not reduce capability per parameter versus a dense baseline of equal size. **H-02**: context-aware routing produces measurably different zone mixes for different prompt classes. **H-03a/b**: provenance is decision-faithful / bit-faithful (under a deterministic path). **H-04**: SSM temporal zones cut per-zone compute. **H-05a/b**: the merge composes the same gathered set identically / a federated training cycle reproduces the centralized result within tolerance (a distinct, statistical claim). H-01 decides whether the bet pays off; the scale ladder tests it cheaply.

#### The H-01 protocol.

An ablation at unequal parameters proves nothing, so the comparison is pinned by protocol and the protocol is *enforced in code*—the harness refuses to run (and to report) a comparison outside tolerance. The partitioned arm is the real trainable model (zones + the learned router + the differentiable merge reconciled to the Q16.16 provenance merge); the control is an equal-parameter dense single-block transformer whose feed-forward width is searched until its parameter count matches within $`\pm5\%`$ (the achieved match here is 0.08%: 20,718 vs. 20,701); a second guard refuses a toy-backed arm, so a measured result cannot be a toy artifact. Both arms share the same data, windows, epochs, batch size, learning rate, and shuffle seed—only the structure differs. Capability is proxied as the inverse of held-out cross-entropy, measured per parameter, averaged over five seeds; since $`1/\mathrm{loss}`$ is an arbitrary monotone transform and the arms are matched to 0.08%, the comparison is in effect *lower held-out loss at equal parameters*. The per-seed verdict is the non-inferiority test “partitioned $`\geq`$ dense within a 5% slack,” and the headline is the holds-fraction. We ran H-01 first on a synthetic task (too smooth, as it turned out) and then on real text, which we treat as primary. The same protocol is instantiated at two scales: a single-output byte-level ablation ($`\approx`$<!-- -->20.7K parameters) and a per-position autoregressive language model whose dense control is parameter-matched at *each* rung of a subword-tokenized ladder ($`248\mathrm{K}`$–$`2.0\mathrm{M}`$ parameters, the match held to $`\le 0.02\%`$ throughout), so the scale trend is a sequence of independently-matched ablations rather than one match extrapolated.

#### The corpus.

The corpus is a license-clean, public-domain “values spine” built through a fail-closed pipeline (license, length, dedup, PII, and quality gates). Its curation thesis doubles as a thesis of the paper: *a rule has no meaning without a community and a form of life* (Wittgenstein)—which is why a maker follows the rules of the room, why provenance must answer to a public standard, and why good code reads like the codebase around it. It spans logic (Boole $`\to`$ Frege $`\to`$ Russell $`\to`$ Belnap), computation (Turing $`\to`$ Church $`\to`$ Shannon), craft (SICP, the Rust Book, permissive code), and expression (Strunk, Whitman, Montaigne). The byte-level H-01 read uses the 1.12M-token prose spine (2,337 documents, 779 shards, 1,120,711 tokens); the corpus was then grown—adding the Rust Book and permissive crates, then SICP (CC-BY-SA, owner-approved)—into a 1.91M-token, 5,064-document v3, with a self-scored aggregate quality of 0.852 and zero quarantined documents (a curation diagnostic, not an external measure). Two tokenizations are used: byte-level (vocabulary 256, metric bits/byte, uniform baseline 8.0) for the small ablations, and a corpus-trained byte-pair encoding for the scale ladder; a parameter-matched vocabulary sweep locates a compression/efficiency knee near 4,096 (§<a href="#sec:results" data-reference-type="ref" data-reference="sec:results">6</a>), which is the vocabulary the ladder uses. Every result reports bits/byte, so the byte- and subword-level runs stay on one comparable axis.

# Results

## H-01: partitioning lowers held-out loss per parameter, and the margin widens with scale

Under the protocol of §<a href="#sec:hyp" data-reference-type="ref" data-reference="sec:hyp">5</a>, H-01 was read at three increasingly demanding settings; it holds at all three, and the central new finding is that as scale grows the partitioned model’s per-parameter advantage *widens* rather than erodes.

#### Byte level, 1.12M tokens.

The real model and an equal-parameter dense transformer ($`20{,}718 \approx 20{,}701`$ parameters, matched to $`0.08\%`$) were each mini-batch-trained on the prose spine as a next-byte LM across five seeds. The partitioned model’s held-out next-byte loss is **2.88–2.91 versus the dense baseline’s 2.97–2.99** (per-seed extremes, non-overlapping), mean capability-per-parameter $`1.670\times10^{-5}`$ vs. $`1.621\times10^{-5}`$. H-01 is registered as a *non-inferiority* hypothesis with a 5% slack, so “$`5/5`$” formally means “on no seed did partitioning fall more than 5% behind”—but here the stronger fact holds: partitioning is strictly lower-loss on every seed.

#### A harder corpus does not close the gap.

Regrowing the corpus to the 1.91M-token v3 (prose + Rust + SICP) raises both arms’ absolute loss—code and Scheme are higher-entropy than prose—but the margin survives: NAT **3.058–3.074** vs. dense **3.138–3.148**, $`5/5`$ seeds, capability-per-parameter $`1.575\times10^{-5}`$ vs. $`1.537\times10^{-5}`$. Partitioning is not winning because the text is easy.

#### At scale, the gap widens.

The decisive read moves to the real per-position autoregressive architecture (five zones, the differentiable merge reconciled to the Q16.16 provenance merge) against a dense control parameter-matched *at each rung*, on the v3 corpus under BPE-4096, verified to run genuinely on GPU rather than a silent CPU fallback. Across an $`\approx`$<!-- -->8$`\times`$ parameter range the partitioned model is strictly lower-loss at every rung, $`5/5`$ seeds, and the margin *grows* (Table <a href="#tab:h01ladder" data-reference-type="ref" data-reference="tab:h01ladder">2</a>).

<div id="tab:h01ladder">

| Parameters | NAT bits/byte | Dense bits/byte |       Gap | Holds |
|-----------:|--------------:|----------------:|----------:|:-----:|
|    248,235 |         2.086 |           2.110 |     0.024 |  5/5  |
|  1,005,603 |         1.890 |           1.996 |     0.106 |  5/5  |
|  1,992,978 |         1.845 |           1.986 | **0.141** |  5/5  |

H-01 at scale: a dense control parameter-matched to NAT at *each* rung (match $`\le0.02\%`$), per-position autoregressive LM on the 1.91M-token v3 corpus under BPE-4096, five seeds per rung, held-out bits/byte. The partitioned model is strictly lower-loss at every rung and the margin widens $`0.024 \to 0.141`$ bits/byte across an $`\approx`$<!-- -->8$`\times`$ parameter range. All rungs are $`\le`$<!-- -->2M parameters on $`\approx`$<!-- -->788K BPE tokens, near this corpus’s data ceiling; three points are a direction, not a scaling law.

</div>

#### The 32M rerun, and where widening stops being supported.

A subsequent rerun carried H-01 to a 32M-parameter model (five zones, $`d{=}704`$, BPE-16384, on GPU in bf16). Non-inferiority still *holds* (3/3 seeds), but the gap is *flat* at $`\approx`$<!-- -->0.18 bits/byte rather than continuing to widen, and the read is confounded: the larger run changed numeric precision from f32 to bf16, and a cross-backend probe shows the bf16 path is numerically fragile. We therefore scope the widening claim honestly: the margin widens across the parameter-matched ladder up to $`\approx`$<!-- -->2M parameters ($`5/5`$ seeds per rung), non-inferiority holds through 32M, and whether the margin continues to widen beyond 2M is *unresolved* pending a clean equal-precision rerun. The abstract’s “widens with scale” should be read as “widens across the tested $`\le`$<!-- -->2M range,” not as an unbounded scaling law; $`N{=}5`$ (or $`3`$ at 32M) with non-overlapping ranges is suggestive, not a formal significance test.

**This is the result the bet turned on.** The standing worry was that partitioning is a small-model trick a larger dense transformer would erase; across this range it does the opposite—the per-parameter edge widens from $`0.024`$ to $`0.141`$ bits/byte. At equal parameters, data, seed, and training budget, reaching lower loss means the same capability is attainable with fewer parameters and less compute: read as efficiency, the partitioned model *learns more per parameter and per unit of compute* than its dense twin, and increasingly so with scale. We measure capability per parameter, not wall-clock training time, and state the claim at that grain.

#### Caveats, in the same breath.

Every rung is $`\le`$<!-- -->2M parameters on $`\approx`$<!-- -->788K BPE tokens, and the 2M point sits near this corpus’s honest data ceiling (held-out loss is still falling, so it is not overfit-bound, but the next real lever is corpus *volume*, not more parameters); the planned next step grows data before parameters. Three rungs are a direction, not a scaling law, and a run orders of magnitude larger could flatten or reverse the trend—if it does, that is the result and we follow it. There is still *no parameter-matched mixture-of-experts baseline* and *no component ablation* (§<a href="#sec:disc" data-reference-type="ref" data-reference="sec:disc">8</a>) isolating which feature—router, pruning merge, partition, or SSM/attention heterogeneity—carries the effect; a consistent, widening, non-overlapping margin across three independently-matched rungs is strong evidence the effect is real, not yet proof of its cause. A synthetic pre-read (binned-token-sum, $`\approx`$<!-- -->3,882 params) held on the mean but on 3 of 5 seeds; we treat the real-data ladder as primary.

## H-02: a trained router differentiates and generalizes

The trained router drives measurably different zone mixes for different prompt classes and *generalizes rather than memorizes*: on a held-out split of the evaluation battery (math / narrative / code / sensory), it separates classes it never saw more sharply than the unlearned baseline, **3.10 versus 2.63** on the held-out separation metric. On the in-sample battery the gap is larger (11.70 vs. 4.25), which is the optimistic upper read; we treat the held-out 3.10/2.63 as the honest evidence. Full-scale labeled batteries across more classes are the conclusive read.

## An earlier single-output ladder (uncontrolled)

<div id="tab:ladder">

| Rung |  Params | Zones | Held-out bits/byte |
|:-----|--------:|------:|-------------------:|
| S    |  20,718 |     3 |              4.097 |
| M    |  56,534 |     3 |              4.054 |
| L    | 114,956 | **5** |          **3.953** |

An earlier, *uncontrolled* ladder varying NAT’s own size and zone count (no dense control); held-out bits/byte fall at each step. The L rung changes parameters *and* zone count (3$`\to`$<!-- -->5), so its improvement cannot be attributed to size alone. Superseded for the capability claim by the parameter-matched NAT-vs-dense ladder of Table <a href="#tab:h01ladder" data-reference-type="ref" data-reference="tab:h01ladder">2</a>.

</div>

Before the parameter-matched ladder above (Table <a href="#tab:h01ladder" data-reference-type="ref" data-reference="tab:h01ladder">2</a>), an earlier read varied NAT’s own size and zone count on the fixed corpus (Table <a href="#tab:ladder" data-reference-type="ref" data-reference="tab:ladder">3</a>); held-out bits/byte fall at each step. Two cautions keep it from carrying any capability argument: three points are a trend, not a law; and the L rung moves *two* variables at once (parameters and zone count $`3\to5`$), so its improvement cannot be attributed to size alone. It is suggestive evidence the architecture does not *degrade* with size at this range—no more. The load-bearing claim rests on the controlled NAT-vs-dense ladder of §<a href="#sec:results" data-reference-type="ref" data-reference="sec:results">6</a>; the per-position autoregressive objective first noted here (3.42 bits/byte at 53K byte-level parameters) is the same objective that ladder later adopts at BPE scale.

## Decision-faithfulness

Decision-faithfulness is a **design property, not an empirical result**: replaying the recorded scores reproduces the recorded survivors and weights because the same function produces and verifies the decision, so the check confirms the implementation matches the specification and cannot, by construction, disconfirm the property. Bit-faithfulness is empirical and mode-dependent: it holds at the deterministic L0 scale and only under a deterministic-inference mode at L1.

## Summary

The load-bearing hypothesis is supported and strengthening: partitioning is strictly lower-loss per parameter than an equal-parameter dense control on real data across five seeds, the margin survives a harder prose+code+textbook corpus, and—on a parameter-matched, subword-tokenized ladder—it *widens* with scale ($`0.024\to0.141`$ bits/byte across an $`\approx`$<!-- -->8$`\times`$ range, $`5/5`$ seeds per rung), every rung $`\le`$<!-- -->2M parameters with honest data-ceiling and no-significance-test caveats. Routing differentiation generalizes at small scale (held-out 3.10 vs. 2.63); the verifiability guarantee holds by construction with the stateful surfaces TLC-checked; and the federated gather is now scaffolded with signed, verify-before-compose semantics. What we have *not* shown—a parameter-matched MoE baseline and component ablations, a task-level metric, a standard corpus, the hold surviving orders-of-magnitude more scale and data, and an end-to-end multi-node federated cycle—is the subject of §<a href="#sec:disc" data-reference-type="ref" data-reference="sec:disc">8</a> and §<a href="#sec:concl" data-reference-type="ref" data-reference="sec:concl">9</a>.

# Federated training by paraconsistent consensus

The third face of the thesis is that declaring structure makes the model decentralizable. Much of this layer is *specified*, not *demonstrated*, and we mark the boundary throughout.

#### Composable zones.

Because a zone owns a slice of fixed width and a declared cross-zone contract, it is swappable when its slice width and contract match—so a federation can train and evolve a single zone without retraining the whole model. A node owns one or more zones, trains them, and submits its zone outputs; the async gather collects them under the deadline discipline used inside a single pass, and the deterministic Q16.16 merge reconciles independently-computed contributions such that every node and an on-chain verifier compute identically. This is now partly discharged rather than purely conditional: the determinism property (same gathered set $`\Rightarrow`$ same bits) is demonstrated locally and TLC-checked, and a `nat-federated` scaffold implements the gather with *signed, verify-before-compose* semantics—each submitted zone output carries a signature that is checked, and a malformed or unverified contribution is rejected before it can enter the merge, so the gather is no longer only a single-process simulation of the deadline. What remains future work is the live cycle on top of it: real nodes training real zones over the network and settling on-chain.

#### Paraconsistent aggregation.

Federated nodes have different data distributions, and averaging discards the signal that distinguishes a healthy decentralized network from a collapsed one. NAT adopts the mechanism specified in : aggregate per dimension in Belnap’s four-valued logic . Each dimension resolves to a state—*True*, *False*, *Both* (sources disagree: contradictory), or *Neither* (no source spoke: unknown)—and only T/F collapse to a mean over consenting sources; a *Both* dimension is routed to multiple zones for cross-validation rather than averaged, and a *Neither* dimension is left undefined rather than fabricated. The aggregation runs over Q16.16 embeddings, so it is bit-deterministic and on-chain-checkable. This operationalizes the Citrate thesis that consensus and learning are the same process at different time scales: the same checkpoint that finalizes blocks finalizes the Belnap-aggregated zone weights. *Status:* the aggregation logic and its on-chain commitment are specified and supported by deployed learning-cycle contracts ; the end-to-end federated training cycle is future work.

#### The incentive seam.

NAT does not implement settlement; it emits a signed contribution—metered compute, a data-quality score, a token count, and the provenance-trace hash—and a deterministic reward weight $`=
\mathrm{compute}\times\mathrm{data\text{-}quality}`$, computed on the Q16.16 path so two nodes and an on-chain verifier agree bit for bit. `citrate-compute-pool` converts that weight to payout. A node that contributes compute on garbage data earns weight zero, which is why the pipeline’s quality stage is load-bearing.

#### Decentralized intelligence meets decentralized science.

Decentralized-AI networks today incentivize opaque contributions scored by trusted validators; NAT’s provenance trace makes every training and inference step verifiable by construction, on a substrate the chain already runs. A contributor’s work is not a black box a validator must trust; it is a signed, replayable, provenance-traced artifact anyone can check—a model not served *to* a community but *trained by* one, whose every step answers to a public standard.

# Discussion

#### Why one move yields three properties.

Once the partition is declared and the merge is deterministic, the same fact—which named function contributed, with what weight—is simultaneously a verifiable record, an inductive bias that empirically does not hurt at equal parameters, and a unit of contribution a federation can sign and reconcile. We did not design three mechanisms; we declared one structure and read three properties off it.

#### Threats to validity.

**Scale.** Every quantitative result is at $`\le`$<!-- -->2M parameters on $`\le`$<!-- -->1.9M tokens (byte-level for the small ablations, BPE-4096 for the ladder); the widening margin is three points across an $`\approx`$<!-- -->8$`\times`$ parameter range sitting near this corpus’s data ceiling, a direction rather than a scaling law, and a run orders of magnitude larger—in parameters and especially in data—could flatten or reverse it. **Missing baselines and ablations**—the most important gap. H-01 compares NAT against exactly one control, an equal-parameter dense transformer; there is *no parameter-matched mixture-of-experts baseline*, the obvious comparison for a paper positioned against MoE, and *no component ablation* isolating which feature carries the effect (router vs. the pruning merge vs. the partition vs. SSM/attention heterogeneity). The $`\sim`$<!-- -->0.08–0.10 loss gap could be a regularization effect of the pruning merge or of using several narrower sub-blocks; our experiments cannot rule that out. **Non-standard corpus.** Results are on a bespoke corpus, not a standard one (enwik8/text8/WikiText), so the numbers are non-comparable to external results. **Statistics.** Five seeds, no within-arm variance, no significance test; 3/5 and 5/5 are not distinguishable at $`N{=}5`$. **Metric.** The capability proxy is inverse held-out loss, not a task-level metric. **Specified vs. demonstrated.** The federated/Belnap layer is specified; bit-faithfulness is mode-dependent. **The brain analogy is not yet earned.** We have not shown that the neuro-motivated zone assignment outperforms a *random* equal-width partition; until that ablation is run, the neuroscience framing is motivation, not evidence. **Single operator.** One machine, self-reported, no external replication; the reproducibility floor exists to make replication cheap.

#### Honest posture as method, and an agent-built model.

The discipline that produced this paper is itself a claim: every capability claim points at a measurement or is labeled a hypothesis, and the marginal synthetic H-01 read was reported as marginal, which is why the work went and got real data rather than declaring victory. The architecture was designed in a human–AI conversation; the reference implementation, the data pipeline, the training stack, and the ablation were built largely by AI agents under that discipline; and the paper was drafted by an agent and then attacked by an adversarial multi-agent red-team that found over- and under-claims and forced each line back to what the repository supports. A companion case study documents this. The point is not novelty but evidence: a verifiable architecture and a logged, reproducible method answer to the same standard—the same discipline that makes the model’s provenance trustworthy makes the research record trustworthy.

# Conclusion and future work

We presented the Neuroarchitectural Transformer, a transformer partitioned into declared, named zones over a fixed, auditable topology, merged on a deterministic fixed-point path, emitting a hashable provenance trace as a first-class output. The wager—that declaring structure dissolves much of the opacity problem and pays out in verifiability, capability per parameter, and decentralizability at once—is supported, at small scale, by what we measured: on a real public-domain corpus, partitioning was strictly lower-loss per parameter than an equal-parameter dense control across all five seeds, the margin survived a harder prose+code corpus, and on a parameter-matched, subword-tokenized ladder it *widened* with scale ($`0.024\to0.141`$ bits/byte across an $`\approx`$<!-- -->8$`\times`$ parameter range); a learned router generalized to held-out prompts; and decision-faithful provenance holds by construction with the stateful surfaces TLC-checked. These are small-scale results ($`\le`$<!-- -->2M parameters, near this corpus’s data ceiling) without a mixture-of-experts baseline or component ablation, stated with their caveats.

The most important next experiments are the ones that would turn the H-01 result from suggestive to causal: a parameter-matched mixture-of-experts baseline; component ablations (no-router, no-prune, single-core-type, and a *random* equal-width partition versus the named one, to earn the neuroscience framing); and results on a standard corpus with a per-seed table, variance, and a paired significance test, ideally with one independent replication. Scale is the next test after that; the federated proof turns §<a href="#sec:fed" data-reference-type="ref" data-reference="sec:fed">7</a> from specified to demonstrated; the GGUF flattened-dense export builds the ecosystem onramp the sidecar currently only specifies; and a task-level metric replaces the inverse-loss proxy. Each is a falsification opportunity as much as a milestone. If the broader claim holds—that a model can be a dynamic, legible, verifiable instrument rather than an undifferentiated blob of weights, with a verifiable record on every pass—then the contribution is not only an architecture but a stance: that interpretability, efficiency, and decentralization are not three problems but three views of one decision, *declare the structure*.

#### Reproducibility.

The reference implementation is a commit-pinned Rust workspace with config hashes, fixed seeds, exact rerun commands, and a containerized CI path; the eight TLA+ modules are TLC-green; the H-01 run and the corpus build are reproducible from single commands. Code and data-pipeline are available in the `nat` repository.
