---
title: What Citrate is
codex_slug: /start/what-is-citrate
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain + Citrate mission
surfaces: [START-what-is-citrate]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate is a substrate for AI compute. It is the ground that models run on, not a model itself. You bring
the data and the weights; Citrate gives them somewhere verifiable to run, on hardware you control, with a
public record of the work that anyone you authorize can check.

## What it is

The network has two halves that work together. The **Citrate Network** is a public ledger: a BlockDAG
written in Rust, live on chain id 40204 in testnet today. **Citrate Ground** is the private half: a school,
a hospital, or a contractor runs Citrate on their own machines, and their data and models stay there. The
public ledger only ever sees what an operator chooses to publish.

Three properties hold across the whole network, and the rest of Atlas assumes them:

- **On-premise by default.** Your data and your models stay on your hardware. Publishing anything to the
  public ledger is a deliberate step, taken inside the compliance envelope you set.
- **Verified participation.** Every node operator on the public network is identity-verified through VERI, Citrate's in-house verification.
  Citrate keeps the verification result, not the personal data behind it.
- **Work, not speculation.** SALT settles the work the network performs. It pays for compute and rewards
  contribution. It is the unit you count in, not a product to hold, and Atlas does not treat it as one.

Underneath, the Citrate Network is EVM-compatible: existing Solidity, tooling, and signing libraries work
against it. What makes it a substrate for AI rather than a general ledger is that inference, embeddings,
and verifiable model calls are first-class operations on the chain, not an outside service you have to
trust. The consensus that orders all of it is GhostDAG, which is covered in the [primer](/start/primer)
and in full under [Citrate Network](/chain/consensus).

## How to use it

Pick the path that matches why you are here.

1. **You write code.** Read the [primer](/start/primer), then [chain RPC](/chain/rpc) and the
   [JavaScript SDK](/sdks/js). Confirm you are pointed at Citrate, then read the DAG and make your first
   model call in [your first 10 minutes](/start/tutorials/your-first-10-minutes).
2. **You operate hardware.** Read [run a node](/operators/run-a-node) and [sell compute](/operators/sell-compute).
   A node is how idle GPUs earn SALT on Citrate Market.
3. **You run models on your own data.** Read [Citrate Ground](/enterprise/ground) and
   [federated learning](/research/learning), where models train across nodes without the data leaving them.
4. **You are evaluating the network.** Read the [roadmap](/start/roadmap) for the path to mainnet, then the
   [Gradient Papers](/research/gradient-papers) for the research the design rests on.

## Reference

The surfaces you will meet across Atlas, named once here so the names are familiar later.

| Surface | What it is |
|---|---|
| Citrate Network | the public ledger, the BlockDAG and its contracts |
| Citrate Ground | a private, on-premise instance behind your own firewall |
| Citrate Market | where compute is bought and sold |
| Citrate Orchard | the federated-learning surface, where models train across nodes |
| Citrate Node | the daemon an operator runs to contribute compute |
| Citrate Keyring | your account, your keys, and account recovery |
| Citrate Schools | the program giving US K-12 public schools free access in perpetuity |

To confirm you are talking to Citrate and not another network, ask the node for its chain id:

```bash
curl -s http://127.0.0.1:8545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   # 0x9d0c is 40204
```

## Design rationale

Most networks ask you to move your data to where the compute is. For a hospital or a school district, that
is a non-starter, and for good reason. Citrate inverts it: the compute is verified and the work is
recorded, but the data stays put. That is why Ground is the default and the public ledger is opt-in, and it
is why participation is identity-checked rather than anonymous. The cost is that joining takes a real-world
verification step. We think that is the right trade for the institutions Citrate is built to serve.

## Access and canon

Public. This is the front door, the concepts you need to decide whether to build on Citrate. No secrets,
keys, or private endpoints appear here. Deeper pages carry implementation detail and are tiered to the
audience that needs them.

## Source and verification

Chain facts verified against `citrate-chain` at `9d5959e`: chain id 40204 (`eth_chainId` returns `0x9d0c`,
see `cli/src/config.rs` and `cli/src/commands/advanced.rs`), GhostDAG parameters in
`core/consensus/src/types.rs`, SALT supply in `core/api/src/economics_rpc.rs`. The network is live on
testnet; mainnet is targeted for Q1 2027, with school pilots the prior summer. Status: Implemented
(testnet).
