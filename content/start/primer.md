---
title: A primer on the mental models
codex_slug: /start/primer
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain consensus + economics + keyring
surfaces: [START-primer]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Five ideas make the rest of Almanac click. If your intuition comes from a single-chain world, these are the
places it needs to bend. Read [what Citrate is](/start/what-is-citrate) first if you have not.

## What it is

A short tour of the concepts the deeper pages assume. Each one ends with a pointer to where it is treated
in full.

### Blue score, not height

On a single-parent chain, "block N" is unambiguous. On a BlockDAG, a block can name several parents, so
height alone cannot order the ledger.

- **Height** is roughly how many layers deep a block sits. It is useful, but it is not the ordering key.
- **Blue score** is the ordering key GhostDAG uses: the cumulative count of a block's blue ancestors, the
  honest-majority-consistent set picked out by the k-cluster rule (k = 18). The tip with the highest blue
  score wins.

Blue score is the DAG's clock. When you read `citrate_getDagStats`, the field that tells you the head is
`maxBlueScore`, not `height`. Full detail under [Citrate Network](/chain/consensus).

### Finality by depth

Citrate finalizes by depth, not by a single special block. A block is final once it sits 100 blocks
(`finality_depth`) behind the selected tip, and any reorg that would rewrite a finalized block is rejected
when the block is admitted. There is a BFT checkpoint mechanism layered on top, but depth is the everyday
rule: the deeper a block, the more final it is, and past depth 100 it cannot be reorged. See
[finality](/chain/consensus#finality).

### Merge parents

A block names one **selected parent**, the place on the chain it builds on, plus zero or more **merge
parents**, other tips it folds into the order. Merging is how the DAG stays one ledger instead of forking:
a block absorbs its sibling tips rather than orphaning them. Selected parent is where you stand; merge
parents are the siblings you are folding in. The block's mergeset is then interleaved into the canonical
order. See [Citrate Network](/chain/consensus).

### Accounts without a seed phrase

Citrate accounts live in **Citrate Keyring**. An account is a smart contract, and you sign in with a
passkey (WebAuthn over P-256) or an existing key, so there is no seed phrase to lose. Transactions are sent
as user operations through a bundler, and a sponsor contract can pay the fee, so you can transact with no
SALT in hand. Recovery is by guardians, two to seven of a set you choose, and Citrate is never one of your
guardians. The account is a contract, the key is a passkey, and someone else can cover the fee. See
[Citrate Keyring](/aa/passkeys), [sponsorship](/aa/paymaster), and [guardians](/aa/guardians).

### SALT, the unit you count in

SALT has 18 decimals and a one-trillion supply cap, and it settles fees, block rewards, and staking. Amounts
in the API are integers in the smallest unit, where 10^18 is one SALT, and supply is minted minus burned,
held under the cap. SALT measures the work the network does; it is not a product to hold. See
[economics](/chain/economics).

## How to use it

Put the five together and a transaction's life reads cleanly. You sign a user operation with a passkey, a
bundler submits it, the execution layer runs it (often alongside others, in parallel), and it lands in a
block that names a selected parent and maybe some merge parents. GhostDAG assigns the block a blue score
and places it in the total order. Once the block is 100 deep, it is final. The fee and any reward are
denominated in SALT. If you can hold that sentence in your head, the rest of Almanac will read easily.

## Reference

| Idea | The key fact | Where it is treated in full |
|---|---|---|
| Blue score | ordering key; `maxBlueScore` is the head | [consensus](/chain/consensus) |
| Finality | final at depth 100, no reorg past it | [consensus, finality](/chain/consensus#finality) |
| Merge parents | one selected parent, many merge parents | [consensus](/chain/consensus) |
| Citrate Keyring | smart-contract account, passkey, sponsored fees | [Citrate Keyring](/aa/passkeys) |
| SALT | 18 decimals, 1T cap, settles work | [economics](/chain/economics) |

## Access and canon

Public. These are conceptual explainers only, with no secrets, keys, or private endpoints. The proofs
behind GhostDAG and finality are academic-tier and live on the linked Citrate Network pages.

## Source and verification

The numbers (k = 18, finality depth 100, SALT 18 decimals and 1T cap, chain id 40204) are verified against
`citrate-chain` at `9d5959e`: `core/consensus/src/types.rs` and `core/api/src/economics_rpc.rs`, surfaced
through the [consensus](/chain/consensus) and [economics](/chain/economics) pages. Status: Implemented
(testnet).
