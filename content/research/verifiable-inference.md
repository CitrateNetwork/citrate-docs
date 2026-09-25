---
title: The substrate of verifiable inference
codex_slug: /research/verifiable-inference
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/execution/src/precompiles/{verify.rs,inference.rs}
surfaces: [RES-verifiable]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is the research-angle account of how a contract on the Citrate Network can trust the result of an AI
computation it did not run. It is a summary for researchers and reviewers; the proving internals that make
it work are public in the `citrate-chain` repository and are linked rather than reproduced here.

## What it is

A model that runs off-chain produces a number, and a contract on-chain wants to act on that number without
paying to run the model itself. The problem is trust: the contract has no reason to believe the result
unless it can check it. Citrate answers this with a small set of precompiles that let the chain verify a
claim about off-chain work rather than repeat it, and it rests on three building blocks we can name in the
open.

The first is determinism. Floating-point math gives different answers on different hardware, depending on
rounding modes and instruction ordering, so it cannot be the basis of a result every node must agree on.
Citrate uses Q16.16 fixed-point arithmetic instead: a number is a 32-bit integer read as 16 integer bits
and 16 fractional bits, computed with saturating integer operations. The same input gives the same bytes
on every machine, which is what makes a computation reproducible and therefore checkable.

The second is proof verification. An inference proof is checked by a Halo2-KZG verifier, a pairing-based
system that lets the chain confirm a proof in one verification step instead of re-running the computation
the proof stands for. The contract sees a yes or no, not the work behind it.

The third is attestation. Some computations, a large language model on a GPU, cannot be made bit-identical
and so cannot be proven this way. For those, the chain consults a hardware-attestation gate that decides
whether a non-deterministic path is allowed to run at all. Today that gate refuses by default; see the
status below.

These three building blocks back the determinism that [paraconsistent consensus](/research/paraconsistent)
and the [learning cycle](/research/learning) depend on, and they are summarized for builders on the chain
page, [verification, inference, and attestation precompiles](/chain/precompiles-zkp). This page is the companion to that one and does
not contradict it.

## How to use it

You meet this substrate through precompile addresses, the same way you would call any contract on the chain.

1. To commit to a tensor, call `0x0107`. It returns a 32-byte field element that binds the tensor's data
   and its shape, so two payloads with the same bytes but different shapes commit differently.
2. To check an inference proof, call `0x0108`. It returns a 32-byte boolean, one for valid and zero for
   invalid.
3. To check that a single element belongs to a committed tensor, call `0x0109` with a Merkle path. It
   returns a 32-byte boolean.
4. To run inference itself, call into the hosted-inference family, `0x0100` to `0x0106`. This path is
   model-runtime-backed and returns a signed receipt over the result, gated by hardware attestation - an
   attestable statement about what ran, not a cryptographic proof that the output is correct. The
   non-deterministic paths, `0x0101` and `0x0102`, first consult the attestation gate, which on a default
   validator binary refuses them and returns a discoverable error rather than a fabricated result. For a
   result that is verifiable on-chain, verify a proof through `0x0108` instead.

## Reference

The verification surface, named from the precompiles that implement it. The deterministic verification
family verifies claims; the inference family runs and registers models.

| Address | Name | What it does |
|---|---|---|
| `0x0107` | `TENSOR_COMMIT` | Commitment over a canonical-format tensor; returns a 32-byte field element |
| `0x0108` | `INFERENCE_PROOF_VERIFY` | Halo2-KZG verification of an inference proof; returns a 32-byte boolean |
| `0x0109` | `MERKLE_VERIFY_TENSOR` | Merkle inclusion check over a committed tensor; returns a 32-byte boolean |
| `0x0100` to `0x0106` | hosted inference family | Model deployment, single and batch inference, metadata, benchmarking, model encryption; returns a signed, attestation-gated receipt, not a proof of correctness |

The verification family at `0x0107` to `0x0109` is deterministic by construction, hash and pairing and
integer math only, and its byte-level output is frozen: any drift would fork the chain and invalidate every
prior commitment. The compute family at `0x010A` to `0x010F`, six Q16.16 tensor primitives (matmul, dot,
softmax, relu, linear, transpose), gives the in-circuit math its deterministic floor.

## Design rationale

The whole design follows from one decision: check a proof instead of repeating the work. That is only sound
if every step is reproducible, which is why commitments and proofs sit on deterministic primitives and why
the result bytes are frozen rather than versioned in place. The one place determinism cannot reach is
floating-point inference on a GPU, and there the choice is to refuse rather than trust. The attestation gate
defaults to rejecting an unattested non-deterministic path, with no allow-by-omission, so a missing or stale
attestation fails closed. Failing closed is the safe trade for a path that touches non-deterministic
compute.

## Access and canon

This is a summary. It names the verification surface and the three building blocks, Q16.16
fixed-point determinism, Halo2-KZG proof verification, and hardware attestation. The proving-system
internals - circuit construction, prover and verifier internals, any structured reference string or setup
material, and the exact proof wire formats - are public in the `citrate-chain` repository (Apache-2.0);
this page summarizes and links to them rather than reproducing them. No setup seed, ceremony material,
keys, or credentials appear on this page. Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity. For the full internals, read the `verify.rs`, `inference.rs`, and `attestation/` precompile
sources in `citrate-chain`.

## Source and verification

- Source: `citrate-chain/core/execution/src/precompiles/{verify.rs,inference.rs}`, with the compute
  primitives in `core/execution/src/precompiles/compute.rs` and the attestation gate in
  `core/execution/src/precompiles/attestation/`. Research context: Gradient Paper No. 10,
  `gradient_papers_v3/Gradient_Papers_No10_Substrate_of_Verifiable_Inference_v3.md` (linked, not copied).
- Audited against SHA: `e68af83`.
- Status: the deterministic verification path (`0x0107` to `0x0109`) and the Q16.16 compute primitives are
  Implemented (pre-audit) on testnet 40204. The `0x0108` verifier is Implemented behind a build feature so
  nodes that do not host it stay lean. The attestation gate is Implemented in its always-reject default;
  live hardware-attestation verification is Specified, not yet enabled.
