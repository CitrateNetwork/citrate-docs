---
title: Citrate Comms
codex_slug: /apps/comms
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-comms/README.md, citrate-comms/crates, citrate-comms/PLANSET
surfaces: [APP-comms]
audited_against_sha: 67557cf
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Comms is an end-to-end encrypted team workspace, messaging, a customer record, and project
management in one self-hostable binary, where agents take part as ordinary members of a conversation. It is
for any team that needs to collaborate privately, including on-premise or air-gapped, without trusting a
server to keep their secrets.

## What it is

Citrate Comms is built on one boundary, and that boundary explains everything else. A relay moves messages
between members, but it never reads them. It is trusted to keep the lights on and to put messages in order;
it is never trusted with what the messages say.

Concretely, members sign in with a cryptographic handshake tied to their Citrate account, and from then on
every message is encrypted on the sending member's machine and decrypted only on the receiving members'
machines. The relay stores and forwards ciphertext and routing information, nothing more. All plaintext, all
group secrets, and all customer and project records live only on member clients. An agent reading a channel
is cryptographically the same as a person reading it: there is no shadow key and no plaintext kept in escrow
for the server.

This server-blind property is not a promise in a policy document, it is held by the way the code is
compiled. The relay links the core library with its message-group module switched off, so the only place
group secrets could be handled is simply not present in the relay binary. Code in the relay that tried to
read a group secret would fail to compile.

## How to use it

Citrate Comms is one binary you run yourself, alongside the rest of your tools. The shape of using it is:

1. Run the relay where your team can reach it, on your own hardware, on-premise, or on an air-gapped network
   beside an on-premise agent.
2. Open the native client and sign in with the cryptographic handshake against your Citrate account. Your
   account address is your identity in the workspace.
3. Create channels, forums, and direct messages, and bring your customer records and project tracking into
   the same encrypted space.
4. Enroll an agent as a member when you want one. The agent holds its own keys and joins the group like any
   other member, reachable over a local socket bridge.

Step by step tutorials for self-hosting the relay, enrolling an agent, and anchoring an audit log to the
Citrate Network follow as the remaining components land.

## Reference

The workspace is a set of Rust crates. The cryptographic and transport spine is built and tested; the
remaining crates fill in on the published plan.

| Crate | Status | Role |
|---|---|---|
| `comms-proto` | Implemented | Wire types: envelope, group id, commit, welcome, application message, role assertion, audit record |
| `comms-core` | Implemented (mls, identity, audit, store) | Group messaging over OpenMLS, sign-in identity, the audit chain, and the ciphertext store; the role and domain modules follow |
| `comms-relay` | Implemented | The server-blind delivery service: total order per group, the key-package directory, the audit log |
| `comms-wire` | Implemented | The client-half relay wire protocol, with no MLS present |
| `comms-session` | Implemented | A member session: sign-in identity, key package, and send and receive |
| `comms-member-daemon` | Implemented | An account-owned MLS member with an in-process relay over a loopback socket |
| `comms-agent-bridge` | Implemented | A local socket bridge that lets an agent join as a member holding its own keys |
| `comms-client` | Implemented (shell, primary channel) | The native client; the shell and the main channel screen are translated from the design handoff |
| `comms-release` | Implemented | A reproducibility manifest and an Ed25519 release signer (COMMS-S4) |
| `comms-client-proof` | Implemented | A visual golden-image test harness (COMMS-S5) |

The cryptography is standard and named:

```text
group messaging   MLS (RFC 9420) via OpenMLS
ciphersuite       MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519
                  X25519 key exchange, AES-128-GCM, Ed25519 signatures
at rest           RocksDB column families encrypted with AES-256-GCM-SIV
                  (nonce-misuse-resistant, RFC 8452); classical today, with a
                  Kyber-768 + X25519 hybrid key wrapping roadmapped (PLANSET/07)
audit             BLAKE3 hash-chained append-only log,
                  optionally anchored to the Citrate Network for tamper-evidence
```

To build and test the workspace:

```bash
cargo build --workspace --release --locked
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```

Formal invariants are written in TLA+ (commit ordering and audit-chain contiguity), and each capability is
specified as a Gherkin feature. Agents reach the workspace through the same conversation surface they reach
the rest of the network with, described under [chain RPC](/chain/rpc), and the research that the audit and
verification design rests on is in [research](/research/learning).

## Design rationale

Most team tools put the server in the middle and trust it to behave: it can read everything, and you are
asked to believe it will not. For a team working under a compliance regime, or on an air-gapped network, that
trust is the thing they cannot grant. Citrate Comms removes the question by removing the server's ability to
read, and it does so where it cannot quietly be undone, in the build graph rather than in configuration. The
same decision is what lets an agent be a full member rather than a privileged listener: if the server cannot
read the channel, an agent that reads it must be a member with keys, exactly like a person. The cost is that
the relay cannot offer server-side features that depend on reading content, such as server-side search; that
work moves to the clients, which is where the plaintext already is.

## Access and canon

Commercial. Citrate Comms is a paid-seat product, and this page documents the public architecture and crate
map at a pinned commit. It carries no secrets: no keys, no tokens, and no private endpoints. The relay's
loopback administration and bearer-token operational details, and any operator deployment credentials, stay
out of every tier. The system's security rests on the protocol and the build-graph-enforced server-blind
relay, not on keeping this page vague. It runs on-premise and air-gapped alongside the on-premise compliance
agent in [the air-gapped agent sidecar](/apps/nist-agent).

## Source and verification

- Source repo: `citrate-comms`, `README.md` and `PLANSET/`.
- Audited against SHA: `0a4989e`.
- Key paths: `crates/comms-proto`, `crates/comms-core` (`mls`, `identity`, `audit`), `crates/comms-relay`,
  `crates/comms-agent-bridge`, `crates/comms-client`.
- Status: Implemented, accepted into the federation on 2026-06-14. The native Rust workspace has shipped
  through the cryptographic and transport spine and is in interface hardening (COMMS-S5 active, S0 through
  S4 complete), with 303 tests passing across the workspace (121 Rust + 182 TypeScript). It is pre-1.0: the agent bridge is built (the
  socket IPC and the account-owned MLS member), while the privileged agent runtime is not yet wired, and
  the at-rest encryption is classical with a post-quantum hybrid roadmapped. Only an internal self-audit has
  run; there is no external audit yet.
