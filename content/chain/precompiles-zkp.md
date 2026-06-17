---
title: Confidential precompiles, verification, inference, attestation (summary)
codex_slug: /chain/precompiles-zkp
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/execution/src/precompiles/
surfaces: [CHAIN-pre-zkp, CHAIN-pre-inference, CHAIN-pre-attestation]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is a public summary of three precompile families on the Citrate Network whose internals are
confidential. It tells you what they do and where their addresses sit. It does not contain their proving
internals or circuit design, which are gated. It is for anyone deciding how to build against verifiable AI
work on the chain.

## What it is

The Citrate Network ships three precompile families that let an on-chain contract trust off-chain AI work
without re-running it, and that gate non-deterministic inference. The interfaces and addresses are public.
The implementation depth is confidential and is served at request time to authorized principals, never
built into the public docs.

| Family | Addresses | What it does |
|---|---|---|
| Verification | `0x0107` to `0x0109` | Commit to and verify claims about tensors and inference, using hashes, Merkle paths, and a pairing-based proof verifier. |
| Inference runtime | `0x0100` to `0x0106` | Model deployment, single and batch inference, metadata, proof verification, benchmarking, and model encryption. |
| Attestation gate | consulted by `0x0101` and `0x0102` | Decides whether a non-deterministic inference path may run, based on hardware attestation. |

The cryptography underneath rests on three publicly nameable building blocks: Q16.16 fixed-point math for
determinism, Halo2-KZG proof verification, and TEE attestation. Poseidon over BN254
(`zkp/poseidon_bn254.rs`) is the commitment hash. We name these as building blocks and go no further; the
proving-system internals and circuit design are gated.

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

### Inference runtime, `0x0100` to `0x0106`

This family is the on-chain AI inference runtime: model deployment and registration, single and batch
inference, metadata query, proof verification, benchmarking, and model-encryption operations. Whether the
non-deterministic floating-point inference path is permitted in a given call is decided by the attestation
gate below. When no runtime is hosted, these precompiles surface a discoverable error rather than silently
returning fake data.

### Attestation gate

A trait-based gate (`core/execution/src/precompiles/attestation/`) consulted by `0x0101 MODEL_INFERENCE` and
`0x0102 BATCH_INFERENCE` before they run. The default on mainnet validator binaries is always-reject, with
no silent allow-by-omission: in strict inference mode the precompile refuses to run rather than execute an
unattested non-deterministic path. A later phase adds live verification of hardware attestation, a
cloud-attestation JWT plus GPU remote-attestation claims, so inference can run against an attested,
TEE-hosted model. That verifier is not yet enabled.

## Design rationale

The hard problem these families solve is letting a contract believe a model's output without paying to run
the model on-chain. The answer is to commit to the work and verify a proof of it, so the chain checks a
small proof instead of repeating a large computation. That only holds if every step is deterministic, which
is why commitments use Poseidon, proofs use a fixed Halo2-KZG verifier, and the byte output is frozen. The
attestation gate addresses the one place determinism cannot reach, floating-point inference on a GPU: rather
than trust it blindly, the gate defaults to refusing it until hardware attestation proves where it ran. The
deliberate choice to fail closed, to reject by default, is the safe trade for a path that touches
non-deterministic compute.

## Failure modes

- The inference precompiles fail discoverably: with no runtime hosted, a call returns an error a contract
  can detect, not fabricated output.
- The attestation gate defaults to always-reject. An unattested non-deterministic inference path does not
  run; there is no allow-by-omission, so a missing or stale attestation fails closed.
- The verification precompiles have frozen byte output. Any drift in their result would fork the chain and
  invalidate every prior commitment, which is why the format is fixed rather than versioned in place.

## Access and canon

This page is a public summary. It carries the address map, the input and output shapes, for example
"returns a 32-byte boolean", and plain-English behavior, and nothing more.

The implementation detail of all three families is confidential: circuit construction, prover and verifier
internals, the inference runtime, the attestation-verification logic, any ceremony material, and the exact
ABIs. Those are gated, served at runtime from the private source repo to admins, issued auditors, and
contracted principals, and never built into the public docs. Access is enforced at the protocol chokepoint,
not by obscurity. Every node operator on the public network is identity-checked through CLEAR, and Citrate
keeps the verification result, not the personal data behind it. No keys, ceremony secrets, or credentials
appear on this page or in any tier.

If you are an authorized principal and need the internals, the circuit specs, verifier code, or
attestation-verification design, request the gated `CHAIN-pre-zkp`, `CHAIN-pre-inference`, or
`CHAIN-pre-attestation` surfaces.

## Source and verification

- Source repo: `citrate-chain` (confidential bodies served from the private repo)
- Public anchors audited for this summary:
  `core/execution/src/precompiles/{verify.rs,inference.rs,attestation/}`,
  `core/execution/src/zkp/{poseidon_bn254.rs,halo2/}`, dispatch in
  `core/execution/src/precompiles/mod.rs`
- Audited against SHA: `03d7851`
- Status: Implemented (pre-audit) for the deterministic verification path on testnet 40204. The
  attestation gate is Implemented in its always-reject default; live attestation verification is Specified,
  not yet enabled.
