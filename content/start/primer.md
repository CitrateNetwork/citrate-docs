---
title: Citrate mental models — a primer
codex_slug: /start/primer
tier: public
org_scope: ~
source_kind: authored
source: codex
surfaces: [START-primer]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate mental models — a primer

> Five ideas that make the rest of the docs click. If you come from a
> single-chain EVM world, these are the places your intuition needs to bend.
> Read [What Citrate is](/start/what-is-citrate) first if you haven't.

## 1. Blue score vs height

On a single-parent chain, "block N" is unambiguous. On a BlockDAG, blocks have
**multiple parents**, so "height" alone can't order them.

- **Height** is roughly "how many layers deep" a block sits — useful, but not the
  ordering key.
- **Blue score** is the GhostDAG ordering key: the cumulative count of a block's
  *blue* ancestors (the honest-majority-consistent set, governed by the
  *k*-cluster rule, `k = 18`). The tip with the **highest blue score** wins.

Mental shortcut: **blue score is the DAG's clock.** When you read
`citrate_getDagStats`, `maxBlueScore` is the value that matters for "what's the
head", not `height`. Full detail: [Consensus](/chain/consensus).

## 2. Finality by depth

Citrate finalizes by **depth**, not by a single magic block. A block is final
once it is buried `finality_depth` (= 100) deep behind the selected tip; reorgs
that would rewrite a finalized block are rejected at admission.

Mental shortcut: **the deeper a block, the more final it is** — and past
`finality_depth = 100` it cannot be reorged. (There's also a BFT checkpoint
mechanism on top, but depth-based finality is the everyday rule.) Detail:
[Consensus → finality](/chain/consensus#finality).

## 3. Merge parents

A block names one **selected parent** (its place on the main chain it builds on)
plus zero or more **merge parents** (other tips it pulls into the order). Merging
is how the DAG stays a *single* ledger instead of forking: a block can absorb
sibling tips rather than orphaning them.

Mental shortcut: **selected parent = where I stand; merge parents = the siblings
I'm folding in.** The block's *mergeset* (itself + merge-parent subtrees) is
interleaved into the canonical order. Detail: [Consensus](/chain/consensus).

## 4. Gasless accounts (smart wallets, no seed phrase)

Citrate ships **ERC-4337 account abstraction**. A user signs in with a **passkey**
(WebAuthn-P256) or an existing EOA and gets a **smart-contract wallet** — no seed
phrase to lose. Transactions are sent as *UserOperations* through a bundler, and
a **paymaster** can sponsor the gas, so a user can transact with zero SALT in
hand. There is no native paymaster opcode; sponsorship is done with an EIP-2771
forwarder + paymaster contract.

Mental shortcut: **the wallet is a contract, the key is a passkey, and someone
else can pay the gas.** Recovery is via guardians (2–7 of N) — and Citrate is
never a guardian. Detail: [Passkeys & AA](/aa/passkeys),
[Paymaster](/aa/paymaster), [Guardians](/aa/guardians).

## 5. SALT (the unit you count in)

**SALT** is the native token: **18 decimals**, **1B supply cap**, used for fees,
block rewards, and staking. Amounts in the API are wei-style integers (10^18 =
1 SALT). Supply = minted − burned, capped at 1B.

Mental shortcut: **SALT is to Citrate what ETH is to Ethereum** — same decimal
convention, hard-capped supply. Detail: [Economics](/chain/economics).

## Putting it together

A transaction's life: you sign a UserOp with a passkey → a bundler submits it →
the LVM executes it (possibly in parallel with others via MVCC) → it lands in a
block that names a selected parent and maybe merge parents → GhostDAG assigns the
block a blue score and places it in the total order → once it's `finality_depth`
deep, it's final. Fees and rewards are denominated in SALT.

## Where to go next

- [Your first 10 minutes](/start/tutorials/your-first-10-minutes) — hands-on.
- [JSON-RPC reference](/chain/rpc) — read the DAG, token, and AI methods.
- [Consensus](/chain/consensus), [Execution (LVM)](/chain/lvm),
  [Economics](/chain/economics) — the deep versions of 1–3 and 5.

## Security & access

Public. Conceptual explainers only — no secrets, keys, or private endpoints. The
academic-tier proofs behind GhostDAG and finality live on the linked chain pages.

## Source & verification

Authored page. The numeric facts (`k = 18`, `finality_depth = 100`, SALT 18 dp /
1B cap, chain id 40204) are verified against the authored
[consensus](/chain/consensus) and [economics](/chain/economics) pages, which in
turn cite `citrate-chain` source. Federation SHA `cd729ed`.
