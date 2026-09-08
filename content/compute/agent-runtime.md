---
title: Citrate Agent Runtime
codex_slug: /compute/agent-runtime
tier: academic
org_scope: ~
source_kind: authored
source: citrate-agent-runtime (agent/cli/, agent/core/, agent-cron/, agent-chain/)
surfaces: [OPS-agent-runtime]
audited_against_sha: f161e69
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The agent runtime is how an agent runs on an operator's own machine without acting unsupervised.
It records every action in a tamper-evident log, holds risky tool calls behind a human approval
gate, and ships a diagnostic that refuses to clear a node when those safeguards are missing. It
is for researchers and operators studying how agents can act on the network while staying
accountable.

## What it is

The safety posture is the whole point, so it comes first. An agent here does not run free. Three
things hold at once. Every action it takes is written to an append-only audit chain, where each
record carries the hash of the one before it, so a deleted or altered record breaks the chain
and shows. Every tool call the agent wants to make passes through an approval queue, and the
calls that matter wait for a human, or a quorum of humans, to sign off before they run. And the
whole thing runs on the operator's own hardware, the on-premise default that holds across the
network; the only writes that reach the public ledger are the ones the runtime is told to anchor.

The runtime is several crates in the `citrate-agent-runtime` workspace. The pieces that carry
the safety story are these.

- A diagnostic, run as `citrate-agent doctor`, that checks the safeguards are intact and emits a
  signed report.
- A recorder, `RecorderClient`, the single surface that signs and writes to the chain. Nothing
  else holds the key.
- An approval queue, `ApprovalQueue`, the human-in-the-loop gate that risky tool calls pass
  through.
- A cron daemon that runs recurring checks, the tripwires and standing procedures, on a
  schedule, and records what they find.
- A capsule loader that verifies an agent's signed package against its manifest before it runs,
  and grants it only the capabilities the manifest declares.

## How to use it

1. Configure the chain dependency before you build. The runtime pulls a chain crate over an SSH
   host alias, `github-citrate-chain`, that must resolve in your `~/.ssh/config`. The simplest
   path is to run `citrate-federation/scripts/bootstrap.sh`, which sets the alias up for you. A
   fresh machine without it fails the build with `Could not resolve hostname
   github-citrate-chain`.
2. Build the workspace. `cargo build --release`, then `cargo run --release --bin
   citrate-agent -- --help` to confirm the CLI. The package is `citrate-agent-cli`; the binary it
   produces is named `citrate-agent`.
3. Write a `doctor.toml` naming the agent and pointing at the audit log and the policy files you
   want checked.
4. Run the diagnostic against a node before you trust it. `citrate-agent doctor` exits 0 on pass
   or warn, 1 on a blocker, and 2 on a configuration or IO error before it could run.
5. For the recorder and the cron daemon, supply the signing key from your own secret store
   through the environment. The key is never a value on this page or in the tree.

```bash
citrate-agent doctor --config doctor.toml --output report.toml
```

```toml
# doctor.toml, minimal
[doctor]
agent_did = "did:citrate:agent:0x..."
```

## Reference

### The diagnostic, `citrate-agent doctor`

The command lives in `agent/cli/src/doctor_cmd.rs`; its config schema is in
`agent/cli/src/config.rs`. It runs eleven checks defined in `agent/core/src/doctor/checks.rs`,
each returning Pass, Skipped, Warn, or Blocker (`agent/core/src/doctor/report.rs`); a skipped
required check holds the overall result to at least Warn rather than a clean Pass. With a seed
file it signs the report. The flags are `--config`, `--output`, `--check <name>` to run a subset, and
`--seed` for the signing key.

| Check | Behavior |
|---|---|
| `audit-chain-integrity` | Walks the audit hash-chain. Blocker if a record was altered or deleted. |
| `audit-file-permissions` | Warn if the audit file is not mode 0600 on Unix. |
| `approval-queue-depth` | Warn when pending approvals pass a threshold, default 100. |
| `pending-break-glass` | Blocker if a break-glass case is surfaced, Warn if it is unaffirmed. |
| `runtime-presence` | Warn if no async runtime is present. |
| `capsule-manifest-reverify` | Blocker if a capsule fails to load, Warn on a bad signature. |
| `wasm-linker-recheck` | Blocker on a linker or interface mismatch. |
| `policy-bundle-hash` | Blocker if a policy file's SHA-256 has drifted. |
| `tla-spec-ci-status` | Blocker on failing specs, Warn if the status is stale past the window. |
| `retention-age` | Warn if the audit file is older than the retention maximum, default 90 days. |
| `anchor-reconciliation` | Reports on-chain roots that have not been anchored. |

### The recorder, `RecorderClient`

In `agent/core/src/audit/recorder.rs`. It is the only surface that signs on-chain writes: it
owns a secp256k1 key, an RPC client, and the chain id 40204. It loads its key with `from_env`,
which reads `DEPLOYER_PRIVATE_KEY`, or, when that is unset, a key file named by
`CITRATE_RECORDER_KEY_ENV_FILE`; that path must be absolute and pass a mode-0600 check. The
earlier gitignored `.env.testnet` fallback was removed (AR-B-010). Its writes go through
`send_tx` and `wait_for_receipt`. Every approve or reject the runtime makes is written
as a decision record to the on-chain `AgentDecisionRegistryV2`. The audit chain itself is
`AuditChain` in `agent/core/src/audit/chain.rs`, which mints a genesis record, appends each new
record with a contiguity check against the previous hash, and can walk the whole chain to verify
its integrity. Records are written through an `AuditSink`; the filesystem sink and the
chain-anchor sink are present, the object-store and write-once sinks are not yet shipped.

### The approval gate, `ApprovalQueue`

In `agent/core/src/hitl/mod.rs`. Tool calls enter the queue and wait. Low-risk calls can be
auto-granted on a fast path with a time-to-live, default 30 minutes; a pending call that no one
answers times out, default 5 minutes. The risk tier of a call decides how many signatures it
needs (`agent/core/src/hitl/quorum.rs`): low auto-approves, medium needs one signer from the
required set, high needs two, and critical needs a fixed set of officer roles. Separation of
duties is enforced in `agent/core/src/hitl/roles.rs`: the Auditor role can never approve, the
Compliance Officer and Security Officer roles cannot both stand for the same approval, and no
signer counts twice. Signatures are verified against a canonical payload and a known signer
roster (`agent/core/src/hitl/signing.rs`); a production build fails closed if no roster is set.

There is a break-glass path in `agent/core/src/hitl/break_glass.rs` for emergencies, and it is
built to be hard to abuse: an invocation notifies all roles, must be affirmed by a quorum within
a 72-hour window, and is blocked outright for ITAR-classed actions. Its state machine and the
audit chain's integrity property are both checked in TLA+.

### The cron daemon and tripwires

In `agent-cron/`. A `CronScheduler` (`agent-cron/src/scheduler.rs`) runs recurring jobs on cron
schedules, each carrying a snapshot of the capabilities it was granted. A standing-procedure
engine (`agent-cron/src/sop.rs`) runs multi-step procedures on a trigger. The tripwire daemon
(`agent-cron/src/bin/tripwire_daemon.rs`) runs a set of compliance tripwires that read metrics
from Prometheus and events from the chain, and fire through the recorder when a threshold is
crossed. Its environment is below.

### The capsule loader

In `agent/core/src/capsule/`. An agent ships as a capsule: a signed archive with a manifest. The
loader (`mod.rs`) verifies the content hash, checks the publisher's signature against a key
registry keyed by signing tier (`tiers.rs`), cross-checks the declared capabilities against the
component's interface (`verify.rs`), and builds a linker that exposes only the capabilities the
manifest declares, failing closed when an undeclared import is needed. The manifest
(`manifest.rs`) declares the capsule's data classes, its risk tier, the roles required to
approve it, and whether it is break-glass eligible.

### Environment variables

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | none | tripwire daemon: yes | secp256k1 key for `RecorderClient`. Never commit it. |
| `CITRATE_RECORDER_KEY_ENV_FILE` | none | no | Absolute path to a mode-0600 key file, read when `DEPLOYER_PRIVATE_KEY` is unset. |
| `CITRATE_TRIPWIRE_PROM_URL` | `http://127.0.0.1:9090` | no | Prometheus base for tripwire metrics. |
| `CITRATE_TRIPWIRE_RPC_URL` | `https://rpc.citrate.ai` | no | JSON-RPC for chain queries. |
| `CITRATE_TRIPWIRE_REGISTRY` and the `_TENANT`, `_ROLE_ESCALATION`, `_MULTISIG` addresses | contract defaults | no | Tripwire contract addresses. |
| `CITRATE_TRIPWIRE_SCOPE` | `keccak256("boeing-root")` | no | bytes32 scope. |
| `CITRATE_CAPSULE_SIGNING_SEED` | none | no | ed25519 seed for capsule packing. Never commit it. |

## Design rationale

The runtime puts the key in exactly one place on purpose. `RecorderClient` is the only thing
that can sign an on-chain write, so the audit chain and the approval gate cannot be bypassed by
some other code path signing its own transaction; if it went to the chain, it went through the
recorder, and it is in the log. The audit log is a hash-chain rather than a plain file so that
tampering is detectable rather than silent, and the diagnostic treats a broken chain as a
blocker, not a warning. The approval gate scales the number of human signatures to the risk of
the call rather than asking for approval on everything, which is what keeps the gate usable
instead of ignored. The cost of all this is that the agent is slower and more bounded than one
that simply acts; for actions that change state on a shared network, that is the trade we want.

## Failure modes

The runtime is built to fail closed. A production build with no signer roster will not start the
role-aware approval path; it refuses rather than approving on trust. An undeclared capability in
a capsule fails instantiation rather than being granted quietly. A break-glass invocation for an
ITAR-classed action is blocked outright, and any break-glass case that is surfaced turns the
diagnostic into a blocker. The recorder's key custody is honest about its limits: loading the
key from an environment variable is pilot-grade, fit for testnet and controlled pilots, and is
the part most in need of hardening before a stable release. If you ever find a real key in the
tree, flag it; do not transcribe it.

## Access and canon

Tier academic: this surface is oriented to research and formal methods, the TLA+ checks on the
audit chain and the break-glass machine, capsule capability verification, and the diagnostic
itself. The runtime is classified for a full external audit before any v1.0.0 tag
(`AUDIT_TIER.md`); there is no stable release without a written attestation against an exact
commit. Every operator account on the public network is identity-verified through VERI, Citrate's in-house verification. No
secrets appear here: `DEPLOYER_PRIVATE_KEY` and `CITRATE_CAPSULE_SIGNING_SEED` are named only as
variables to set, and any key file named by `CITRATE_RECORDER_KEY_ENV_FILE` must be an absolute
path at mode 0600, held in your own secret store.

This page connects to [run a node](/operators/run-a-node) for the operator who hosts the
runtime, to [research](/research) for the agent-safety work behind it, and to the
[governance contracts](/contracts/governance), where the recorder writes its decisions to the
`AgentDecisionRegistryV2`.

## Source and verification

- Source repo: `citrate-agent-runtime`.
- Files: `agent/cli/src/doctor_cmd.rs`, `agent/cli/src/config.rs`,
  `agent/core/src/doctor/{checks.rs,report.rs}`, `agent/core/src/audit/{recorder.rs,chain.rs}`,
  `agent/core/src/hitl/{mod.rs,quorum.rs,roles.rs,signing.rs,break_glass.rs}`,
  `agent/core/src/capsule/{mod.rs,manifest.rs,tiers.rs,verify.rs}`,
  `agent-cron/src/{scheduler.rs,sop.rs,bin/tripwire_daemon.rs}`, `AUDIT_TIER.md`.
- Audited against SHA: `f161e69`.
- Status by component:
  - `doctor` and its eleven checks, `RecorderClient`, `AuditChain`, `ApprovalQueue`, the quorum
    and role rules, break-glass, the cron scheduler, the standing-procedure engine, the tripwire
    daemon, and the capsule loader: Implemented.
  - The audit-chain integrity property, the approval state machine, and the break-glass state
    machine: Verified in TLA+.
  - `RecorderClient` key custody (environment-loaded key, no nonce cache): Implemented but
    pilot-grade, flagged for hardening.
  - Object-store and write-once audit sinks, and hardware-backed signing surfaces: Specified,
    not yet shipped.
  - Full external audit before v1.0.0: required, not yet performed; pre-stable (v0.x).
