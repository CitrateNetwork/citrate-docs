---
title: Run the Citrate Keyring desktop app
codex_slug: /apps/tutorials/run-the-desktop-wallet
tier: public
org_scope: ~
source_kind: authored
source: citrate-native/README.md, Cargo.toml, rust-toolchain.toml, gui/citrate_native/ui/
surfaces: [APP-native]
audited_against_sha: bc0e8ba
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This builds the Citrate Keyring desktop app from source with Cargo and opens it for the first time. It uses
only the build steps that exist in the `citrate-native` repository. The commands take a few minutes plus a
first-time Rust compile, which can take a while.

## What it is

The desktop app is a Cargo workspace; you build it and run the default member. The full screen map is on
[the Citrate Keyring desktop app](/apps/native). This tutorial gets you from a clean checkout to an open
window with an account.

## How to use it

### Step 1, install the Rust toolchain

The repository pins a stable toolchain in `rust-toolchain.toml`, so rustup picks it up automatically.
Install rustup if you do not have it:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Step 2, set up GitHub SSH access

The build pulls chain crates over SSH from sibling repositories. Per the README, make sure your personal
SSH key is on GitHub and you have read access to `citrate-chain`, `citrate-learning-center`, and
`citrate-agent-runtime`; organization membership grants it. Check the key works:

```bash
ssh -T git@github.com
```

### Step 3, install the platform build tools

Install a C and C++ toolchain and the system libraries Slint and `rocksdb` need: `build-essential`,
`cmake`, and `clang` on Linux, or the Xcode command-line tools on macOS.

### Step 4, get the repository

```bash
git clone git@github.com:CitrateNetwork/citrate-native.git
cd citrate-native
```

### Step 5, build

The default build target is `citrate-native`, the workspace default member in `Cargo.toml`:

```bash
cargo build --release
```

The first build compiles the whole dependency tree, the chain crates, Slint, and `rocksdb`, so it takes
several minutes. For a faster, unoptimized iteration build, drop `--release`. If you hit a type-mismatch
error at a chain-API boundary, it is the known double-fetch issue documented in the README, a chain crate
pulled through both an SSH host alias and plain `github.com`. It is tracked as a planned follow-up.

### Step 6, run

```bash
cargo run --release -p citrate-native
```

`-p citrate-native` is explicit, but since it is the default member, plain `cargo run --release` launches
the same application.

### Step 7, create your account on first launch

The onboarding flow opens (`gui/citrate_native/ui/onboarding/onboarding.slint`):

1. Welcome, continue past the intro.
2. Create a password of at least eight characters. This encrypts your account locally and never leaves
   your device.
3. Provisioning, the app generates and shows your recovery phrase. Write it down and store it offline.
4. Security confirmation, acknowledge that you backed up the phrase.

If you already have an account, use the import option to restore from a recovery phrase or a key instead.

### Step 8, look around

You land in the app shell with the sidebar (`ui/shell/sidebar.slint`). Try `Wallet` for your balance and
transactions, and `DAG Explorer` to read the BlockDAG and open a transaction. When you reopen the app it
will be locked; unlock it with the password from step 7.

## Reference

| Step | Command or file | Source |
|---|---|---|
| Toolchain | `channel = "stable"` | `rust-toolchain.toml` |
| Build | `cargo build --release` | `README.md`, `Cargo.toml` |
| Run | `cargo run --release -p citrate-native` | `README.md`, `Cargo.toml` default member |
| Onboarding | Welcome, password, provisioning, confirmation | `ui/onboarding/onboarding.slint` |
| Shell | Sidebar groups and screens | `ui/shell/sidebar.slint` |

The DAG view here is a local reader; the shared public explorer is [CitrateScan](/apps/explorer). The
account abstraction the app shares with the browser extension is covered under [passkeys](/aa/passkeys)
and [guardians](/aa/guardians), and you can drive the same account from code with the
[JavaScript SDK](/sdks/js).

## Design rationale

The app is built from source rather than shipped as a signed binary at this stage because it is pre-1.0 and
its chain dependencies move with the network. Building it yourself means the account, the node reader, and
the marketplaces all run from the same checked-out tree, with nothing fetched at runtime that you did not
compile.

## Failure modes

- A native window does not open, or the build fails at link time: confirm the C and C++ toolchain and the
  Slint and `rocksdb` system libraries from step 3 are installed.
- A type mismatch at a chain-API boundary: this is the README's double-fetch issue from step 5, a chain
  crate pulled twice through different URL conventions. It compiles today and is tracked as a planned
  follow-up.
- The app opens locked on a later run: that is expected. Unlock with your password. There is no
  server-side recovery, the phrase from onboarding is the only backup.

## Access and canon

Public. Nothing here is a secret. Your password and recovery phrase are created on your machine; never
paste your recovery phrase into a website, a chat, or a file you do not control. Building requires your own
GitHub SSH access to the sibling repositories; no shared credential is needed or embedded here.

## Source and verification

- Source repo: `citrate-native`, audited against SHA `bc0e8ba`.
- Files read: `README.md` Quick start (the build and run commands), `Cargo.toml` (default member),
  `rust-toolchain.toml` (toolchain), `gui/citrate_native/ui/onboarding/onboarding.slint` (onboarding steps),
  `gui/citrate_native/ui/shell/sidebar.slint` (the shell).
- Status: Implemented, version 0.4.0, pre-1.0. The build and run commands and the onboarding steps reflect
  the repository as built. The double-fetch caveat is an open, README-documented issue.
