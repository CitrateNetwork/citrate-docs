---
title: The roadmap
codex_slug: /start/roadmap
tier: public
org_scope: ~
source_kind: authored
source: Citrate mission + program plan
surfaces: [START-roadmap]
audited_against_sha: 9d5959e
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Where Citrate is today and what comes next. The network is live on testnet now; mainnet is targeted for the
first quarter of 2027. This page is the plan, so it carries a Specified status: the dates are commitments
we are working toward, not facts already recorded on a ledger.

## What it is

A plain account of the path from testnet to mainnet, in the order the work lands. We would rather state the
timeline and be held to it than imply everything already exists.

## How to use it

Read this to decide when to build, pilot, or wait. If you are writing code, the testnet is ready for you
now, and the [tutorials](/start/tutorials/your-first-10-minutes) work against it today. If you run a public
institution, the school program below is the path in. If you are evaluating for production, the mainnet
target is the date to plan around.

## Reference

| Phase | Status | What it means |
|---|---|---|
| Testnet, chain id 40204 | Implemented | The public network is live. RPC, the SDKs, contracts, and the model calls in the tutorials all run against it today. |
| School pilots | Specified, summer 2026 | The first Citrate Schools deployments: US K-12 public schools running on Citrate Ground, free in perpetuity. |
| Mainnet | Specified, Q1 2027 | The production network. Chain id 40204 carries forward from testnet; it is permanent. |

The chain id does not change between testnet and mainnet. 40204 is canonical and permanent, so addresses,
tooling, and integrations you build against testnet carry over.

## Design rationale

We sequence pilots ahead of mainnet on purpose. Citrate is built for institutions that cannot move their
data, and the only honest way to prove on-premise sovereignty works is to run it inside real schools before
we ask anyone to depend on the production network. The pilots are the evidence; mainnet is what they earn.

## Access and canon

Public. This page states the mainnet target (Q1 2027) and the pilot window. Where a phase is still ahead of
us it is labeled Specified, and where it is live it is labeled Implemented, so the status is never
overstated.

## Source and verification

The chain id (40204, permanent) is verified against `citrate-chain` at `9d5959e` (`cli/src/config.rs`). The
timeline reflects the program plan and is stated as a target, not a recorded fact. Status: Specified, with
the testnet phase Implemented.
