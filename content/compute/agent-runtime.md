---
title: Citrate Agent Runtime
codex_slug: /compute/agent-runtime
tier: academic
org_scope: ~
source_kind: transcluded
source: citrate-agent-runtime (agent/cli/, agent/core/)
surfaces: [OPS-agent-runtime]
audited_against_sha: 560c11a
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Agent Runtime

> The execution harness for Citrate agent capsules, with chain-anchored audit
> recording and human-in-the-loop tool approval. This page documents the
> `citrate-agent` CLI (`doctor`), the `RecorderClient` signing surface, and the
> `ApprovalQueue`. For researchers and operators studying the agent runtime on
> chainId **40204**.

## Overview

`citrate-agent-runtime` is the core harness for agent-driven on-chain actions:
sandboxed capsule dispatch, a cron daemon for recurring jobs (tripwires/SOPs),
chain-anchored audit recording, and human approval flows. This page is
**transcluded**, truth lives in the crates at SHA `560c11a`.

> **Honest status.** Pre-stable (v0.x). The repo classifies itself Tier 1
> (full external audit) before any `v1.0.0` tag; no stable release without
> written attestation. `RecorderClient` key custody is pilot-grade.

## Install / Setup

The chain dependency uses an SSH host alias (`github-citrate-chain`); configure
it via `citrate-federation/scripts/bootstrap.sh` before building.

```bash
cargo build --release
cargo run --release --bin citrate-agent-cli -- --help
```

## Reference

### `citrate-agent doctor`, `agent/cli/src/doctor_cmd.rs`

Runs the RFC §10.2 health/integrity checks and emits a signed TOML report.

```bash
citrate-agent doctor --config doctor.toml [--seed seed.bin] [--output report.toml] [--check <name>]
```

Exit codes: `0` Pass/Warn · `1` Blocker · `2` config/IO error. Config schema in
`agent/cli/src/config.rs`. The 11 checks (`agent/core/src/doctor/checks.rs`):

| Check | Severity behavior |
|---|---|
| `audit-chain-integrity` | Verifies audit hash-chain; Blocker on corruption. |
| `audit-file-permissions` | Warn if audit file not 0600 (Unix). |
| `approval-queue-depth` | Warn over threshold (default 100). |
| `pending-break-glass` | Blocker if "Surfaced"; Warn if "Unaffirmed". |
| `runtime-presence` | Warn if no tokio runtime. |
| `capsule-manifest-reverify` | Blocker on load fail; Warn on bad signature. |
| `wasm-linker-recheck` | Blocker on linker/WIT mismatch. |
| `policy-bundle-hash` | Blocker on SHA-256 drift. |
| `tla-spec-ci-status` | Blocker if failing specs; Warn if stale (>48h). |
| `retention-age` | Warn if audit file older than max (default 90d). |
| `anchor-reconciliation` | Reports unanchored on-chain roots. |

### `RecorderClient`, `agent/core/src/audit/recorder.rs`

The **only** signing surface for on-chain writes. Owns a secp256k1 key + RPC
client + chain ID (40204). Loads its key via `from_env()` (`DEPLOYER_PRIVATE_KEY`
env, then `.env.testnet` fallback). Key methods:

- `send_tx(to, calldata, gas)` / `send_tx_and_wait(...)`, sign + broadcast (+ await receipt).
- `record_decision(registry, params)`, writes to `AgentDecisionRegistryV2` (Approved/Rejected/AutoApproved).
- `fire_tripwire(...)` / `acknowledge_tripwire(...)` / `resolve_tripwire(...)`, `TripwireRegistry` ops.
- `encode_register_model(...)`, `AIModelRegistryPortable.registerModel()` calldata.

### `ApprovalQueue`, `agent/core/src/hitl/mod.rs`

FIFO tool-approval queue with auto-grant fast-path and per-call timeout
(auto-grant TTL 30 min; pending timeout 5 min).

- Simple track: `submit(call)`, `approve()`, `reject()`, `add_grant(tool)`, `peek()`, `depth()`.
- Role-aware track: `with_signer_roster(roster)` (production must set this, release builds fail closed without it), `submit_for_action(call, payload, quorum, proposer)`, `add_signature(call_id, sig)`.
- Separation-of-duties enforced: Auditor cannot approve, proposer cannot self-approve, no duplicate signers, no role-pair conflicts, signatures verified against canonical payload and pubkey roster.

### Environment variables

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `DEPLOYER_PRIVATE_KEY` |, | tripwire daemon: yes | secp256k1 key for `RecorderClient`. **Never commit.** |
| `CITRATE_TRIPWIRE_PROM_URL` | `http://127.0.0.1:9090` | No | Prometheus base for tripwire metrics. |
| `CITRATE_TRIPWIRE_RPC_URL` | `https://rpc.citrate.ai` | No | JSON-RPC for chain queries. |
| `CITRATE_TRIPWIRE_REGISTRY` / `_TENANT` / `_ROLE_ESCALATION` / `_MULTISIG` | (contract defaults) | No | Tripwire contract addresses. |
| `CITRATE_TRIPWIRE_SCOPE` | `keccak256("boeing-root")` | No | bytes32 scope. |
| `CITRATE_CAPSULE_SIGNING_SEED` |, | No | ed25519 seed for capsule packing. **Never commit.** |

## Examples

```bash
citrate-agent doctor --config doctor.toml --output report.toml
```

```toml
# doctor.toml (minimal)
[doctor]
agent_did = "did:citrate:agent:0x…"
```

## Tutorials

- [Run a node](/operators/run-a-node)

## Security & access

Tier **academic**: this surface is research/formal-methods oriented (TLA+ CI
gating, capsule capability verification, the doctor compliance harness). The
runtime itself is Tier 1 for audit purposes.

No secrets here. `DEPLOYER_PRIVATE_KEY` and `CITRATE_CAPSULE_SIGNING_SEED` are
named only as the variables to set from your own secret store, no values are
shown, and the `.env.testnet` / `.capsule-signing-key.env` fallbacks are
gitignored. If you find a real key in the tree, flag it; do not transcribe it.

## Source & verification

- Source repo: `citrate-agent-runtime` (`agent/cli/`, `agent/core/`)
- Audited against SHA: `560c11a`
- Pre-stable (v0.x); full audit required before v1.0.0.
