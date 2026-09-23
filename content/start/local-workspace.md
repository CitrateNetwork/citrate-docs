---
title: Set up the federation locally
codex_slug: /start/local-workspace
tier: public
org_scope: ~
source_kind: authored
source: .github/setup.sh, .github/AGENTS.md
surfaces: [START-local-workspace]
status: Implemented
created: 2026-09-23T00:00:00Z
author: Citrate team
---

Get every public Citrate repository onto your machine in one command, in a single workspace
your IDE can open all at once. This is the same folder layout the maintainers use, so git
integration, cross-repo references, and the reusable CI all line up.

## One command

You need the [GitHub CLI](https://cli.github.com) (`gh`), authenticated with `gh auth login`,
and `git`. Then:

```sh
mkdir -p citrate-labs && cd citrate-labs
gh repo clone CitrateNetwork/.github
bash .github/setup.sh
```

That clones and stars every public repository into `citrate-labs/`. To contribute (fork each
repo to your account, clone your fork, and set the `upstream` remote) run `bash .github/setup.sh fork`
instead. Set `NO_STAR=1` to skip starring, or `SHALLOW=1` for faster history-light clones.

The script reads the live list of public repositories, so it always matches what is published
and never touches private ones.

## What you get

```
citrate-labs/
  .github/            org profile, reusable CI, AGENTS.md
  citrate-chain/      the L1: GhostDAG consensus, EVM/LVM, contracts, ZK (chain 40204)
  citrate-core/       the desktop node app
  citrate-sdk-js/  citrate-sdk-python/  citrate-sdk-marketplace/
  citrate-docs/       this handbook, plus LOCAL_STACK.md
  ...                 every other public repo
```

Open the `citrate-labs/` folder in your IDE and each repository is its own git root.

## Build and audit

- Bring the stack up with `citrate-docs/LOCAL_STACK.md`; a local devnet is `citrate devnet`.
- Per repo: read its `README.md` and `AUDIT_TIER.md`, then run its tests: `cargo test` (Rust),
  `npm test` (TypeScript), `forge test` (Solidity), `pytest` (Python).

## For AI agents

`.github/AGENTS.md` is the agent-facing brief: it carries this setup, the open-core licensing
rules, the DCO sign-off requirement, and how to build and audit each repo. Point your agent at
it, or at this page, and it can set the whole workspace up and start reviewing code.

## Licensing and contributing

Citrate is open-core: the chain, SDKs, docs, explorer, and agent runtime are Apache-2.0; the
desktop app and monetized services are source-available under BUSL-1.1. Sign every commit
(`git commit -s`), and a merged, qualified contribution earns a free or refunded membership.
See [`CONTRIBUTING.md`](https://github.com/CitrateNetwork/.github/blob/main/CONTRIBUTING.md).
