---
title: The Citrate Keyring desktop app
codex_slug: /apps/native
tier: public
org_scope: ~
source_kind: authored
source: citrate-native/README.md, Cargo.toml, gui/citrate_native/ui/
surfaces: [APP-native]
audited_against_sha: 6416447
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Citrate Keyring desktop app is a native desktop application that holds a Citrate Keyring account and,
in the same window, gives you a reader for the BlockDAG. It is for anyone who wants the account and the
network in a real desktop window rather than a browser tab.

## What it is

The app is built with Slint, a native Rust user-interface toolkit, so it opens as a desktop window with a
local service layer behind it that talks to the chain. It is a Cargo workspace with three crates
(`Cargo.toml`): `gui/citrate_ui_kit`, the shared interface kit; `gui/citrate_native`, the desktop
application and its screens, which is the default build target; and `gui/citrate_desktop_app`, the backend
service layer that holds the chain client, the account, the mempool, and the RPC.

The window is organized around a left sidebar with grouped navigation (`gui/citrate_native/ui/shell/
sidebar.slint`). A regular account sees the `BLOCKCHAIN`, `AI`, `DEVELOPER`, `LEARNING`, and `OPERATIONS`
groups. An
account whose identity is a school operator, a CMOSuperAdmin, additionally sees a CMO group for
administering a charter or management organization. The mental model is one encrypted local identity that
opens onto your account, a reader for the network, and an on-ramp to the compute and learning marketplaces.

The account is local-first. It is encrypted with a password you choose, and the password never leaves the
device. The DAG view here is a local reader against your own node; the full public explorer is
[CitrateScan](/apps/explorer), and the account abstraction it shares with the browser extension is covered
under [passkeys](/aa/passkeys) and [guardians](/aa/guardians).

## How to use it

You build the app from source and run it. The short version is below; the full walk-through, including the
prerequisites, is in [run the Citrate Keyring desktop app](/apps/tutorials/run-the-desktop-wallet).

1. Install a stable Rust toolchain. The repository pins `channel = "stable"` with `rustfmt` and `clippy`
   in `rust-toolchain.toml`, so rustup picks it up.
2. Make sure your personal GitHub SSH key can read the sibling repositories `citrate-chain`,
   `citrate-learning-center`, and `citrate-agent-runtime`. The build pulls chain crates over SSH, and
   organization membership grants the access.
3. Install a C and C++ toolchain and the system libraries Slint and `rocksdb` need for your platform.
4. Build and run:

```bash
cargo build --release
cargo run --release -p citrate-native
```

`citrate-native` is the workspace default member, so `cargo run --release` without `-p` launches the same
application. For a faster iteration loop, omit `--release`.

5. On first launch the onboarding flow opens: a welcome screen, a password of at least eight characters, a
   provisioning step that generates and shows your recovery phrase, and a confirmation that you backed the
   phrase up. After that the app shell opens to the sidebar. If you already have an account, use the import
   option to restore from a recovery phrase or a key.

## Reference

The screens below are the Slint views under `gui/citrate_native/ui/`. Sidebar labels are quoted from
`ui/shell/sidebar.slint`.

| Group | Screen | What it does | Source |
|---|---|---|---|
| Onboarding | Onboarding | Welcome, password, provisioning with a recovery phrase, confirmation | `ui/onboarding/onboarding.slint` |
| Shell | Lock screen | Locks the app behind your password between sessions | `ui/shell/lock_screen.slint` |
| `BLOCKCHAIN` | Dashboard | The account and network overview | `ui/dashboard/dashboard.slint` |
| `BLOCKCHAIN` | `Wallet` | Balances, transaction history, import | `ui/wallet/wallet.slint` |
| `BLOCKCHAIN` | DAG Explorer | A local reader of the BlockDAG with a transaction detail modal | `ui/dag/dag_explorer.slint` |
| AI | Chat | A chat view from the shared interface kit | `ui/app.slint` |
| AI | Models | Browse and manage models | `ui/models/models.slint` |
| Developer | Compute | Opt-in compute sharing, detects your hardware, shows provider status | `ui/compute/compute.slint` |
| Developer | Files | File storage entries | `ui/storage/storage.slint` |
| Learning | Learn | Contribution pools, your stake, and earnings in SALT | `ui/learning/learning.slint`, `ui/learning/edu_panel.slint` |
| Operations | Agent Center | An activity trail and an approvals queue for agent operations | `ui/operations/operations_view.slint` |
| Settings | Settings | Environment, AI config, system health, peers, node control, knowledge graph, integrations, appearance, and a danger zone | `ui/settings/` |
| CMO | Dashboard, Tenancy, Compliance | School administration, role-gated to CMOSuperAdmin | `ui/cmo/` |

The send dialog (`ui/wallet/send_dialog.slint`) takes a to address and an amount in SALT, shows a review
of recipient, amount, and gas, then sends on Confirm & Send. When your account is linked to a Citrate
Keyring smart account, a sponsored toggle appears; with it on, the send goes from the smart account and
the gas line reads "Sponsored by Citrate" instead of a gas figure. This is the EW-S1 sponsored-send work
and it shows only when a linked smart account is available.

## Design rationale

The app is native rather than a web page so the account, the node reader, and the marketplaces share one
local process and one encrypted identity, with the data staying on the machine. The DAG view is a local
reader rather than a second public explorer because the device already has a node to read; when you want
the shared, queryable view of the network you go to [CitrateScan](/apps/explorer). The marketplace and
school-administration screens are honest about reach: they say plainly when a contract is not reachable
and show empty states rather than inventing numbers, which is why several CMO aggregates are stubbed
behind an environment flag until their wiring lands.

## Failure modes

- The account is encrypted with your password, and the password never leaves the device. There is no
  server-side recovery; the recovery phrase shown at provisioning is the backup. Write it down and store
  it offline.
- The app locks between sessions. Reopening it lands on the lock screen, and you unlock with your password.
- The Settings danger zone performs destructive actions. Read the in-app warnings before using it.
- The build pulls chain crates over SSH using per-host aliases, while a few sibling repositories still use
  plain `github.com`. Cargo can then fetch a chain crate such as `citrate-wallet-core` twice and treat the
  copies as different sources. It compiles today; if you hit a type mismatch at a chain-API boundary, this
  double-fetch is the likely cause. A Sprint 1 follow-up normalizes the URLs.
- The CMO aggregates are demo-stubbed behind the `CITRATE_CMO_DEMO` environment flag in version 1. Treat
  those numbers as illustrative until the wiring lands.

## Access and canon

Public. This is an end-user guide to the desktop account and its screen map. No keys, recovery phrases,
private endpoints, or credentials appear here. The account password and the recovery phrase are created
and held on your device. Building from source uses your own GitHub SSH access to the sibling
repositories; the CI deploy keys named in the README are operator infrastructure, not user-facing, and
are not reproduced here. The CMO screens are role-gated to CMOSuperAdmin identities.

## Source and verification

- Source repo: `citrate-native`, audited against SHA `6416447`.
- Files read: `README.md`, `Cargo.toml`, `rust-toolchain.toml`,
  `gui/citrate_native/ui/shell/sidebar.slint`, `ui/app.slint`, `ui/onboarding/onboarding.slint`,
  `ui/wallet/wallet.slint`, `ui/wallet/send_dialog.slint`, `ui/dag/dag_explorer.slint`,
  `ui/compute/compute.slint`, `ui/learning/learning.slint`, `ui/cmo/`, `ui/operations/operations_view.slint`,
  `ui/settings/`, `gui/citrate_native/src/main.rs`, `gui/citrate_native/tests/e2e_wallet.rs`.
- Status: Implemented, version 0.4.0, pre-1.0. Account creation, import from a recovery phrase or key,
  the lock screen, send with the sponsored toggle, and the DAG reader are Implemented and covered by
  end-to-end tests. Some marketplace and CMO aggregates are Specified, scaffolded or demo-stubbed as noted.
  Not externally certified.
