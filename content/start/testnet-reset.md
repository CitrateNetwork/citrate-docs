---
title: Notice for developers, the testnet will reset
codex_slug: /start/testnet-reset
tier: public
org_scope: ~
source_kind: authored
source: Owner-approved developer notice (r1007, 2026-11-07)
surfaces: [START-testnet-reset]
audited_against_sha: ~
status: Implemented
created: 2026-11-07T17:30:00Z
author: Citrate team
nav_order: 1
---

The current Citrate testnet (chain ID 40204) will be reset before mainnet. The reset starts a
new chain from a fresh genesis block. Chain ID 40204 stays the same.

## What this means for you

Treat everything on the current testnet as temporary. Contracts you deploy, balances, and
transaction history will not carry over. Keep your source code and deploy scripts, so you can
redeploy after the reset.

A stable release of the testnet on chain ID 40204 is coming. We will say when it is ready for
longer-lived deployments.

## Test SALT

To get test SALT, go to https://faucet.citrate.ai and enter your account address. The faucet
sends 10 test SALT per address every 24 hours. Test SALT is only for testing. After the reset,
request test SALT again from the same faucet.

## When it happens

We will post the reset date on this page and on https://x.com/citratenetwork before it
happens. Questions or problems from your hands-on testing are welcome at
https://github.com/CitrateNetwork.
