---
title: Install the Citrate Keyring extension
codex_slug: /apps/tutorials/install-the-wallet-extension
tier: public
org_scope: ~
source_kind: authored
source: citrate-wallet-extension/README.md, .github/workflows/release.yml, manifest.json
surfaces: [APP-wallet-ext]
audited_against_sha: 543017d
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This walks you through loading the Citrate Keyring extension into Chrome, Edge, or Brave as an unpacked
extension and creating your first account. It targets Citrate Network, chain id `40204`. The software is
prerelease and pre-audit, so use small testnet values only, and note there is no recovery phrase for the
account you create here; if you forget the password, the account is gone.

## What it is

The Citrate Keyring extension ships as a release archive of the Manifest V3 source plus an Argon2
WebAssembly module that the project builds per release with `wasm-pack` (`wasm/build.md`). You download the
archive, verify its checksum, unzip it, and load it from disk with the browser's developer mode. There is
no JavaScript build step on your side.

## How to use it

You will need a Chromium-based browser, Chrome, Edge, or Brave, and the two release files from the
project's GitHub Releases: the archive `citrate-wallet-extension.zip` and its checksum
`citrate-wallet-extension.zip.sha256`.

### Step 1, download the release

Download `citrate-wallet-extension.zip` and `citrate-wallet-extension.zip.sha256` from GitHub Releases into
the same directory.

### Step 2, verify the checksum

```bash
shasum -a 256 -c citrate-wallet-extension.zip.sha256
```

The output should end in `: OK`. If it does not match, stop and download again.

### Step 3, unzip to a stable location

```bash
mkdir -p ~/citrate-wallet-extension
unzip citrate-wallet-extension.zip -d ~/citrate-wallet-extension
```

Keep this folder. The browser loads the extension from disk, so do not move or delete it afterward.

### Step 4, open the extensions page

Open the extensions page for your browser:

- Chrome: `chrome://extensions/`
- Edge: `edge://extensions/`
- Brave: `brave://extensions/`

### Step 5, enable developer mode

Turn on the Developer mode toggle, usually at the top right of the page.

### Step 6, load the unpacked extension

Click Load unpacked and select the unzipped folder, the one that contains `manifest.json`. The extension
appears in the list with its icon.

### Step 7, create your first account

1. Open the extension popup.
2. Choose `Create New Wallet` and set a strong password.
3. The extension generates your address and stores it encrypted, AES-256-GCM under an Argon2id key
   derivation. There is no recovery phrase in this version, so the password is the only way back in.

### Step 8, confirm it works

The popup shows your new address and Citrate Network, chain id 40204. Open a Citrate page, for example
[Citrate Chat](/apps/chatbot). The page discovers the provider and asks to connect; a per-origin
connection window opens. Approve it, then confirm that any transaction or message after that opens its own
approval window. Nothing is signed without your approval.

## Reference

| Item | Detail | Source |
|---|---|---|
| Distribution | Release archive plus checksum, loaded unpacked in developer mode | `.github/workflows/release.yml` |
| Build step | None on your side; the Argon2 WebAssembly is built per release | `wasm/build.md` |
| Network | Fixed to Citrate Network, chain id 40204 | `manifest.json`, `js/provider.js` |
| Account storage | AES-256-GCM under Argon2id, in `chrome.storage.local` | `js/crypto.js`, `js/background.js` |

The full account model, the provider methods, and the linked smart-account path are documented on
[the Citrate Keyring extension](/apps/wallet-extension).

## Design rationale

The extension is loaded unpacked from a checksum-verified archive rather than from a store so the exact
files you run are the ones you verified, which matters for a key-holding surface that is still pre-audit.
The checksum step is the point of the tutorial, not a formality: it is what lets you trust the archive
before the browser ever reads it.

## Failure modes

- The extension will not load: make sure you selected the folder that contains `manifest.json`, not the
  archive itself or a parent folder.
- A page does not see the account: reload the page after loading the extension; the provider injects at
  document start, so a page opened earlier will not have it.
- The checksum does not match: do not load the folder. Download the release files again.

For deeper troubleshooting, signing-path behaviour, and recovery, see
[the Citrate Keyring extension](/apps/wallet-extension), [passkeys](/aa/passkeys), and
[guardians](/aa/guardians). To drive the same account from code, see the [JavaScript SDK](/sdks/js).

## Access and canon

Public. Nothing here is a secret. The password and the key you create are held on your device. The hosts
the extension reaches are public endpoints in its manifest. The software is prerelease and pre-audit; the
account created here has no recovery phrase, so keep the password safe.

## Source and verification

- Source repo: `citrate-wallet-extension`, audited against SHA `543017d`.
- Files read: `README.md`, `.github/workflows/release.yml`, `manifest.json`, `js/background.js`,
  `js/crypto.js`, `js/provider.js`, `wasm/build.md`.
- Status: Implemented (pre-audit), version 0.2.0. The download, verify, load-unpacked, and account-creation
  steps reflect the release workflow and the source as built. The account created here has no recovery
  phrase.
