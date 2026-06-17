---
title: Confidential precompiles — ZKP, inference, attestation (overview)
codex_slug: /chain/precompiles-zkp
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/execution/src/precompiles/
surfaces: [CHAIN-pre-zkp, CHAIN-pre-inference, CHAIN-pre-attestation]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context) + Saul Loveman
---

# Confidential precompiles — ZKP, inference, attestation (overview)

> A **public, high-level** description of three Citrate precompile families
> whose implementation detail is Confidential. This page tells you *what they
> do* and *where their addresses sit*; it deliberately does **not** contain
> their internals.

## Overview

Citrate ships three precompile families that let on-chain contracts trust
off-chain AI work without re-running it, and that gate non-deterministic
inference. The **interfaces and addresses are public**; the **implementation
depth is Confidential** (registry tier X, `source_kind: gated`) and is served
at request time from the private home repo to authorized principals — it is
never built into the public Codex.

| Family | Addresses | What it does (high level) |
|---|---|---|
| **ZKP verify** (`CHAIN-pre-zkp`) | `0x0107`–`0x0109` | Commit to and verify claims about tensors / inference using hashes, Merkle paths, and a pairing-based proof verifier. |
| **Inference proof gate** (`CHAIN-pre-inference`) | `0x0100`–`0x0106` | The model deployment / inference / metadata runtime that executes (or gates) AI inference on-chain. |
| **TEE attestation gate** (`CHAIN-pre-attestation`) | gate consulted by `0x0101` / `0x0102` | Decides whether a non-deterministic inference path may run, based on hardware attestation. |

### ZKP verification (`0x0107`–`0x0109`)

At a high level, these three precompiles let a contract check off-chain AI work
trustlessly:

- **`0x0107` TENSOR_COMMIT** — produces a commitment over a canonical-format
  tensor (returns a 32-byte field element).
- **`0x0108` INFERENCE_PROOF_VERIFY** — verifies an inference proof; returns a
  32-byte boolean.
- **`0x0109` MERKLE_VERIFY_TENSOR** — verifies a tensor element is part of a
  committed tensor via a Merkle path; returns a 32-byte boolean.

All three are deterministic by construction (hash + pairing + integer math).
Their **byte-level output is frozen** — drift would fork the chain and
invalidate prior commitments. The tensor wire format these consume is the
public v1 format documented in [Precompiles](/chain/precompiles#tensor).

### Inference proof gate (`0x0100`–`0x0106`)

This family is the AI inference runtime: model deployment/registration,
single and batch inference, metadata query, proof verification, benchmarking,
and model-encryption operations. Whether the non-deterministic floating-point
inference path is permitted in a given call is decided by the attestation gate
(below). When no runtime is hosted, inference precompiles surface a
discoverable error rather than silently returning fake data.

### TEE attestation gate

A **trait-based gate** consulted by `0x0101 MODEL_INFERENCE` and `0x0102
BATCH_INFERENCE` before they run. The default on mainnet validator binaries is
**always-reject** (no silent allow-by-omission): in strict inference mode the
precompile refuses to run rather than execute an unattested non-deterministic
path. A future phase adds live verification of hardware attestation
(cloud-attestation JWT + GPU remote-attestation claims) so inference can run
against an attested TEE-hosted model; that verifier is **not** yet enabled.

## Security & access

**This overview page is PUBLIC and contains no confidential bodies and no
secrets** — only the public address map, the input/output *shapes* (e.g.
"returns a 32-byte boolean"), and plain-English behavior.

The **implementation detail of all three families is Confidential** (registry
tier X): circuit construction, prover/verifier internals, the inference
runtime, attestation-verification logic, key/ceremony material, and exact
ABIs. Per schema §0/§4 these are **gated** — served at runtime from the
private source repo to admins / issued auditors / contracted principals, and
**never built into the public Codex**. Access is enforced by the protocol
chokepoint, not by obscurity. No keys, ceremony secrets, or credentials appear
on this page or in any tier.

If you are an authorized principal and need the internals (circuit specs,
verifier code, attestation-verification design), request the gated
`CHAIN-pre-zkp` / `CHAIN-pre-inference` / `CHAIN-pre-attestation` surfaces.

## Source & verification

- Source repo: `citrate-chain` (Confidential bodies served from the private repo)
- Public anchors audited for this overview:
  `core/execution/src/precompiles/{verify.rs,inference.rs,attestation/}`,
  `core/execution/src/{zkp,inference}/`, dispatch in
  `core/execution/src/precompiles/mod.rs`
- Audited against SHA: `03d7851`
