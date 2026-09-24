---
title: "ATIS: Analog Token Importance Scoring for Energy-Efficient Transformer Attention Pruning"
subtitle: "FPAA-Based Reconfigurable Analog Middleware for Pre-Attention Token Filtering"
series: "The Gradient Papers — No. V"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Theoretical
supersedes: "v2 (February 2026), v3-April draft"
---

# ATIS: Analog Token Importance Scoring for Energy-Efficient Transformer Attention Pruning
### FPAA-Based Reconfigurable Analog Middleware for Pre-Attention Token Filtering

**The Gradient Papers — No. V**
Larry Klosowski, Lauren Mendenhall · Citrate Inc.
Preprint — not yet peer reviewed.

> **Maturity: [Theoretical].** ATIS is a hardware research proposal at Phase 1 of its
> roadmap. No prototype has been built. Nothing in the Citrate codebase implements analog
> token scoring; the connection to Citrate node economics is a motivated conjecture, stated
> conditionally throughout. This paper is the *hardware research layer* of the series, and it
> is deliberately the series' most speculative entry.

## Abstract

Transformer models are foundational to modern AI, yet their quadratic attention complexity
creates severe energy and latency bottlenecks, particularly for edge deployment. Current token
pruning approaches rely on digital computation to score token importance *after* computing
expensive matrix multiplications, missing the opportunity for early-stage filtering. We propose
**ATIS (Analog Token Importance Scoring)**, an analog middleware architecture based on
Field-Programmable Analog Arrays (FPAAs) that performs ultra-low-power importance scoring
*before* digital attention computation begins. By leveraging operational transconductance
amplifiers (OTAs) for approximate dot-product computation and analog comparators for
threshold-based pruning, ATIS targets elimination of 60–80% of tokens from subsequent digital
processing while consuming microwatt-scale power in the analog core. ATIS is distinguished from
prior analog-digital hybrid attention accelerators, which employ fixed-function ASIC designs
with in-memory computing, by its use of reconfigurable FPAA hardware that enables rapid
prototyping, model-agnostic deployment, and indefinite reprogramming without device wear-out.
We present the theoretical framework, the proposed circuit architecture, an honest assessment
of the DAC/ADC interface bottleneck that constrains all analog neural accelerators, and a phased
research roadmap toward proof-of-concept implementation. We situate ATIS against the 2024–2026
analog-attention literature, which has advanced substantially since this proposal was first
drafted, and we are explicit about what remains unbuilt.

**Keywords:** Field-Programmable Analog Arrays, transformer attention, token pruning, analog
computing, edge AI, reconfigurable hardware, energy-efficient inference, hybrid analog-digital
architecture

## 1. Introduction

The transformer architecture has achieved state-of-the-art performance across natural language
processing, computer vision, and multimodal tasks. However, the self-attention mechanism presents
a fundamental computational challenge: its O(n²) complexity in sequence length creates severe
bottlenecks in both energy and latency, worsening as context windows grow.

Recent research shows that attention patterns in trained transformers are highly sparse: the
majority of tokens contribute minimally to any given output. Studies on vision transformers show
up to 66% of input tokens can be pruned with under 0.5% accuracy degradation [3]. In language
models, learned token pruning filters 70–80% of tokens per layer while maintaining task
performance [2]. The zero-shot framework Zero-TPrune further demonstrates that importance scoring
can leverage existing attention-graph structure without additional training overhead [14].

The critical insight motivating this work is that current pruning approaches operate *after* the
expensive attention computation has begun. Digital importance scoring requires fetching token
embeddings, computing partial products, and making threshold comparisons, all before any
computational savings are realized. This is a paradox: the very computation required to decide
what can be skipped often negates the benefit of skipping.

We propose a different approach: **analog pre-filtering of token importance before digital
attention computation begins**. By exploiting the inherent properties of analog circuits,
continuous-time operation, parallel computation via physical laws, and extremely low power in the
microwatt-to-nanowatt range, we can build a lightweight importance-scoring middleware that sits
between the token-embedding stage and the digital attention accelerator.

Field-Programmable Analog Arrays (FPAAs) provide an ideal platform. Unlike fixed-function analog
circuits, FPAAs offer reconfigurability comparable to their digital counterparts (FPGAs) while
retaining analog's advantages for certain operations. Modern FPAAs incorporate operational
transconductance amplifiers (OTAs), programmable comparators, and configurable routing, precisely
the building blocks needed for approximate vector-matrix multiplication and threshold-based
decision making. FPAAs based on floating-gate transistors can implement vector-matrix
multiplication within the routing fabric itself, achieving high density and energy efficiency
[4, 5, 8].

**Differentiation from prior work.** Moradifirouzabadi et al. [6] demonstrated a hybrid
analog-digital attention accelerator fabricated in 65nm CMOS that uses charge-based SRAM
compute-in-memory (CIM) to prune roughly 75% of low-score tokens. While ATIS shares the
high-level philosophy of analog pre-filtering followed by digital precision computation, our
approach differs in three respects: (1) ATIS operates on token embeddings *before* any QKᵀ
computation, whereas CIM approaches compute approximate scores from queries and keys already
projected; (2) ATIS uses reconfigurable FPAA hardware that can be reprogrammed for different
models without fabricating new silicon; and (3) ATIS targets a platform-agnostic middleware role
between any embedding pipeline and any digital accelerator, rather than being an integrated
processor. As Section 2.6 discusses, the 2024–2026 literature has produced several systems that
narrow this gap, and we treat them as the true state of the art to distinguish against.

## 2. Background and Related Work

### 2.1 Transformer Attention Mechanism

Scaled dot-product attention computes Attention(Q, K, V) = softmax(QKᵀ / √d_k)V, where Q, K, V
are linear projections of the input. For sequence length n and embedding dimension d, the QKᵀ
computation alone requires O(n²d) multiply-accumulate operations; in multi-head attention with h
heads this becomes O(hn²d) per layer. ATIS is primarily applicable to encoder-style attention and
the prefill phase of decoder models, where full input sequences are processed simultaneously.

### 2.2 Token Pruning Approaches

Token pruning methods fall into several categories. Static pruning removes tokens by position or
fixed criteria; dynamic pruning adapts to content. Learned Token Pruning (LTP) trains per-layer
thresholds [2]. DynamicViT inserts lightweight prediction modules between blocks [3]. A2SF [16]
extended token pruning to decoder LLMs with fairness corrections for tokens of different ages. A
key observation is that token importance can often be approximated from early-layer features: the
cumulative attention a token receives is a reliable importance signal. Zero-TPrune [14] showed a
Weighted PageRank over the attention graph identifies unimportant tokens zero-shot. This supports
our analog approach: we do not need perfect importance scores, only approximate rankings
sufficient to identify clearly unimportant tokens.

### 2.3 Analog Computing for Neural Networks

Analog in-memory computing is a promising route to energy-efficient neural acceleration.
Memristor crossbars perform vector-matrix multiplication in O(1) time via Ohm's law and
Kirchhoff's current law. Recent demonstrations report large energy and latency improvements over
GPUs for attention using gain-cell analog memory [13]. However, memristor approaches face a
specific obstacle for attention: the key and query matrices change dynamically during inference,
requiring constant reprogramming that exceeds device endurance limits (10⁴–10⁸ write cycles).

### 2.4 The DAC/ADC Interface Bottleneck

A critical and often underappreciated constraint on all analog neural accelerators is the energy
and latency overhead of analog-to-digital and digital-to-analog conversion. DAC/ADC peripheral
circuits can account for up to 85% of total power in mixed-signal neural hardware [19]. The Burr
et al. review [9] confirms peripheral circuits typically dominate energy, area, and latency in
analog neuromorphic accelerators. ATIS's use of binary comparator outputs rather than
high-resolution ADC readout sidesteps the ADC bottleneck on the output side, but the DAC overhead
for converting digital embeddings to analog voltages remains a real cost that any honest energy
analysis must account for (Section 4.2).

### 2.5 Field-Programmable Analog Arrays

FPAAs consist of Configurable Analog Blocks (CABs) connected through a programmable routing
network. Each CAB typically contains OTAs, capacitors, comparators, and sometimes dedicated
multiplier blocks. The RASP (Reconfigurable Analog Signal Processor) family from Georgia Tech
includes 4×4 vector-matrix multiplier modules within their CABs [5, 8]. A key innovation in modern
FPAAs is the use of floating-gate transistors for both routing switches and weight storage. As
Hasler describes [4], the floating-gate-enabled routing crossbar provides excellent switches while
enabling vector-matrix multiplication in the routing fabric through analog programming. SoC FPAA
devices have demonstrated end-to-end machine-learning applications from microphone to classified
result at power levels below 23 µW [23], suggesting next-generation FPAAs designed for ML could
handle workloads at dramatically lower energy than digital alternatives.

### 2.6 Differentiation from Prior Analog-Digital Hybrid Accelerators (updated 2026)

**Table 1. ATIS vs. related analog-digital hybrid accelerators.**

| System | Hardware | Stage of operation | Reconfigurable? | Write endurance |
|--------|----------|--------------------|-----------------|-----------------|
| Moradifirouzabadi 2024 [6] | 65nm CMOS ASIC, SRAM CIM | After Q/K projection | No (ASIC) | Unlimited (SRAM) |
| HARDSEA 2024 [17] | ReRAM + SRAM hybrid | Product-quantized token relevance | No (NVM weights) | Limited (10⁴–10⁸) |
| Sebastian 2025 [13] | Gain-cell analog memory | Full attention acceleration | Partial | Good (gain-cell) |
| Wang 2024 [11] | Memristor crossbar | Full attention (PSPICE sim) | No | Limited (10⁴–10⁸) |
| **ATIS (ours)** | **FPAA (floating-gate)** | **Before Q/K projection** | **Yes (indefinite)** | **Unlimited (floating-gate)** |

Since this proposal was first drafted (February 2026), the analog-attention field has advanced and
the honest comparison must be refreshed. Three developments are load-bearing:

- **Sebastian et al. (2025), *Nature Computational Science*** [13] moved from preprint to a
  published gain-cell in-memory attention mechanism reporting up to ~70,000× energy and ~100×
  latency improvement versus GPU. This is now the strongest published analog-attention result and
  the benchmark ATIS's energy story must be honest against. It accelerates *full* attention rather
  than pre-filtering, so it is complementary to, not competitive with, ATIS's pre-attention role.
- **Moradifirouzabadi et al. (2024), arXiv:2409.04940** [6] prunes ~75% of low-score tokens in
  analog CIM with a digital path for survivors, a thesis close enough to ATIS's that ATIS must be
  distinguished on the three axes above (pre- vs post-projection, reconfigurability, middleware
  role), not merely cited.
- **Early-termination and microscaling attention accelerators** (BitStopper, 2025 [26];
  MXFormer, 2026 [27]) attack the same energy target from the digital and mixed-signal sides,
  narrowing the headroom an analog pre-filter must justify.

The upshot: ATIS's differentiator is no longer "analog attention exists"; it is specifically
**reconfigurable, pre-projection, model-agnostic pre-filtering with no write-endurance ceiling**.
The rest of the paper defends that narrower claim.

## 3. ATIS Architecture

### 3.1 System Overview

ATIS operates as a middleware layer between token embedding and attention computation. The core
insight is that we do not need exact attention scores to identify unimportant tokens; we only need
to identify tokens clearly below an importance threshold. This relaxed accuracy requirement
enables analog implementation with significant energy savings, provided the DAC interface overhead
is managed.

System flow: (1) token embeddings are converted from digital to analog voltages via DACs; (2) the
FPAA computes approximate importance scores using OTA-based inner products against a learned query
prototype; (3) analog comparators generate binary keep/prune decisions; (4) only tokens above the
threshold are forwarded to the digital attention accelerator; (5) the digital system computes
precise attention only for the surviving subset. The output of the analog pipeline is a binary
mask, not a high-resolution signal, so the output path needs only comparators, not
energy-expensive ADCs.

### 3.2 Importance Score Computation

We define an approximate importance score for token i as Sᵢ ≈ Σⱼ (qⱼ · kᵢⱼ), where q is a learned
or averaged query vector and kᵢ is the key projection of token i. This has three advantages for
analog implementation. First, it requires only vector-vector products, not full matrix
multiplication; each token's importance is computed independently and in parallel. Second, the
accumulation maps naturally to Kirchhoff's current law: currents from multiple OTA outputs sum at
a common node without explicit adders. Third, the result is a scalar voltage that can be compared
directly against a threshold, bypassing the need for a high-resolution ADC.

The query vector q can be (a) a learned static prototype for "important" tokens, trained jointly
with the transformer; (b) an exponential moving average of recent queries via a simple analog RC
filter; or (c) extracted from early attention layers and held constant for subsequent layers.
Zero-TPrune [14] showed attention-graph-based importance from pre-trained models provides reliable
pruning guidance without fine-tuning, supporting the viability of a fixed prototype.

### 3.3 OTA-Based Inner Product Circuit

The OTA produces an output current proportional to the product of its transconductance g_m and the
differential input voltage: I_out = g_m × (V+ − V−). By modulating g_m with one operand and the
input voltage with another, we achieve analog multiplication [15]. For inner-product computation,
an array of N OTAs (N = compressed embedding dimension) has each OTA's transconductance programmed
to one element of q, while differential inputs receive the corresponding key element kᵢ. Output
currents sum at a common node, implementing the dot product. Subthreshold OTA designs consume as
little as 20–75 nW per amplifier [24, 25].

Programmable transconductance is achieved through floating-gate biasing. Values are programmed with
8–10 bit precision and retained indefinitely without refresh. For the static-prototype approach,
programming occurs once at deployment, avoiding the write-endurance concerns that plague memristor
and phase-change approaches.

### 3.4 Threshold Comparison and Adaptive Control

The summed current from the OTA array is converted to a voltage via a transimpedance amplifier,
then fed to a programmable comparator. The comparator reference voltage sets the importance
threshold θ. Hysteresis (5–10% of threshold) prevents oscillation near the boundary. The
comparator output is a digital signal that directly gates token forwarding, building a binary mask
of which tokens participate in subsequent digital attention.

A fixed threshold may be suboptimal across inputs and layers. We propose an adaptive mechanism: a
low-pass-filtered version of the comparator output generates an "average activity" signal that
modulates the threshold voltage through analog feedback. If pruning is too aggressive, the
threshold decreases; if too permissive, it increases, keeping useful sparsity as input
distributions shift.

## 4. Precision and Energy Analysis

### 4.1 Precision Requirements

Low precision (4–6 effective bits) is sufficient for pre-filtering. The goal is not exact scores
but identifying clearly unimportant tokens; errors in the gray zone near the threshold have
minimal impact because the digital system computes precisely on retained tokens. Quantized
attention studies show 4-bit scores maintain accuracy within ~1% of floating-point for most tasks.
Analog noise, device mismatch, and limited transconductance linearity together limit effective
precision to roughly 6 bits, which is adequate here.

### 4.2 Energy Consumption: An Honest Accounting

This analysis is essential because it reveals a genuine limitation. Consider 512-dimensional
embeddings compressed to 64 dimensions. With 64 OTAs at 100 nA bias and 1V supply, static power is
~6.4 µW; dynamic power adds ~1 µW. The analog core totals under 10 µW per token stream.

However, the DAC interface overhead must be included honestly. Converting 64 compressed dimensions
at 6-bit precision requires 64 DACs. At ~1 pJ/conversion/bit, this adds 64 × 6 × 1 pJ = 384 pJ per
token. At a 1 MHz token rate, DAC power is ~384 mW, dramatically exceeding the analog-core power.
This is consistent with the broader finding that DAC/ADC peripherals dominate total power [9, 19].

Mitigation strategies: (a) time-multiplexing fewer DACs across dimensions, trading latency for
power; (b) low-resolution (3–4 bit) DACs with accuracy-aware training; (c) switched-capacitor DAC
architectures integrated in the FPAA fabric; (d) pairing ATIS with analog sensor front-ends where
signals are already analog (e.g., vision transformers on camera outputs). The optimal strategy
depends on deployment and remains an active research question. The 2024 result on ADC/DAC-free
analog acceleration via frequency transformation [21] is the most promising direction for removing
this bottleneck outright.

Corrected system-level comparison: a digital dot product of 64 compressed dimensions requires 64
MACs at ~1 pJ/MAC = 64 pJ per token. Including DAC overhead, ATIS totals ~391 pJ (DAC-dominated)
versus 64 pJ digital. The analog core provides orders-of-magnitude savings, but the DAC bottleneck
erases this at the system level unless mitigated. DAC-free or DAC-reduced architectures are the
single most important engineering challenge for ATIS.

### 4.3 System-Level Impact

Despite the DAC overhead, ATIS's greatest value is downstream. If analog pre-filtering removes 70%
of tokens, digital attention shrinks by 70% in the QKᵀ product and proportionally in subsequent
operations. For 1024 tokens with 70% pruning, the attention matrix shrinks from ~1M to ~90K
elements, an ~11× reduction, compounding across layers. Even if ATIS's per-token cost is comparable
to digital scoring, downstream savings from reduced digital computation can justify the analog
pre-filter stage.

## 5. Challenges and Open Questions

### 5.1 Dimensionality Reduction

Modern transformers use embedding dimensions of 768–4096, far exceeding practical analog array
sizes. Dimensionality reduction is essential: (a) random projection preserving relative distances
via Johnson-Lindenstrauss (768→64 dimensions within a (1±ε) factor); (b) learned projection
matrices trained for importance preservation; (c) selecting highest-variance dimensions. The
projection is done digitally before DAC conversion, reducing both DAC count and analog array size.

### 5.2 Multi-Head Attention

Attention uses multiple heads (typically 12–96). Three approaches: (a) a single consensus score
averaged across heads, supported by findings that many heads are redundant; (b) replicated scoring
circuits for head groups; (c) time-multiplexed FPAA reprogramming to cycle through head-group
prototypes. The consensus approach is most practical for initial prototyping.

### 5.3 Calibration and Drift

Subthreshold OTAs are temperature-sensitive: a 10°C change can shift transconductance by 30–40%.
Calibration strategies include periodic auto-calibration, differential architectures for
common-mode cancellation, temperature-compensated current references, and on-chip temperature
sensors with digital lookup. These are well understood in the analog-IC community but require
careful engineering for production.

### 5.4 Applicability Across Architectures

ATIS is most directly applicable to encoder-style transformers (BERT, ViTs) and the prefill phase
of decoder models. For autoregressive generation, ATIS could serve as a KV-cache compressor,
analogous to Heavy-Hitter Oracle (H2O). Vision transformers are especially attractive: image
patches are tokenized at the sensor interface where analog signals are naturally available,
potentially eliminating DAC overhead entirely.

## 6. Implementation Roadmap

### 6.1 Phase 1: Simulation and Algorithm Validation

SPICE-level simulation of FPAA components: model OTA-based inner-product circuits with realistic
noise, mismatch, and nonlinearity; simulate the full scoring-and-thresholding pipeline including
DAC models; validate against software baselines using real transformer attention patterns from
DeiT-S and BERT-base; and characterize the precision-sparsity-accuracy tradeoff. A critical
deliverable is an honest energy model that includes DAC overhead and identifies deployment
scenarios where ATIS provides net savings. **This is the current phase; no hardware exists.**

### 6.2 Phase 2: FPAA Prototype

Proof-of-concept on commercial FPAAs (Anadigm AN231E04) or research-grade SoC FPAAs from Georgia
Tech's RASP family with native VMM blocks. A 16–64 dimensional prototype at reduced token rates is
the realistic initial target, integrated with a digital FPGA implementing a small transformer for
end-to-end measurements of scoring accuracy, latency, energy, and task-accuracy impact.

### 6.3 Phase 3: Custom ASIC Development

Target specifications: 256–1024 dimension support, sub-microsecond per-token latency, under 100 µW
analog-core power (DAC overhead architecture-dependent), and compatibility with standard digital
transformer accelerators.

## 7. Relationship to the Gradient Papers Series

ATIS occupies a unique position: it is the hardware research layer. While Papers I–IV describe
software-level protocol architecture, organizational design, and engineering methodology, Paper V
asks whether the computational bottleneck in transformer inference, the operation Citrate nodes
perform continuously, can be addressed at the silicon level.

Paper I (Citrate: Protocol Specification) specifies that each node hosts transformer models and
performs inference as part of consensus participation. Unlike the February 2026 draft, this is no
longer aspirational: the Citrate node executes real inference precompiles (`0x0100`–`0x0106`) and
deterministic Q16.16 compute (`0x010A`–`0x010F`), and its parallel executor is benchmarked at a
proven ≥2× 8-worker speedup. ATIS could reduce the per-inference energy cost of node operation by
pre-filtering tokens before attention, improving node economics. That remains conditional on ATIS
being built.

Paper II (Paraconsistent Consensus) commits d-dimensional embeddings at checkpoints, each
requiring a transformer forward pass; the Belnap aggregation precompile (`0x0110`) that consumes
those embeddings is now implemented. If ATIS reduces attention cost by ~70% per forward pass, the
per-checkpoint embedding overhead becomes more sustainable for resource-constrained nodes.

Paper IX (The Medusa Paradigm) emphasizes biological signal processing as a design principle.
Jellyfish nerve nets operate in the analog domain: electrochemical propagation, graded potentials,
threshold firing. ATIS is the most literal realization of this principle, analog signal processing
for threshold-based filtering before expensive digital computation. The nerve net pre-filters
through analog biophysics and only propagates signals exceeding a threshold; ATIS does the same for
transformer tokens.

**Current status and its relationship to NAT (Paper XI).** ATIS is at the theoretical framework
stage (Phase 1). No prototypes have been built. Importantly, the Neuroarchitectural Transformer
(Paper XI), which *is* implemented, does **not** implement ATIS: NAT's zone-contribution pruning in
its deterministic merge operates on whole zone outputs, not on tokens, and contains no analog or
FPAA component. The one design-level affinity worth noting is that NAT's deterministic
score-then-prune-then-reweight merge is the same shape of computation ATIS performs in the analog
domain, so a future ATIS could reuse that decision structure. That is an affinity, not an
implementation. The connection between ATIS and the Citrate Network remains conditional: if ATIS
proves viable through the research roadmap, it could serve as a hardware optimization layer for
Citrate validator nodes, but this depends on outcomes not yet demonstrated.

## 8. Conclusion

ATIS proposes to leverage reconfigurable analog computing for token importance scoring. By
performing approximate importance estimation in the analog domain before digital attention, ATIS
targets elimination of the majority of tokens from expensive digital processing while consuming
microwatt-scale power in the analog core. The key insight is that reconfigurable analog systems,
specifically FPAAs, provide a middleware role distinct from the fixed-function ASIC approaches
pursued by other analog-digital hybrid accelerators.

We have given an honest assessment of the challenges, most critically the DAC interface bottleneck.
The analog core's energy advantage is substantial, but system-level benefit depends on effective
DAC-overhead mitigation, an active area across the analog-computing community. Vision-transformer
applications, where analog sensor signals can potentially bypass DAC conversion, are the most
immediately promising scenario. Against the 2024–2026 state of the art, ATIS's defensible claim has
narrowed to reconfigurable, pre-projection, model-agnostic pre-filtering without a write-endurance
ceiling. Whether that claim survives contact with silicon is the question the roadmap exists to
answer.

## Acknowledgments

Drafting and literature triage were assisted by AI systems; all technical claims were verified by
the authors against the cited published literature, and all limitations are transparently
disclosed. This work received no external funding.

## References

[1] Vaswani, A., et al. (2017). Attention is all you need. *NeurIPS 30.*
[2] Kim, S., et al. (2022). Learned Token Pruning for Transformers. *Proc. ACM SIGKDD*, 784–794.
[3] Rao, Y., et al. (2021). DynamicViT: Efficient Vision Transformers with Dynamic Token Sparsification. *NeurIPS 34.*
[4] Hasler, J. (2020). Large-Scale Field-Programmable Analog Arrays. *Proc. IEEE*, 108(8), 1283–1302.
[5] Schlottmann, C. R., & Hasler, P. E. (2011). A Highly Dense, Low Power, Programmable Analog Vector-Matrix Multiplier. *IEEE J. ETCAS*, 1(3).
[6] Moradifirouzabadi, A., et al. (2024). An Analog and Digital Hybrid Attention Accelerator for Transformers with Charge-based In-Memory Computing. *Proc. IEEE A-SSCC*; arXiv:2409.04940.
[7] Le Gallo, M., et al. (2023). A 64-core mixed-signal in-memory compute chip based on phase-change memory. *Nature Electronics*, 6, 680–693.
[8] Hall, T. S., et al. (2005). Developing large-scale field-programmable analog arrays. *Int. J. Embedded Systems*, 1, 179–192.
[9] Burr, G. W., et al. (2020). Analog architectures for neural network acceleration based on non-volatile memory. *Applied Physics Reviews*, 7, 031301.
[10] Ambrogio, S., et al. (2023). An analog-AI chip for energy-efficient speech recognition. *Nature*, 620, 768–775.
[11] Wang, H., et al. (2024). Efficient memristor accelerator for transformer self-attention. *Scientific Reports*, 14, 24112.
[12] Zhou, H., et al. (2022). Photonic matrix multiplication lights up photonic accelerator and beyond. *Light: Sci. & Appl.*, 11, 30.
[13] Leroux, N., Manea, P.-P., et al. (2025). Analog in-memory computing attention mechanism for fast and energy-efficient large language models. *Nature Computational Science.* (Formerly cited as a preprint; now published.)
[14] Wang, H., et al. (2024). Zero-TPrune: Zero-Shot Token Pruning through Leveraging of the Attention Graph. *Proc. IEEE/CVF CVPR.*
[15] Texas Instruments. (2018). Demystifying the Operational Transconductance Amplifier. *Application Report SBOA117A.*
[16] Jo, H., & Kim, J. (2024). A2SF: Accumulative Attention Scoring with Forgetting Factor for Token Pruning. arXiv:2407.20485.
[17] Xu, Z., et al. (2024). HARDSEA: Hybrid Analog-ReRAM and Digital-SRAM Accelerator for Dynamic Sparse Self-Attention. *IEEE Trans. VLSI Systems*, 32(3).
[18] Bal, S., et al. (2024). Xpikeformer: Hybrid Analog-Digital Hardware Acceleration for Spiking Transformers. arXiv:2408.08794.
[19] Wang, Y., et al. (2025). An overhead-reduced, efficient, fully analog neural-network computing hardware. *Science Advances*, 11, eadv7555.
[20] Kim, Y., et al. (2022). Extreme Partial-Sum Quantization for Analog CIM Accelerators. *ACM J. ETCS*, 18(4).
[21] Navardi, M., et al. (2024). ADC/DAC-Free Analog Acceleration with Frequency Transformation. *IEEE Trans. VLSI Systems.*
[22] Bai, Z., et al. (2025). HyAtten: Hybrid Photonic-digital Accelerator for Attention Mechanism. arXiv:2501.11286.
[23] Hasler, J. (2022). The Potential of SoC FPAAs for Emerging Ultra-Low-Power Machine Learning. *J. Low Power Electron. Appl.*, 12(2), 33.
[24] Magnelli, L., et al. (2014). Design of a 75-nW, 0.5-V subthreshold CMOS operational amplifier. *Int. J. Circuit Theory and Applications*, 42, 967–977.
[25] Akbari, M., et al. (2017). A 63-dB gain OTA operating in subthreshold with 20-nW power consumption. *Int. J. Circuit Theory and Applications*, 45, 843–858.
[26] Authors TBD. (2025). BitStopper: An Efficient Transformer Attention Accelerator via Stage-Fusion and Early Termination. arXiv:2512.06457. *(Verify author list before final submission.)*
[27] Authors TBD. (2026). MXFormer: A Microscaling Floating-Point Charge-Trap-Transistor Compute-in-Memory Transformer Accelerator. arXiv:2602.12480. *(Verify author list before final submission.)*

## Appendix A: Cross-Paper Parameter Consistency

**Table A1. Citrate Network parameters referenced in this paper (reconciled against code, Aug 2026).**

| Parameter | Value | Source |
|-----------|-------|--------|
| Block time | ~2 s target | Paper I; `core/sequencer/src/block_builder.rs:76` |
| Embedding dimension (d) | 768 (default), configurable | Paper II; Belnap precompile `MAX_DIM=1024` |
| Checkpoint quorum | 67 / 100 (2/3+1) | Paper I; `core/consensus/src/checkpoint.rs:88` |
| Belnap aggregation precompile | `0x0110` | Paper II; `core/execution/src/precompiles/q16/belnap.rs:77` |
| Node inference precompiles | `0x0100`–`0x0106` | Paper I; `core/execution/src/precompiles/mod.rs` |
| Deterministic Q16 compute | `0x010A`–`0x010F` | Paper I / X; `precompiles/compute.rs` |
| Target pruning rate (ATIS) | 60–80% of tokens | This paper, Section 3.1 |
| Analog core power (ATIS) | <10 µW per token stream | This paper, Section 4.2 |
| DAC overhead (uncorrected) | ~384 mW at 1 MHz (64-dim) | This paper, Section 4.2 |
| Effective analog precision | 4–6 bits | This paper, Section 4.1 |

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
