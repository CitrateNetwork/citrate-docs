---
title: The Substrate of Verifiable Inference
codex_slug: /research/verifiable-inference
tier: academic
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/Gradient_Papers_No10_Substrate_of_Verifiable_Inference_v3.md
surfaces: [RES-verifiable]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The Substrate of Verifiable Inference

> How Citrate mechanizes on-chain verification of off-chain AI work, Q16.16
> fixed-point arithmetic, Halo2-KZG proofs, and TEE attestation gates. Summary +
> link to Gradient Paper X.

## Overview

Papers I–IX describe *what* Citrate does; Paper X describes *how the on-chain
verification of off-chain AI work is actually mechanized*. The goal is to certify
off-chain AI **without trusted custodians**. The substrate has four layers:

1. **Q16.16 fixed-point arithmetic**, bit-deterministic numeric primitives,
   identical across every CPU.
2. **Tensor canonical wire format**, one byte layout that crosses the
   contract/precompile boundary.
3. **Halo2-KZG ZK verifier**, a proving system whose SRS is the public
   Powers-of-Tau k=18 ceremony.
4. **TEE attestation gates**, for operations that can't be ZK-proven (e.g. a
   70B-param LLM), an attestation contract gates precompile dispatch on signed
   evidence.

## Concept

**Why fixed-point.** Floats are non-deterministic across CPUs (rounding modes,
FMA semantics, extended-precision registers). For a ZK system to be sound, the
result computed off-chain by the prover must be **bit-identical** to the witness
encoded in the circuit's finite field. Q16.16 (one `i32` = sign + 15 integer
bits + 16 fractional bits) gives integer-only, saturating, deterministic
arithmetic. A CI tripwire blocks any `f32`/`f64` from entering the Q16 paths.

**Halo2-KZG over Groth16.** The migration trades per-circuit trusted setup for a
**universal** SRS (Powers-of-Tau k=18, hundreds of contributors) plus native
recursion, at the cost of ~4× verification gas (~1M vs ~250K). For a public chain
where transparency of the setup matters and proofs are submitted by sophisticated
counterparties, the paper argues the trade is worth it. The `InferenceCircuit`
commits input / model / output via Poseidon and enforces the linear layer with
cell-bound copy constraints, so a malicious prover can't feed different values to
the hash than to the computation.

**TEE attestation gates.** Non-deterministic ops route through an
`AttestationGate` trait. Today the production default is `AlwaysReject` (Phase 1):
non-deterministic precompiles reject under strict mode. The gate is
*pre-deployed* so that when the MAA + NVIDIA NRAS implementation ships it is a
swap-in, not a redeploy, the chain keeps running while attestation is upgraded.

## How it maps to the network

- **Six Q16 compute precompiles** (`0x010A–0x010F`: matmul, dot, softmax, relu,
  linear, transpose), each validate-before-allocate and dtype-checked. These back
  the in-circuit aggregation that [paraconsistent consensus](/research/paraconsistent)
  and the [learning cycle](/research/learning) rely on for determinism.
- **Halo2-KZG verifier** at the inference-proof precompile, with an SRS loader
  that **hash-verifies** the `.ptau` file against an embedded expected digest and
  fails closed on mismatch.
- **TEE attestation registry** gates dispatch for non-deterministic ops; the
  end-to-end flow is: run inference in a TEE → produce attestation token →
  post (input, output) on-chain → contract verifies token → settle/pay →
  (optional) also produce a Halo2-KZG proof.
- **Mentorship verification** uses this substrate: a mentee can require a
  Halo2-KZG proof of adapter quality before integrating
  ([mentorship](/research/mentorship)).

## Honest status

Per the paper's reality-check table, the Q16 substrate, the six compute
precompiles, the tensor wire format, the Halo2-KZG verifier, `InferenceCircuit`
v1 (`out_dim=1, in_dim=2`), the PPoT k=18 SRS loader, and the `AttestationGate`
trait + `AlwaysReject` are **implemented and on testnet 40204**. **Specified, not
yet shipped:** the MAA+NRAS attestation implementation (target sprint CM-08), the
RM-M2b in-circuit Q16 saturation lookup tables (a known v1 soundness limitation, input ranges are an off-chain witness contract today), and larger circuit
dimensions (a config change, not new circuit logic). The TLA+ specs for verifier
version monotonicity, Q16 determinism, dispatch injectivity, and the attestation
gate are checked.

> Note on tiering: this page is the **academic, paper-level** treatment. The
> precompile *implementation internals* (`CHAIN-pre-zkp`, `CHAIN-pre-inference`,
> `CHAIN-pre-attestation`) are **Confidential / gated** and are not documented
> here.

## Source & verification

- **Paper (linked, not copied):**
  `citrate-docs/gradient_papers_v3/Gradient_Papers_No10_Substrate_of_Verifiable_Inference_v3.md`.
- **Code anchors (citrate-chain @ `03d7851`):**
  `core/execution/src/zkp/halo2/{circuits.rs,chips.rs,ptau.rs}`,
  `core/execution/src/precompiles/{verify,inference}.rs` (inference precompiles
  `0x0100–0x0106`), `core/execution/src/precompiles/q16/`,
  `core/execution/src/precompiles/attestation/`. Developer reference:
  `PRECOMPILES.md`, `ZK_VERIFICATION.md`. Specs: `specs/tla/{zk,compute}/`.
- **Related (gated internals):** `/chain/precompiles-zkp`,
  `/chain/precompiles-zkp#inference`, `/chain/precompiles-zkp#attestation`.
- **No secrets on this page.** The dev-only insecure SRS fallback seed described
  in the paper is **not** reproduced here; production requires a hash-verified
  `.ptau`.
