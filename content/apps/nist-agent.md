---
title: The air-gapped agent sidecar
codex_slug: /apps/nist-agent
tier: public
org_scope: ~
source_kind: authored
source: nist-agent/README.md, nist-agent/crates, nist-agent/docs/rfcs/RFC-CIT-AGENT-0001.md
surfaces: [APP-nist]
audited_against_sha: 5d683dc
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is an agent harness for environments that cannot reach the internet and have to prove what they did. It
runs an AI agent on isolated, on-premise hardware, asks named people to sign off before the agent does
anything sensitive, and keeps a tamper-evident record of every step.

## What it is

The agent runs air-gapped by default. Out of the box it makes no outbound connection at all; network access
turns on only when a Security Officer signs a policy directive permitting it. So the starting position is
isolation, and reaching the network is a deliberate, recorded decision rather than the default.

Three more properties define it. Every sensitive action passes a role-bound quorum: five roles, Operator,
Reviewer, Compliance Officer, Security Officer, and Auditor, sign off using hardware-backed keys such as
FIDO2, PIV-CAC, or a Secure Enclave or TPM. The agent's abilities load as signed bundles, called Capsules,
whose manifest is enforced at the point where they are linked into the runtime, so a capability the manifest
does not grant cannot be exercised. And everything the agent does lands in a hash-chained, signed audit log;
no operator content ever reaches the public ledger, only commitments to it.

It is a sidecar, not a fork. It depends on `citrate-agent-core` as a library, adds the pieces an isolated
deployment needs, an adapter for talking to a ledger, policy bundles, pre-flight checks, the formal specs,
and the packaged distribution, and sends core changes back upstream rather than diverging.

## How to use it

The harness is meant to be composed as a library, deployed as a daemon, or embedded as a WASM component. A
first deployment looks like this:

1. Run the doctor pre-flight, which checks that the hardware keys, the air-gap posture, and the policy
   bundle are in the state the deployment expects before the agent starts.
2. Install the Capsules the agent is allowed to use. Each is a signed bundle; an unsigned or unlisted
   capability does not load.
3. Set the roster of people who hold the five roles and their hardware keys, so quorum sign-off can happen.
4. Operate the agent through the operator app, where requests wait in an approval queue until the required
   roles sign, and where you can inspect a Capsule or replay the audit log.

The agent stays air-gapped throughout unless a Security Officer has signed a directive opening a specific
egress path. Tutorials for running the doctor, installing a Capsule, and configuring a generic ledger
through a policy bundle follow under this page's tutorials.

## Reference

The piece that makes the harness work against more than one ledger is the chain adapter,
`nist-agent-chain`. A single trait abstracts the contracts the harness needs, so the rest of the harness
binds to the trait and not to any one ledger.

| Item | Path | What it is |
|---|---|---|
| `trait ChainClient` | `crates/nist-agent-chain/src/lib.rs` | The async, `Send + Sync` interface, used as `Arc<dyn ChainClient>`; methods include `chain_id()`, `anchor(kind, root)`, `is_anchored(root)`, and `read_clearance(agent_address)` |
| `CitrateChainClient` | `crates/nist-agent-chain/src/citrate.rs` | The default implementation, pinned to the Citrate Network with its canonical contract addresses |
| `GenericEvmChainClient` | `crates/nist-agent-chain/src/evm_generic.rs` | Operator-configured: contract addresses and the RPC URL come from the signed policy bundle, so an operator can run against any compatible ledger |
| Shared types | `crates/nist-agent-chain/src/{abi,types}.rs` | ABI helpers and the shared enums `AnchorKind`, `Clearance`, `CapsuleEntry`, `ContractAddresses`, `TxHash` |

Five normative TLA+ specifications cover the safety-critical control flow: the approval state machine, the
audit-chain integrity, the data-class lattice, the Capsule install gate, and the break-glass path. Each RFC
normative section has a matching set of Gherkin scenarios under `features/`. The architecture reference is
RFC-CIT-AGENT-0001, and everything in the repository is downstream of it.

To bootstrap and build:

```bash
./bootstrap.sh
cargo build --workspace --release --locked
cargo test --workspace
```

## Design rationale

A regulated, isolated environment has two needs that ordinary agent tooling ignores: it must not reach the
network unless someone authorized it, and it must be able to show, later, exactly what happened. The default
of air-gapped answers the first by making isolation the resting state and connectivity the exception that
has to be signed for. The signed audit log and the hardware-backed quorum answer the second by making every
action attributable and the record tamper-evident, while keeping operator content off the public ledger and
publishing only commitments. Loading capabilities as signed Capsules enforced at link time, rather than
checked by convention, means an action the policy never granted cannot run even by mistake. The cost is
ceremony: a sensitive action waits on real people and real keys. In the settings this is built for, the
ceremony is the point.

## Access and canon

Public, for the overview, the architecture reference, the product proposition, and the chain-adapter
surface. The compliance internals are Confidential and gated. The control mappings under `docs/compliance/`
and the audit internals under `docs/audit/` are not written into this page; they are served at request time
from the private repository to administrators and issued auditors only. This page documents what a developer
or evaluator needs to understand the product, and it does not reproduce the compliance package.

The declared compliance posture, with the implementing detail held in the gated material, is a baseline of
NIST SP 800-171 Rev 3 and CMMC Level 3, with overlays for FERPA, COPPA, CIPA, HIPAA and HITECH, FedRAMP
High, and, in a later version, additional federal regimes. The broader institutional compliance picture is
in [enterprise compliance](/enterprise/compliance), and a customer shell that depends on an isolated agent
like this one is described in [the Boeing customer shell](/apps/boeing). The source is Apache-2.0; a
commercial license is available for the FedRAMP package, and the operator app's open-source distribution
follows Slint's GPLv3 terms. This page contains no secrets, no keys, and no contract addresses.

## Source and verification

- Source repo: `nist-agent`, `README.md` and `docs/rfcs/RFC-CIT-AGENT-0001.md`.
- Audited against SHA: `5d683dc`.
- Key paths: `crates/nist-agent-chain/src/{lib,citrate,evm_generic,abi,types}.rs`, the fifteen
  `nist-agent-*` crates, `features/`, `docs/rfcs/`.
- Gated, not written here: `docs/compliance/`, `docs/audit/`.
- Status: Specified, with bootstrap complete. The RFC is in quorum review at v0.1 and the active sprint is
  early; the harness is pre-alpha and not certified. The compliance posture is declared, not yet
  externally attested.
