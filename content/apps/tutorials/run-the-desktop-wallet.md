---
title: Run the Desktop Wallet
codex_slug: /apps/tutorials/run-the-desktop-wallet
tier: public
org_scope: ~
source_kind: authored
source: citrate-native/README.md
surfaces: [APP-native]
audited_against_sha: 6416447
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Run the Desktop Wallet

> Build Citrate Native from source with cargo and open the wallet for the first
> time. ~5 minutes plus a first-time Rust compile (which can take a while).

This tutorial uses only build steps that exist in the `citrate-native` repo
(`README.md` "Quick start"). For the full screen map, see
[Citrate Native](/apps/native).

## Prerequisites

1. **Rust (stable toolchain).** The repo pins `channel = "stable"`
   (`rust-toolchain.toml`); rustup will pick it up automatically. Install rustup
   from <https://rustup.rs> if you don't have it:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **GitHub SSH access** to the sibling repos. Building pulls chain crates over
   SSH; per the README, "ensure your personal SSH key is on GitHub and you have
   read access to the three sibling repos (org membership covers this)." Verify:

   ```bash
   ssh -T git@github.com
   ```

3. **A C/C++ toolchain and platform libraries** that Slint and `rocksdb` need
   (e.g. `build-essential`/`cmake`/`clang` on Linux, Xcode command-line tools on
   macOS).

## Steps

### 1. Get the repo

```bash
git clone git@github.com:CitrateNetwork/citrate-native.git
cd citrate-native
```

### 2. Build

The default build target is `citrate-native` (the workspace `default-members`,
`Cargo.toml`):

```bash
cargo build --release
```

First-time builds compile the whole dependency tree (chain crates, Slint,
`rocksdb`) and will take several minutes. For a faster, unoptimized iteration
build, drop `--release`.

> If you hit a type-mismatch error at a chain-API boundary, it is the known
> double-fetch issue in the README (a chain crate pulled via both an SSH host
> alias and plain `github.com`). It is tracked for a Sprint-1 fix.

### 3. Run

```bash
cargo run --release -p citrate-native
```

`-p citrate-native` is explicit, but since it is the default member, plain
`cargo run --release` launches the same app.

### 4. Create your wallet (first launch)

The onboarding flow opens (`gui/citrate_native/ui/onboarding/onboarding.slint`):

1. **Welcome**, continue past the intro.
2. **Create a password**, at least 8 characters. This encrypts your wallet
   locally and **never leaves your device**.
3. **Wallet provisioning**, the app generates and displays your recovery
   mnemonic. Write it down and store it offline.
4. **Security confirmation**, acknowledge that you have backed up the phrase.

(Already have a wallet? Use the import option to restore from a mnemonic or
private key instead.)

### 5. Look around

You'll land in the app shell with the sidebar
(`ui/shell/sidebar.slint`). Try:

- **Wallet**, your balance and transactions.
- **DAG Explorer**, browse the BlockDAG and inspect a transaction.

When you re-open the app it will be locked; unlock with the password from step 4.

## Verify it worked

- A native window opens (not a browser).
- After onboarding, the **Wallet** screen shows your new account.
- The **DAG Explorer** screen loads block/transaction rows.

## Security notes

- **No secrets in this tutorial.** Your password and mnemonic are created on
  your machine, never paste your mnemonic into any website, chat, or file you
  don't control.
- Building requires *your own* GitHub SSH access; no shared credential is needed
  or embedded here.

## Source & verification

- **Source repo:** `citrate-native`, `README.md` "Quick start" (the build/run
  commands), `Cargo.toml` (default member), `rust-toolchain.toml` (toolchain),
  `gui/citrate_native/ui/onboarding/onboarding.slint` (onboarding steps).
- **Audited against SHA:** `6416447`
  (`git -C citrate-native rev-parse --short HEAD`).
- **Status:** pre-1.0 (`version = 0.4.0`). The double-fetch caveat above is an
  open, README-documented issue.
