---
title: Install the Citrate Wallet extension
codex_slug: /apps/tutorials/install-the-wallet-extension
tier: public
org_scope: ~
source_kind: authored
source: citrate-wallet-extension/README.md
surfaces: [APP-wallet-ext]
audited_against_sha: 543017d
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Install the Citrate Wallet extension

> Download, verify, and load the Citrate Wallet (Manifest V3) into Chrome, Edge, or Brave as an
> unpacked extension, then create your first account.

This is a runnable tutorial. It targets the **Citrate SALT testnet** (chain id `40204`).

> **Heads up — prerelease software (v0.2.0), audit pending.** Use small testnet values only. There is
> **no seed-phrase recovery** — if you forget your password you lose the account.

## Prerequisites

- Chrome, Edge, or Brave (Chromium-based).
- The release ZIP `citrate-wallet-extension.zip` and its checksum `citrate-wallet-extension.zip.sha256`
  from the project's GitHub Releases.

There is **no build step** — the extension ships as source files plus a prebuilt, signed WASM crypto
binary (see `.github/workflows/release.yml`).

## Steps

### 1. Download the release

Download `citrate-wallet-extension.zip` and `citrate-wallet-extension.zip.sha256` from GitHub Releases.

### 2. Verify the checksum

```bash
# macOS / Linux — run in the download directory
shasum -a 256 -c citrate-wallet-extension.zip.sha256
```

Expected output ends in `: OK`. If it does not match, stop and re-download.

### 3. Unzip to a stable location

```bash
mkdir -p ~/citrate-wallet-extension
unzip citrate-wallet-extension.zip -d ~/citrate-wallet-extension
```

Keep this folder — the browser loads the extension from disk, so don't delete or move it afterward.

### 4. Open the extensions page

- Chrome: `chrome://extensions/`
- Edge: `edge://extensions/`
- Brave: `brave://extensions/`

### 5. Enable Developer mode

Toggle **Developer mode** (top-right).

### 6. Load unpacked

Click **Load unpacked** and select the unzipped folder (the one containing `manifest.json`). The
**Citrate Wallet** extension should appear with its icon.

### 7. Create your first account

1. Open the extension popup.
2. Choose **Create New Wallet** and set a strong password.
3. Your address is generated and stored encrypted (AES-256-GCM under an Argon2id v2 KDF). Note: there is
   no seed phrase to back up in this version — your password is the only way in.

## Verify it works

- The popup shows your new address and the network as **Citrate SALT testnet (40204)**.
- Visit a Citrate dApp (e.g. Citrate Chat); it should detect the provider (`window.ethereum`) and prompt
  a per-origin **connection approval** popup. Approve it, then confirm that any transaction or signature
  triggers its own approval dialog — there is no silent signing.

## Troubleshooting

- **Extension errors / won't load:** make sure you selected the folder containing `manifest.json`, not
  the ZIP or a parent folder.
- **dApp doesn't see the wallet:** reload the dApp page after loading the extension; the provider injects
  at document start.

## Next steps

- Read the full **[Citrate Wallet](/apps/wallet-extension)** reference for accounts, signing, and the
  EIP-1193 method list.

## Source & verification

- **Repo:** `citrate-wallet-extension` · **SHA:** `543017d`
- **Key paths:** `manifest.json`, `.github/workflows/release.yml`, `js/background.js`, `README.md`
