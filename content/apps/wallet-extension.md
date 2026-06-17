---
title: The Citrate Keyring extension
codex_slug: /apps/wallet-extension
tier: public
org_scope: ~
source_kind: authored
source: citrate-wallet-extension/manifest.json, js/, popup/
surfaces: [APP-wallet-ext]
audited_against_sha: 543017d
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Citrate Keyring extension is a Manifest V3 browser extension that holds a Citrate Keyring account,
connects pages to Citrate Network, and signs every transaction and message behind an explicit approval.
It is for anyone who wants to use a Citrate page from Chrome, Edge, or Brave, and for developers wiring a
standard provider into a page.

## What it is

The extension is the account surface you reach from a browser tab. It generates and holds a key locally,
exposes a standard `window.ethereum` provider so a page can talk to it, and gates every signature behind a
confirmation window. The chain is fixed to Citrate Network, chain id `40204`, so there is no network to
choose and no chain to switch.

The account model has two layers. The extension creates a local account, an externally owned account whose
key is generated in the background service worker and stored encrypted at rest. Separately, you can link
that account to your Citrate Keyring identity, the same identity you can hold with a passkey at
`auth.citrate.ai`, which gives you a smart account whose operations can be sponsored. The passkey root and
the recovery path live with the identity service, covered under [passkeys](/aa/passkeys) and
[guardians](/aa/guardians); the extension is the device-held signer that links to it.

Three properties hold throughout. Keys are generated and decrypted only inside the background worker, never
in the page. Every signature and every transaction needs an explicit, per-action approval, there is no
silent signing. The set of network destinations the extension can reach is a fixed allow-list, mirrored
into the manifest content security policy.

## How to use it

1. Install the extension and create a local account, set out step by step in
   [install the Citrate Keyring extension](/apps/tutorials/install-the-wallet-extension).
2. Open a Citrate page. It discovers the provider through EIP-6963 and through `window.ethereum`, and calls
   `eth_requestAccounts`. A per-origin connection window opens; approve it once for that site.
3. When the page asks to send a transaction or sign a message, a confirmation window opens showing the
   from address, the to address, the amount in SALT, the gas, and any calldata. Approve or reject. If you
   do neither, it times out and is rejected.
4. To use a sponsored smart account, open the popup and run `Link this wallet`. This signs you in to your
   Citrate Keyring identity, predicts your smart account address, and, if the account is not yet deployed,
   installs this device's key as its root signer. After linking, a page can call
   `wallet_sendUserOperation` and the operation is sponsored by the Citrate paymaster.

## Reference

The surfaces below are read from the extension source at the SHA noted in the last section.

| Surface | What it does | Source |
|---|---|---|
| Background service worker | Holds keys, signs, gates approvals, forwards RPC | `js/background.js` |
| Page provider, MAIN world | Defines `window.ethereum` and `window.citrate`, announces over EIP-6963 | `js/provider.js` |
| Content relay, ISOLATED world | Validates and relays page requests across the trust boundary | `js/content.js` |
| Account abstraction helpers | Smart account address prediction, EntryPoint v0.7 UserOperation encoding | `js/aa.js` |
| Popup | Account view, send and receive, settings, `Link this wallet` | `popup/index.html`, `popup/js/app.js` |
| Connect window | Per-origin connection approval | `popup/connect.html`, `popup/js/connect.js` |
| Confirm window | Per-action approval, fails closed on timeout | `popup/confirm-tx.html`, `popup/js/confirm-tx.js` |

Manifest V3 permissions, from `manifest.json`:

| Permission | Why it is requested |
|---|---|
| `storage` | Store the encrypted account and settings in `chrome.storage.local` |
| `activeTab` | Interact with the page the user is on |
| `identity` | Run the Citrate Keyring identity sign-in through `chrome.identity.launchWebAuthFlow` |

Content scripts inject only on `https://*/*`, `http://localhost/*`, and `http://127.0.0.1/*`, so the
provider never appears on `chrome://` pages or `file://` URLs. The content security policy `connect-src`
limits the worker's network reach to the Citrate RPC, faucet, auth, and bundler hosts plus localhost. The
worker enforces the same set in `RPC_URL_ALLOWLIST` (`js/background.js`), and a CI parity check holds the
allow-list as a subset of the manifest policy.

Provider methods, handled in `js/background.js`:

| Method | Behaviour |
|---|---|
| `eth_chainId`, `net_version` | Return `0x9d0c`, that is 40204 |
| `eth_requestAccounts`, `eth_accounts` | Return the account after a per-origin approval |
| `eth_sendTransaction` | Opens a confirmation window, then signs and submits |
| `personal_sign` | Opens a confirmation window, then signs an EIP-191 message |
| `wallet_sendUserOperation` | Sends a sponsored operation from the linked smart account, requires linking first |
| `wallet_switchEthereumChain`, `wallet_addEthereumChain` | Handled, but the chain is fixed to 40204 |
| `eth_call`, `eth_getBalance`, `eth_blockNumber`, and other reads | Forwarded to the allow-listed node for an approved origin |
| `eth_sign` | Disabled; it is an arbitrary-data signing primitive |
| `eth_signTypedData`, `eth_signTypedData_v4` | Not yet supported (Specified), use `personal_sign` |

Account creation derives a 32-byte key, computes the address as the keccak256 of the public key in EIP-55
checksum form, and stores it encrypted with AES-256-GCM under an Argon2id key derivation (version 2,
m=64 MiB, t=3, p=1). The Argon2 step runs in a small WebAssembly module from the `citrate-wallet-sdk`
crate; an older PBKDF2 path remains read-only so existing accounts still unlock (`js/crypto.js`,
`wasm/build.md`). The decrypted key is zeroed immediately after each signature.

## Design rationale

The extension is built so the page can never reach a key. The provider that a page sees runs in the MAIN
world and does no cryptography and no extension messaging; it posts narrow, origin-scoped messages to the
ISOLATED-world relay, which forwards them to the worker that holds the keys. This is why `window.ethereum`
is visible to a page while the key never is. The same caution explains the fixed network and the fixed
network allow-list: an account that can only ever talk to Citrate Network and a known set of hosts cannot
be quietly pointed at a destination that would see every signed transaction. The cost is that the
extension is single-purpose, it is not a general account for other networks, and we think that is the
right trade for the account a person uses on Citrate.

## Failure modes

This is a key-holding surface, so the relevant failures are the ones where it must fail closed.

- A signature or transaction with no approval is rejected. If the confirmation window times out, the
  request is rejected, not held. A CI tripwire fails the build if a signing path stops gating on the
  approval check.
- `eth_sign` is refused outright, because it signs attacker-chosen bytes. Legitimate message signing goes
  through `personal_sign`, which is gated by its own confirmation.
- An unapproved origin cannot forward arbitrary methods to the node. Read methods are proxied only for an
  origin you have approved, which closes a confused-deputy path to a private node.
- A request to point the account at an RPC outside the allow-list is rejected with the allowed set named.
- The service worker locks the account on suspend, and the in-memory session ticket is lost when the
  worker is killed, so an idle browser does not leave the account unlocked.

There is no seed-phrase recovery for the local account. If you forget the password you lose that account.
The smart-account path is a different recovery story, handled by your Citrate Keyring identity and its
guardians, see [guardians](/aa/guardians).

## Access and canon

Public. This is the account a developer or a person uses to reach Citrate Network from a browser, and it is
open by design. No keys, credentials, or private endpoints appear here. The only sensitive values, your
password and your key, are created and held on your device and never leave it. The hosts in the manifest
content security policy are public endpoints, not secrets.

The smart-account path is pre-audit. The repository is classified Tier 1, full external audit before the
first stable release, in `AUDIT_TIER.md`. Use small testnet values while the audit is pending.

## Source and verification

- Source repo: `citrate-wallet-extension`, audited against SHA `543017d`.
- Files read: `manifest.json`, `js/background.js`, `js/provider.js`, `js/content.js`, `js/crypto.js`,
  `js/aa.js`, `popup/`, `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `wasm/build.md`,
  `AUDIT_TIER.md`, `README.md`.
- Status: Implemented (pre-audit), version 0.2.0. The local-account creation, the EIP-1193 provider, the
  per-action approval gates, the disabled `eth_sign`, and the RPC allow-list are Implemented. The linked
  smart-account path and `wallet_sendUserOperation` are Implemented but pre-audit, small-value only. EIP-712
  typed-data signing is Specified, not yet supported. The Argon2 WebAssembly binary is built per release
  with `wasm-pack` and is not committed to the repository.
