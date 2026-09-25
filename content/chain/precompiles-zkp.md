---
title: Verification, inference, and attestation precompiles (summary)
codex_slug: /chain/precompiles-zkp
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/execution/src/precompiles/
surfaces: [CHAIN-pre-zkp, CHAIN-pre-inference, CHAIN-pre-attestation]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is a summary of three precompile families on the Citrate Network. It tells you what they do and where
their addresses sit. Their proving internals and circuit design are public in the `citrate-chain`
repository and linked below rather than reproduced here. It is for anyone deciding how to build against
verifiable AI work on the chain.

## What it is

The Citrate Network ships one precompile family at `0x0100` to `0x010F`, in three groups that let an
on-chain contract trust off-chain AI work without re-running it, plus an attestation gate over
non-deterministic inference. The interfaces and addresses are public, and the full implementation is public
in the `citrate-chain` repository (Apache-2.0); this page summarizes and links to it.

| Group | Addresses | What it does |
|---|---|---|
| Hosted inference | `0x0100` to `0x0106` | Model deployment and registration, single and batch inference, metadata, benchmarking, and model encryption. Model-runtime-backed: a hosted-inference call returns a **signed receipt** over the result, gated by hardware attestation - **not** a pure deterministic on-chain proof of correctness. |
| Proof verification (incl. ZK-verified inference) | `0x0107` to `0x0109` | Commit to tensors and verify claims and proofs with hashes, Merkle paths, and a Halo2-KZG pairing verifier. Deterministic; the result is verifiable on-chain. |
| Deterministic Q16.16 compute | `0x010A` to `0x010F` | Fixed-point tensor primitives (matmul, dot, softmax, relu, linear, transpose); bit-identical across nodes. |
| Attestation gate | consulted by `0x0101` and `0x0102` | Decides whether a non-deterministic inference path may run, based on hardware attestation. |

The cryptography underneath rests on three publicly nameable building blocks: Q16.16 fixed-point math for
determinism, Halo2-KZG proof verification, and TEE attestation. Poseidon over BN254
(`zkp/poseidon_bn254.rs`) is the commitment hash. The proving-system internals and circuit design are public
in `citrate-chain` and linked below.

### Verification, `0x0107` to `0x0109`

These three precompiles let a contract check off-chain AI work without redoing it.

- `0x0107 TENSOR_COMMIT` produces a Poseidon commitment over a canonical-format tensor and returns a 32-byte
  field element.
- `0x0108 INFERENCE_PROOF_VERIFY` verifies an inference proof with a Halo2-KZG verifier and returns a
  32-byte boolean.
- `0x0109 MERKLE_VERIFY_TENSOR` verifies that a tensor element is part of a committed tensor via a Merkle
  path and returns a 32-byte boolean.

All three are deterministic by construction, hash plus pairing plus integer math, and their byte-level
output is frozen: drift would fork the chain and invalidate prior commitments. The tensor wire format these
consume is the public version 1 format documented in [Precompiles](/chain/precompiles).

### Hosted inference, `0x0100` to `0x0106`

This group is the hosted AI inference runtime: model deployment and registration, single and batch
inference, metadata query, benchmarking, and model-encryption operations. It is model-runtime-backed, so an
inference call returns a **signed receipt** over the result - an attestable statement about what ran, not a
cryptographic proof that the output is correct. Whether a non-deterministic floating-point inference path is
permitted at all is decided by the attestation gate below. When no runtime is hosted, these precompiles
surface a discoverable error rather than silently returning fake data.

For a result that is *verifiable on-chain* rather than merely signed, use the proof-verification group
(`0x0107`–`0x0109`) - a ZK-verified inference proof checked by the Halo2-KZG verifier - or keep the
computation inside the deterministic Q16.16 compute group (`0x010A`–`0x010F`).

### Deterministic Q16.16 compute, `0x010A` to `0x010F`

Six fixed-point tensor primitives - matmul, dot, softmax, relu, linear, and transpose - computed in
saturating Q16.16 integer arithmetic so the result is bit-identical on every node. This is the deterministic
floor the proof and commitment machinery rests on; see [Precompiles](/chain/precompiles) for the reference.

### Attestation gate

A trait-based gate (`core/execution/src/precompiles/attestation/`) consulted by `0x0101 MODEL_INFERENCE` and
`0x0102 BATCH_INFERENCE` before they run. The default on mainnet validator binaries is always-reject, with
no silent allow-by-omission: in strict inference mode the precompile refuses to run rather than execute an
unattested non-deterministic path. A later phase adds live verification of hardware attestation, a
cloud-attestation JWT plus GPU remote-attestation claims, so inference can run against an attested,
TEE-hosted model. That verifier is not yet enabled.

## Design rationale

The hard problem these families solve is letting a contract believe a model's output without paying to run
the model on-chain. There are two honest answers, and the docs keep them distinct. For work that can be made
deterministic, the chain commits to the work and verifies a proof of it (the `0x0107`–`0x0109` group and the
`0x010A`–`0x010F` compute primitives), so a contract checks a small proof instead of repeating a large
computation - that result is verifiable on-chain. For hosted inference that cannot be made bit-identical
(`0x0100`–`0x0106`), the chain does not claim a cryptographic proof of correctness: it returns a signed
receipt gated by hardware attestation, an attestable statement about what ran and where. Commitments use
Poseidon, proofs use a fixed Halo2-KZG verifier, and the byte output is frozen. The attestation gate
addresses the one place determinism cannot reach, floating-point inference on a GPU: rather than trust it
blindly, the gate defaults to refusing it until hardware attestation proves where it ran. The deliberate
choice to fail closed, to reject by default, is the safe trade for a path that touches non-deterministic
compute.

## Failure modes

- The inference precompiles fail discoverably: with no runtime hosted, a call returns an error a contract
  can detect, not fabricated output.
- The attestation gate defaults to always-reject. An unattested non-deterministic inference path does not
  run; there is no allow-by-omission, so a missing or stale attestation fails closed.
- The verification precompiles have frozen byte output. Any drift in their result would fork the chain and
  invalidate every prior commitment, which is why the format is fixed rather than versioned in place.

## Access and canon

This page is a summary. It carries the address map, the input and output shapes, for example
"returns a 32-byte boolean", and plain-English behavior.

The implementation detail of all three families - circuit construction, prover and verifier internals, the
inference runtime, the attestation-verification logic, and the exact ABIs - is public in the `citrate-chain`
repository (Apache-2.0). This page summarizes and links to that source rather than reproducing it. Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity. No keys, ceremony secrets, or
credentials appear on this page.

For the full internals - the circuit specs, verifier code, or attestation-verification design - read the
precompile and ZKP sources in `citrate-chain` linked below.

## Source and verification

- Source repo: `citrate-chain` (public, Apache-2.0)
- Public anchors audited for this summary:
  `core/execution/src/precompiles/{verify.rs,inference.rs,attestation/}`,
  `core/execution/src/zkp/{poseidon_bn254.rs,halo2/}`, dispatch in
  `core/execution/src/precompiles/mod.rs`
- Audited against SHA: `9d5959e`
- Status: Implemented (pre-audit) for the deterministic verification path on testnet 40204. The
  attestation gate is Implemented in its always-reject default; live attestation verification is Specified,
  not yet enabled.
