---
title: Citrate Wallet (browser extension)
codex_slug: /apps/wallet-extension
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-wallet-extension/README.md
surfaces: [APP-wallet-ext]
audited_against_sha: 543017d
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Wallet (browser extension)

> A Manifest V3 browser wallet for the Citrate testnet, create an account, sign transactions and
> messages with explicit per-action approval, and connect to dApps through an EIP-1193 provider.

## Overview

Citrate Wallet is a Chrome/Edge/Brave extension (Manifest V3) that holds a key, signs, and exposes a
standard `window.ethereum` provider so web dApps can talk to it. Keys are generated in the background
service worker and encrypted at rest; **every transaction and signature requires an explicit approval
popup, there is no silent signing.**

Mental model: the same role MetaMask plays, scoped to the Citrate SALT testnet (chain id `40204`).

> **Status, prerelease (v0.2.0), audit pending.** This is **Tier-1** software that requires a full
> external audit before v1.0.0. Use small values only on the testnet. The ERC-4337 smart-wallet path is
> explicitly marked pre-audit.

## Who it's for

- People who want a browser wallet to use Citrate dApps (like Citrate Chat).
- Developers integrating a Citrate-aware EIP-1193 provider into a web app.

## Key features & screens

Source: `manifest.json`, `js/`, `popup/`.

| Surface | What it does | Path |
|---|---|---|
| Background service worker | Key management, signing, dApp approval gates, RPC forwarding | `js/background.js` |
| Provider (MAIN world) | Injects `window.ethereum` / `window.citrate`; EIP-6963 announce | `js/provider.js` |
| Content script (ISOLATED) | Validates + relays page requests across the trust boundary | `js/content.js` |
| Popup | Account management, send/receive, settings | `popup/index.html`, `popup/js/app.js` |
| Connect dialog | Per-origin connection approval (`eth_requestAccounts`) | `popup/connect.html` |
| Transaction/message dialog | Per-action approval, fail-closed with timeout | `popup/confirm-tx.html` |

## How to use

### Accounts

- **Create:** choose "Create New Wallet", set a password. The worker generates a 32-byte key, derives
  the address (keccak256 → EIP-55), and stores it encrypted with **AES-256-GCM under an Argon2id v2 KDF**
  in `chrome.storage.local` (`js/background.js`, `js/crypto.js`).
- **Unlock:** your password is verified by trial-decrypting an account; on success a short-lived session
  ticket is kept in memory so you stay unlocked until the worker is killed or you lock.
- **Import:** mnemonic/seed-phrase import is **not supported** in this version, you can only create new
  accounts in the extension. Keep your password safe; there is no seed-phrase recovery UI.

### Signing

- `eth_sendTransaction` and `personal_sign` each open a confirmation popup showing the full `from`/`to`,
  amount, gas, and any calldata. You approve or reject (or it times out and is rejected). The decrypted
  key is zeroed immediately after signing.
- `eth_sign` is **disabled** (phishing primitive). `eth_signTypedData` (EIP-712) is **not yet supported**.

### EIP-1193 provider

The page-side provider (`js/provider.js`) supports `eth_chainId`, `eth_accounts`,
`eth_requestAccounts`, `eth_sendTransaction`, `personal_sign`, and read methods proxied to the RPC
(`eth_call`, `eth_getBalance`, `eth_blockNumber`, etc.). `wallet_sendUserOperation` (ERC-4337 v0.7 via
the bundler) exists but is **pre-audit, small-value only**. The chain is fixed to `40204`, so
chain-switch calls are no-ops.

## Tutorials

- **[Install the wallet extension](/apps/tutorials/install-the-wallet-extension)**, runnable, step-by-step
  download/verify/load-unpacked.

## Security & access

**Tier: public.** A wallet a developer or user needs to interact with the network, open by design.

**No secrets in this doc or repo.** There are no `.env` files or committed keys; the only sensitive
values (your password, your private key) are runtime-only and stored encrypted. Public RPC endpoints in
the manifest CSP are not secrets.

Notable safety properties: fail-closed approval on every signing path (verified by a CI tripwire);
key-material zeroization; an RPC allow-list that is a subset of the manifest CSP `connect-src`; ISOLATED
vs MAIN world trust boundary so the page can never reach keys directly.

## Source & verification

- **Repo:** `citrate-wallet-extension`
- **Audited against SHA:** `543017d`
- **Key paths:** `manifest.json`, `js/background.js`, `js/provider.js`, `js/content.js`, `js/crypto.js`,
  `AUDIT_TIER.md`, `README.md`

### Honest status

Prerelease (v0.2.0); **Tier-1 external audit required before v1.0.0**. SECREM-02 remediation is
complete. Known gaps: no seed-phrase import, no EIP-712 typed-data signing, the ERC-4337 smart-wallet
path is pre-audit (small-value only), and the WASM crypto binary is built and signed per release rather
than committed to the repo.
