---
title: nist-agent, NIST-Compliant Agent Sidecar
codex_slug: /apps/nist-agent
tier: public
org_scope: ~
source_kind: transcluded
source: nist-agent/README.md
surfaces: [APP-nist]
audited_against_sha: 5d683dc
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# nist-agent

> A composable, NIST-compliant agent harness, a sidecar for the Citrate Network and other EVM chains.
> For operators who need a compliance-first, air-gapped-by-default way to run AI agents with
> cryptographic human-in-the-loop control.

## Overview

nist-agent is a Rust-implemented agent harness, the distribution and packaging surface for
[RFC-CIT-AGENT-0001](#the-rfc). It is built so that you "compose as a library, deploy as a daemon, embed
as a WASM component." Its design goals:

- **Air-gapped by default**, zero outbound connectivity unless explicitly enabled by a signed Security
  Officer policy directive.
- **Tiered-risk, role-bound quorum**, every action is gated through five roles (Operator, Reviewer,
  Compliance Officer, Security Officer, Auditor) with cryptographic sign-off from hardware-backed keys
  (FIDO2 / PIV-CAC / Secure-Enclave-or-TPM).
- **Capsules**, capabilities load as signed WIT/WASM Component Model bundles whose manifest is enforced
  at the wasmtime linker. Capability enforcement is load-time, not advisory.
- **Hash-chained, signed audit log**, four storage backends and three on-chain anchor strategies; no
  operator content ever reaches the chain, only commitments.
- **Formally verified control flow**, five normative TLA+ specifications cover the Approval state
  machine, audit-chain integrity, the data-class lattice, the capsule install gate, and the break-glass
  path.
- **Slint operator app**, with a bundled local concierge for first-run onboarding, a HITL approval
  queue, a Capsule Inspector, and a marketplace browser.

It is a **sidecar consumer** of `citrate-agent-runtime`: it depends on `citrate-agent-core` as a Cargo
crate, adds the EVM-chain-adapter, authors policy bundles, runs the doctor pre-flight checks, populates
the TLA+ specs locally, and packages the signed distribution. It does **not** fork the runtime, core
changes are done upstream and PR'd back.

**Status (honest):** pre-alpha. Bootstrap complete (Sprint S-0); RFC v0.1 in quorum review; Sprint S-1
active. Not certified.

## The RFC

The architecture reference is **RFC-CIT-AGENT-0001** (`docs/rfcs/RFC-CIT-AGENT-0001.md`). Everything in
the repo is downstream of it. Per-section behavior is specified as Gherkin BDD scenarios under
`features/` (one file per RFC normative section).

## Product spec

The v1.0 product proposition: nist-agent runs on Citrate L1 *or any compatible EVM chain*, gating every
agent action through a hardware-backed quorum, loading capabilities as signed Capsules, and producing a
tamper-evident audit trail whose commitments (never content) can be anchored on chain.

Compliance posture is declared at the product level (the implementing details are gated, see Security &
access):

- **Baseline:** NIST SP 800-171 Rev 3 + CMMC Level 3.
- **Overlays (v1.0):** FERPA, COPPA, CIPA, HIPAA / HITECH, FedRAMP High.
- **Overlays (v1.1):** DoD IL4 / IL5, ITAR, CJIS, IRS 1075.
- **Default network posture:** air-gapped, opt-in egress.

## Reference, the multi-chain adapter

The seam that makes nist-agent chain-agnostic is `nist-agent-chain` (`crates/nist-agent-chain/`). Per
RFC §3.2 and ADR-003, a single trait abstracts the five RFC §7.1 contracts so the rest of the harness
binds to the trait, not a chain.

- **`trait ChainClient`** (`crates/nist-agent-chain/src/lib.rs`), async, `Send + Sync` so it works as
  `Arc<dyn ChainClient>` inside the agent loop. Methods mirror the RFC §7 contract interfaces:
  `chain_id()`, `anchor(kind, root)`, `is_anchored(root)`, `read_clearance(agent_address)`, and the
  remaining §7.1 reads/writes. Shared ABI helpers live in `abi.rs`; shared enums (`AnchorKind`,
  `Clearance`, `CapsuleEntry`, `ContractAddresses`, `TxHash`) in `types.rs`.
- **`CitrateChainClient`** (`src/citrate.rs`), the default impl, pinned to Citrate Mainnet
  (`chain_id() == 40204`) with the five canonical contract addresses; wraps
  `citrate_agent_core::chain::anchor::AnchorRegistryClient`.
- **`GenericEvmChainClient`** (`src/evm_generic.rs`), operator-configured: contract addresses and RPC
  URL come from the signed PolicyBundle, letting operators deploy against any EVM chain hosting
  compatible contract bytecode.

## Examples

Bootstrap and build:

```bash
./bootstrap.sh
cargo build --workspace --release --locked
cargo test --workspace
```

## Tutorials

Tutorials (run the doctor pre-flight; install a signed Capsule; configure a generic EVM chain via a
PolicyBundle) follow under `/apps/nist-agent/tutorials/`.

## Security & access

Tier: **public**, for the overview, the RFC, the product spec, and the multi-chain adapter surface.

> **The compliance internals are Confidential and gated.** The overlay implementation detail under
> `docs/compliance/` (CMMC L3, FERPA, COPPA, CIPA, HIPAA, FedRAMP High control mappings) and the audit
> internals under `docs/audit/` are **not** authored into this public page. They are served at request
> time from the private repo to admins / issued auditors only (registry tier transition `P→X`). This
> page documents only what a developer or evaluator needs to understand the product; it does not clone
> the compliance package.

This page contains **no secrets**, no keys, no contract addresses are transcribed, no private
endpoints, no credentials. Licensing note: source is Apache-2.0; a commercial license is available for
the FedRAMP package per RFC §8.4; the Slint operator app's open-source distribution is GPLv3 (Slint is
triple-licensed).

## Source & verification

- **Source repo:** `nist-agent`, `README.md`, `docs/rfcs/RFC-CIT-AGENT-0001.md`.
- **Audited against SHA:** `5d683dc`.
- **Key code paths cited:** `crates/nist-agent-chain/src/{lib,citrate,evm_generic,abi,types}.rs`,
  `crates/` (15 nist-agent-* crates), `features/`, `docs/rfcs/`.
- **Gated (not authored here):** `docs/compliance/`, `docs/audit/`.
