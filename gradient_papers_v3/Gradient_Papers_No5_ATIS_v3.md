---
title: "ATIS: Analog Token Importance Scoring for Energy-Efficient Transformer Attention Pruning (v3)"
version: v3
created: 2026-04-28T03:50:00Z
branch: main
author: Larry Klosowski + Claude Opus 4.7
status: active
maturity: Theoretical — hardware research, no prototypes built
supersedes: v2
---

# Paper V — ATIS (v3)

## Abstract

Token-level pruning of transformer attention is a well-studied
software optimization, typically yielding 2–4× speedups by
discarding tokens whose contribution to the next layer is below
a learned threshold. **ATIS** (Analog Token Importance Scoring)
proposes computing the importance score itself in **analog
hardware** — specifically a Field-Programmable Analog Array
(FPAA) operating before the digital Q/K projection — to push
the energy floor below what digital compute can achieve.

This paper is **theoretical**. There is no FPAA prototype, no
SPICE simulation campaign, no measured energy numbers from
silicon. v3 is honest: the value of this paper is the *framing*
— "analog filter before digital attention" — and the *honest
DAC bottleneck analysis* that explains why naïve analog
pre-filtering doesn't pay off until the DAC overhead is solved.

The paper is included in the Gradient series because Citrate's
node hardware roadmap eventually intersects with hardware
research: a node that hosts large models will benefit from
energy-efficient inference, and the Citrate token economics
make the energy savings directly payable to the node operator.

## 1. The problem

Transformer attention is **O(n²)** in sequence length. For long
contexts (8K+ tokens), the attention matrix dominates memory
bandwidth and energy:

| Stage | Energy (per token, fp16, A100) |
|-------|--------------------------------|
| Embedding lookup | ~0.5 nJ |
| Q/K/V projection | ~5 nJ |
| QKᵀ matmul | ~30 nJ |
| Softmax | ~3 nJ |
| Attn × V | ~30 nJ |
| FFN | ~80 nJ |
| **Total per token** | **~150 nJ** |

For an 8K-token forward pass: ~1.2 mJ. At inference rates of
1000 req/s with average 8K tokens: **1.2 W** just on
attention's quadratic growth. This is a per-rack-server scale
bottleneck for inference workloads.

## 2. The proposal

Place an **analog filter stage** between embedding and digital
attention:

```
[token embeddings, fp16]
        ↓
   DAC (digital → analog)
        ↓
[analog signals]
        ↓
[FPAA: approximate dot products against learned query prototype]
        ↓
[analog importance scores]
        ↓
[comparator: score > threshold ?]
        ↓
[binary mask] ← discarded tokens are zero-masked
        ↓
[digital pipeline runs only on surviving tokens]
```

If the FPAA can decide which tokens matter at <1 nJ per token,
and the typical workload sees 60–80% of tokens being non-essential
(consistent with the literature on token pruning in transformer
attention), the energy savings are large in principle.

## 3. The DAC bottleneck — honest analysis

The naïve proposal **does not work** because the energy budget
is dominated by the DAC, not the analog compute:

| Component | Energy (per token, naive design) |
|-----------|----------------------------------|
| FPAA OTA-based dot product | ~0.5 nJ |
| 12-bit DAC × 768 dimensions | ~384 nJ |
| Comparator | ~0.01 nJ |
| **Total** | **~385 nJ** |

The DAC is **2.5× more expensive than the entire digital
attention** stage we were trying to bypass. v2 of this paper
was honest about this; v3 sharpens the conclusion: **ATIS does
not pay off without DAC-free architectures**.

### 3.1 Three DAC-free paths

**Path A — Charge-domain compute in DRAM.** Recent work on
in-memory analog compute embeds the analog stage in the DRAM
sense amplifiers, eliminating the DAC entirely (data is already
analog at the bit-line level). This is hardware-research
territory; commercial parts are 5+ years out.

**Path B — Mixed-signal embedding stores.** Store embeddings in
analog at training time, never digitize. The output of the
analog filter feeds back into a digital attention stage that
re-digitizes only the surviving tokens. Requires custom analog
embedding banks; theoretically viable, prototype-cost
prohibitive.

**Path C — Photonic dot-product.** Optical processors compute
many parallel dot products at room-temperature femtojoule scales,
with the input "DAC" being a programmable laser modulator
(orders of magnitude cheaper than electronic DACs). Several
photonic-AI startups (Lightmatter, Lightelligence) are
shipping prototypes; commercial integration with off-the-shelf
inference servers is on the 2027–2030 horizon.

## 4. System-level value (regardless of hardware)

Even at digital-only inference, the ATIS *framing* — "filter
tokens before the expensive operation" — has value:

- A **digital approximation** of the FPAA filter (a tiny MLP that
  predicts importance) can run in <1 nJ if it's small enough.
- The downstream attention matrix shrinks **quadratically** with
  the surviving token count. 70% pruning compounds to **11×
  smaller attention matrix** and 12+× compounding savings across
  multi-layer transformers.

So even if the analog hardware never materializes, the
**software ATIS** (importance-MLP filter before digital
attention) is a Citrate-adjacent optimization a node operator
might run. We track this in the Citrate `.agentile/sprints/backlog/`
under "model-server optimization."

## 5. Connection to Citrate

The paper is in the Gradient series because:

1. **Citrate pays for inference in SALT.** Energy savings flow
   directly to operator profit, providing the economic incentive
   for hardware R&D.
2. **The Citrate inference router is hardware-agnostic.** A
   model can be served by a node running on any backend (CPU,
   GPU, future ATIS hardware) — the protocol doesn't care, only
   the (input, output, attestation) tuple does.
3. **TEE attestation** (CM-08, Paper IX) extends naturally to
   custom hardware. An FPAA-equipped node can attest to its
   filter parameters; the chain verifies against the signed
   firmware hash.

## 6. Implementation reality check

| Component | Status |
|-----------|--------|
| FPAA prototype | None |
| SPICE simulation | Not started |
| Software importance-MLP | Specified — researchers' choice |
| TEE attestation extension for custom HW | Specified — pending CM-08 ship |

Nothing in this paper is "implemented." It's a roadmap for
researchers who want to ride the Citrate economic system as the
substrate for an analog-AI hardware play.

## 7. Bibliography

- Wang, M. et al. (2021). *SpAtten: Efficient Sparse Attention
  Architecture with Cascade Token and Head Pruning*. HPCA.
- Anandkumar, A. et al. (2023). *Analog In-Memory Computing for
  Deep Learning*. Nature Electronics.
- Hamerly, R. et al. (2019). *Large-Scale Optical Neural
  Networks Based on Photoelectric Multiplication*. Phys. Rev. X.
- Anadigm AN23x FPAA datasheet (commercial FPAA family).
- Citrate Paper I — node operator economic model.
