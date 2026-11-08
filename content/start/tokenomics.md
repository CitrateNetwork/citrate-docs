---
title: Tokenomics status
codex_slug: /start/tokenomics
tier: public
org_scope: ~
source_kind: authored
source: Citrate owner decision 2026-10-27
surfaces: [START-tokenomics]
status: Specified
created: 2026-10-27T00:00:00Z
branch: docs/tokenomics-not-final
author: Citrate team
tokenomics_notice: true
---

Tokenomics are not yet determined. This page says what that means for the rest of these docs, so that a
figure you read on another page is read as what it is: a value in the current testnet code, not a decision.

## What it is

The network economics of Citrate are not yet determined. That covers the supply, the distribution, the
rewards, the emissions, and the fees, and everything that follows from them, such as staking requirements,
bonds, grants, slashing penalties, and how any of these change over time.

Testnet SALT has no cash value. It exists so that the testnet can settle work, charge for gas, and exercise
the staking, reward, and slashing code paths. Nothing in these docs is an offer of SALT or a promise of
value.

The parameters will be finalized and published before mainnet. Until then, every number on a page about
SALT, rewards, staking, supply, or fees describes the current testnet code, and any of them may change.

## How to use it

- **Read figures as testnet values.** Where a page gives a supply cap, a reward split, a halving interval, a
  minimum stake, a fee, or a penalty, it is quoting a constant or default in the current source. It is a
  proposed value, not a final one.
- **Build against the code, not the number.** Read live values over JSON-RPC (see the
  [chain RPC reference](/chain/rpc)) rather than hard-coding a figure from these pages.
- **Look for the notice.** Every docs page that discusses SALT, rewards, staking, supply, fees, or related
  terms shows a notice at the top that links here. A test in this repository fails CI if a page that uses
  those terms is added without it.

## Reference

The current testnet parameters are documented on these pages, each with its source file in
`citrate-chain`:

| Topic | Page |
|---|---|
| Supply, block rewards, halving schedule | [Network economics](/chain/economics) |
| Wrapped SALT, liquid staking, treasury contracts | [Economics contracts](/contracts/economics) |
| What reaches a node operator, reputation, slashing | [Rewards, reputation, and slashing](/operators/rewards) |
| Genesis parameters | [Chain parameters and genesis](/chain/genesis) |

## Access and canon

Public. This page is the single statement of the status of network economics in these docs; other pages
link here rather than restating it. It will be updated when the parameters are finalized.

## Source and verification

- Source: Citrate owner decision of 2026-10-27, that SALT and rewards content stays in the documentation
  with a clear statement that tokenomics are not yet determined.
- Status: Specified. The final parameters are not yet determined and will be published before mainnet.
