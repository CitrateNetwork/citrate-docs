---
title: Citrate Native — Desktop Wallet & DAG Explorer
codex_slug: /apps/native
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-native/README.md
surfaces: [APP-native]
audited_against_sha: 6416447
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Native — Desktop Wallet & DAG Explorer

> A single Slint-native desktop app for the Citrate Network: hold and send SALT,
> explore the BlockDAG, run AI/compute features, and — for school operators —
> administer institutions. For anyone who wants the full Citrate experience as a
> local desktop application rather than a browser tab.

## Overview

Citrate Native is the desktop client for the Citrate Network. It is built with
[Slint](https://slint.dev) (a native Rust UI toolkit), so it runs as a real
desktop window — not a web page — with a local backend service layer that talks
to the chain.

The repo is a Cargo workspace with two crates (`citrate-native/README.md`):

- `gui/citrate_native` (`citrate-native`) — the main Slint desktop application
  (the window, screens, and view logic).
- `gui/citrate_desktop_app` (`citrate-desktop-app`) — the backend service layer
  (chain client, wallet, mempool, RPC, marketplace, learning, edu services).

Everything in the app is organized around a left-hand sidebar with grouped
navigation (`gui/citrate_native/ui/shell/sidebar.slint`). The exact groups you
see depend on your role; a regular user sees Blockchain / AI / Developer /
Learning / Operations, while a school operator (CMOSuperAdmin) additionally sees
the CMO administration group.

Mental model: the app is your **local wallet + a window onto the DAG + an
on-ramp to Citrate's AI, compute, storage, and learning marketplaces**, all
sharing one encrypted local identity.

## Who it's for

- **Everyday users** who want a desktop wallet to hold and send SALT and watch
  the network.
- **Builders / operators** who want to run compute, browse models, use IPFS-style
  file storage, and manage agent operations from one place.
- **School operators (CMO super-admins)** who manage multiple schools, tenancy,
  and compliance from the CMO panels. (Student/teacher day-to-day classroom use
  lives in the separate [Learning Center](/apps/learning-center) app.)

## Install & run

Prerequisites (from `rust-toolchain.toml` and `README.md`):

- A stable Rust toolchain (the repo pins `channel = "stable"` with `rustfmt` and
  `clippy`). Install via [rustup](https://rustup.rs).
- Read access to the sibling `citrate-chain`, `citrate-learning-center`, and
  `citrate-agent-runtime` repos. Local builds use **your personal GitHub SSH
  key** (org membership grants access); the build pulls these crates over SSH.
- A C/C++ toolchain and the system libraries Slint and `rocksdb` need for your
  platform.

Build and run (verbatim from `README.md` "Quick start"):

```bash
cargo build --release
cargo run --release -p citrate-native
```

`citrate-native` is the workspace `default-members` target, so `cargo run`
without `-p` also launches it. For a faster iteration loop, omit `--release`
(dev profile is `opt-level = 0`).

> **Known issue (honest status, from `README.md`).** Some sibling chain crates
> are referenced through SSH host-alias URLs (`github-citrate-chain`) while a few
> repos still use plain `github.com`, so Cargo may fetch a chain crate (e.g.
> `citrate-wallet-core`) twice. It compiles today; a Sprint-1 follow-up will
> normalize the URLs. If you hit a type-mismatch at an API boundary, this is the
> likely cause.

For step-by-step build/run instructions, see the tutorial:
[Run the desktop wallet](/apps/tutorials/run-the-desktop-wallet).

## Key features & screens

The screens below are the Slint views under `gui/citrate_native/ui/`. Sidebar
labels are quoted from `ui/shell/sidebar.slint`.

### Onboarding & account management

- **Onboarding** (`ui/onboarding/onboarding.slint`) — a step flow: Welcome →
  create a wallet-encryption password (min 8 characters, "never leaves your
  device") → wallet provisioning (a mnemonic is generated and shown) → security
  confirmation (acknowledge you backed up the recovery phrase).
- **Lock screen** (`ui/shell/lock_screen.slint`) — the app locks behind your
  password; unlock to access the wallet.
- **Import** — you can also import an existing wallet from a mnemonic or private
  key (`app.slint` exposes `wallet-import-mnemonic` / import-from-key callbacks).

### Wallet & send

- **"Wallet"** (`ui/wallet/wallet.slint`) — account view with balances and
  transaction history.
- **Send dialog** (`ui/wallet/send_dialog.slint`) — enter a TO address and an
  amount in SALT, review (recipient / amount / gas), then **Confirm & Send**.
  There is a toggle to **"Send from smart wallet (gas sponsored by Citrate)"** —
  when enabled, the send is paymaster-sponsored from your linked smart wallet
  (EW-S1 work), so you don't pay gas yourself.

### DAG Explorer

- **"DAG Explorer"** (`ui/dag/dag_explorer.slint`) — a visual view of the
  BlockDAG with transaction rows and a transaction-detail modal. This is the
  "window onto the network" — browse blocks and inspect transactions locally.

### AI

- **"Chat"** — an AI chat view (the shared `ChatView` from the UI kit).
- **"Models"** (`ui/models/models.slint`) — browse/manage AI models.

### Developer (compute, storage)

- **"Compute"** (`ui/compute/compute.slint`) — opt-in GPU/CPU sharing with the
  Citrate **compute marketplace**. Detects your hardware (GPU name, VRAM,
  driver), shows provider-registration status, and lists recent provider
  activity from `ComputeMarketplace` event logs. The UI is honest about whether
  the marketplace contract is reachable.
- **"Files"** (`ui/storage/storage.slint`) — file storage (IPFS-style) entries.

### Learning marketplace

- **"Learn"** (`ui/learning/learning.slint` + `ui/learning/edu_panel.slint`) —
  the learning/contribution marketplace: contribution pools, your stake, and
  earnings claimable from `ContributionAccounting` (shown in SALT). The view
  surfaces the on-chain contract status honestly (e.g. a warning if the
  marketplace contract isn't reachable, "No pools created yet" when empty).

### Operations

- **"Agent Center"** (`ui/operations/operations_view.slint`) — agent operations:
  an activity trail and an approvals queue.

### School administration (CMO)

Visible only when your identity is a **CMOSuperAdmin** (`ui/shell/sidebar.slint`
gates the CMO group). These panels manage a Charter/Management Organization that
oversees multiple schools:

- **CMO "Dashboard"** (`ui/cmo/dashboard.slint`) — aggregate stat cards across
  all schools in the CMO, a per-school table with click-to-switch, and a recent
  CMO-events feed. (Backed by `InstitutionTreeV1` / `ContributionAccounting`;
  several aggregates are stubbed in v1 behind the `CITRATE_CMO_DEMO` env var.)
- **CMO "Tenancy"** (`ui/cmo/tenancy.slint`) — the institution tenancy tree.
- **CMO "Compliance"** (`ui/cmo/compliance.slint`) — a per-school compliance
  matrix.
- Supporting UI: a **school selector** to switch the active school, a
  **school-context banner**, and an **envelope drawer** for institutional
  envelopes.

### Settings

- **"Settings"** (`ui/settings/`) — environment selection, AI config, system
  health, peer connections, node control, knowledge graph, integrations,
  appearance, and a **danger zone** for destructive actions.

## Tutorials

- [Run the desktop wallet](/apps/tutorials/run-the-desktop-wallet) — build the
  app from source with cargo and open the wallet.

## Security & access

- **Tier: public.** This is an end-user guide to a client application a developer
  or user needs to get started — concepts, install, and the screen map. No
  implementation depth that would materially help a competitor clone the network
  is included; that stays in gated material.
- **No secrets here.** This page contains no keys, mnemonics, private endpoints,
  or credentials. The app's encryption password and the generated mnemonic are
  created and stored **on your device** ("never leaves your device", per the
  onboarding copy) — never share or paste your mnemonic anywhere.
- **Local-first identity.** Your wallet is encrypted with a password you choose;
  back up your recovery phrase offline. The "danger zone" in Settings performs
  destructive actions — read the in-app warnings before using it.
- **Build prerequisites are credentials you already hold.** Building from source
  requires *your own* GitHub SSH access to the sibling repos; no shared secret is
  documented or required to be embedded here. CI deploy keys mentioned in the
  README are operator infrastructure, not user-facing, and are not reproduced.
- **CMO panels are role-gated** to CMOSuperAdmin identities and are demo-stubbed
  in v1 behind `CITRATE_CMO_DEMO`; treat aggregate numbers as illustrative until
  the v1 wiring lands.

## Source & verification

- **Source repo:** `citrate-native` (truth lives here; this page is transcluded
  reference, Rule 9).
- **Audited against SHA:** `6416447` (`git -C citrate-native rev-parse --short HEAD`).
- **Primary files audited:** `README.md`, `Cargo.toml`, `rust-toolchain.toml`,
  `gui/citrate_native/ui/shell/sidebar.slint`, `ui/app.slint`,
  `ui/onboarding/onboarding.slint`, `ui/wallet/send_dialog.slint`,
  `ui/wallet/wallet.slint`, `ui/dag/dag_explorer.slint`,
  `ui/compute/compute.slint`, `ui/learning/learning.slint`,
  `ui/cmo/dashboard.slint`, `ui/operations/operations_view.slint`,
  `ui/settings/`.
- **Status:** pre-1.0 (`version = 0.4.0`); some marketplace/CMO surfaces are
  scaffolding/demo-stubbed as noted above. Not certified.
