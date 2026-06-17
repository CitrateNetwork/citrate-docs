---
title: citrate-comms, End-to-End-Encrypted Agentic Team Workspace
codex_slug: /apps/comms
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-comms/README.md
surfaces: [APP-comms]
audited_against_sha: 06f21f3
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# citrate-comms

> An end-to-end-encrypted, agentic team workspace for the Citrate federation, Comms + CRM +
> Project Management in one self-hostable binary, where AI agents participate as cryptographic
> members rather than server-side wiretaps. For any team that needs secure collaboration on-prem
> or airgapped.

## Overview

citrate-comms is the federation's secure team workspace: messaging, CRM, and project management in a
single self-hostable binary. Login is a cryptographic handshake against `citrate-identity`; messages
are routed by a **server-blind relay** that can never read them; and AI agents join conversations as
**cryptographic members** of the group rather than as a privileged server-side reader.

The defining property is the trust boundary:

> **The relay is trusted for *liveness and ordering*, never for *confidentiality*.** It stores and
> forwards ciphertext plus routing metadata only. All plaintext, all group secrets, and all CRM/PM
> records live exclusively on member clients. An agent reading a channel is cryptographically
> identical to a human reading it, there is no shadow key and no plaintext escrow.

It is the first internal tool the team runs itself; if it works for us, it productizes for any team on
the network. It runs on-prem and airgapped alongside `nist-agent`.

**Status:** accepted into the federation (2026-06-14). **COMMS-S0 (Foundations) prototype complete**, the cryptographic + transport spine works end to end (22 tests green). Next: COMMS-S1 (WebSocket
transport + RocksDB persistence + full channels/forums/DMs). Honest status: pre-1.0; several crates are
in progress (see Reference).

## Architecture

```
  citrate-identity (SIWE/OIDC)        AI agents (nist-agent / agent-runtime)
   wallet_address = identity            join as MLS members, keys in keyring
            │                                   │
            ▼                                   ▼
   ┌──────────────────────┐         ┌──────────────────────────┐
   │  comms-client (Slint) │        │  comms-agent-bridge       │
   │  MLS client + local   │        │  MLS client for an agent  │
   │  encrypted store      │        │  Unix-socket JSON IPC     │
   └──────────┬───────────┘         └───────────┬──────────────┘
              │  opaque MLS ciphertext envelopes │
              ▼                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │  comms-relay  (server-blind delivery service)             │
   │  WS transport · per-group total order · KeyPackage dir    │
   │  ciphertext store · BLAKE3 audit log · reads ZERO plaintext│
   └──────────────────────────────────────────────────────────┘
```

### MLS and the cryptographic grade

- **Group messaging:** MLS (RFC 9420) via OpenMLS, ciphersuite
  `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519` (X25519 KEM · AES-128-GCM · Ed25519 signatures, the
  strongest standard MLS suite over the chain's X25519/Ed25519 curves).
- **At rest:** RocksDB column families encrypted with AES-256-GCM ("chain grade"), keys wrapped by the
  chain's PQ-hybrid `HybridKEM` (Kyber-768 + X25519, SHA3-512 combine).
- **Audit:** BLAKE3 hash-chained append-only log, optionally anchored to chain 40204 for
  tamper-evidence.

### Server-blind relay

The relay handles transport, per-group total ordering, the KeyPackage directory, the ciphertext store,
and the audit log. It reads zero plaintext. This is **enforced by the build graph**: `comms-relay` links
`comms-core` with `default-features = false`, so the `mls` module (the only place group secrets live) is
not compiled into the relay, referencing `comms_core::mls` from the relay fails to compile.

### Agents as members

AI agents (driven by `nist-agent` / `citrate-agent-runtime`) join a conversation through
`comms-agent-bridge` as full MLS members holding their own keys in a keyring, reachable over a
Unix-socket JSON IPC bridge. There is no server-side wiretap and no plaintext escrow; an agent in a
channel is cryptographically indistinguishable from a human in that channel.

## Reference

Crate layout (truth in `citrate-comms/crates/`, audited at SHA `06f21f3`):

| Crate | Status | Role |
|---|---|---|
| `comms-proto` | ✅ implemented | Wire types (Envelope, GroupId, Commit/Welcome/AppMsg, RoleAssertion, AuditRecord) |
| `comms-core` | ✅ mls/identity/audit | OpenMLS · SIWE+attestation identity · BLAKE3 audit chain; rbac/domain/store next |
| `comms-relay` | ✅ delivery service | Server-blind DeliveryService (total order, KeyPackage dir, audit); WS+RocksDB in S1 |
| `comms-agent-bridge` | ⏳ S3 | Unix-socket IPC to nist-agent / citrate-agent-runtime; an agent's MLS client |
| `comms-client` | ⏳ S2 | Native Slint app (@citrate-ui-kit); houses the S0 e2e test; UI from the design package |

Formal invariants are specified in TLA+ (`PLANSET/03_TLA_SPECS.md`): Commit-ordering and audit-chain
contiguity. Per-capability behavior is specified as Gherkin features (`PLANSET/04_FEATURES_BDD.md`).

## Examples

Build and test the workspace:

```bash
cargo build --workspace --release --locked
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```

## Tutorials

Tutorials (self-host the relay; enroll an agent as an MLS member; anchor an audit log to chain 40204)
follow under `/apps/comms/tutorials/` as the S1–S3 crates land.

## Security & access

Tier: **commercial**. citrate-comms is a paid-seat product surface; this page documents the public
architecture and crate map at a pinned SHA. The page contains **no secrets**, no keys, no bearer
tokens, no private endpoints. The relay's loopback admin and bearer-token operational details, and any
operator deployment credentials, stay out of all tiers. The system's security rests on the protocol
(MLS + the build-graph-enforced server-blind relay), not on obscuring this documentation.

## Source & verification

- **Source repo:** `citrate-comms`, `README.md` and `PLANSET/`.
- **Audited against SHA:** `06f21f3`.
- **Key code paths cited:** `crates/comms-proto`, `crates/comms-core` (`mls`, `identity`, `audit`),
  `crates/comms-relay`, `crates/comms-agent-bridge`, `crates/comms-client`.
