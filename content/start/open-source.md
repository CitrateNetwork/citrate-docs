---
title: Open source and access
codex_slug: /start/open-source
tier: public
org_scope: ~
source_kind: authored
source: Citrate open-source policy (owner decision, 2026-07-27)
surfaces: [START-open-source]
audited_against_sha: ~
status: Implemented
created: 2026-07-28T00:00:00Z
author: Citrate team
---

Citrate is open-core, and the code is public today at
[github.com/CitrateNetwork](https://github.com/CitrateNetwork). The chain and its application layer are
already open — you can read the source, build against it, and reproduce the results now, ahead of the Q2
2027 mainnet. There is no waiting list and no gate on reading the code.

## How the licensing works

The repositories ship under a two-tier open-core model, with **Citrate Inc.** as the licensor:

- **Infrastructure is Apache-2.0** — permissively licensed, use it however you like. This is the chain, the
  federated-types crate, the node agent, the bundler, NAT, the cooperative contracts, the agent runtime,
  the JavaScript / Python / marketplace SDKs, the docs, and the explorer.
- **The application layer is BUSL-1.1** — source-available today (you can read, build, and self-host it for
  non-production use), and it converts to Apache-2.0 on its Change Date. This is the inference gateway, the
  compute pool, the cluster, Citrate Core, Comms, Quorum, Identity, Memories, the native wallet, the
  air-gapped agent, and Studio.

Publishing the source in the open is the stronger position — for the network and for the people who build
on it — than holding it back. The design is public, the audits land against public code, and the
BUSL Change Date puts the whole application layer on a path to fully permissive licensing.

## What is public

Everything that ships is public at [github.com/CitrateNetwork](https://github.com/CitrateNetwork). A few
starting points:

- **NAT** is the model architecture. Memory-safe Rust, formally specified, Apache-2.0. Read the source and
  reproduce the results.
- **American Learning Federation (ALF)** is the cooperative that trains NAT through federated learning.
- **agentile-skills** is the engineering methodology, installable by anyone.
- **The chain, SDKs, and explorer** are Apache-2.0; **Core, the gateway, and the rest of the app layer**
  are BUSL-1.1 and source-available.

## What stays private

A small set of repositories are deliberately closed, and none of them are the network itself:

- **Client and enterprise repositories** — per-customer and on-premise (Citrate Ground / Homestead) work,
  closed for the customers' sake, not ours.
- **Security and internal repositories** — the security program's private tracker (its history carries
  material that must not be public) and internal federation tooling.

If you are building on Citrate, start with the public repositories — you do not need to request access to
read or build the code.

- Contact: [citrate.ai/contact](https://citrate.ai/contact), or email `hello@citrate.ai`.
- Already building: the chain, SDKs, NAT, and ALF are public now. Start there.
