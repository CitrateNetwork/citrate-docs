---
title: Citrate Chat (gasless AI chatbot)
codex_slug: /apps/chatbot
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chatbot/README.md
surfaces: [APP-chatbot]
audited_against_sha: 023372f
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Chat

> A gasless, wallet-native AI chatbot on the Citrate testnet — log in with a wallet, chat with an on-network model, and the Citrate Foundation pays the gas for you.

## Overview

Citrate Chat is a public dApp that lets anyone talk to an AI model running on the Citrate
network. Two things make it different from a normal chat app:

- **It's wallet-native.** You log in with a wallet (via Privy) instead of a username and password.
- **It's gasless.** Citrate has no native paymaster, so the app uses an **EIP-2771 meta-transaction**
  relay: you sign a request (free), and a Foundation-funded relayer submits the on-chain transaction
  and pays the gas. You never need to hold SALT to use it.

The mental model: you chat normally; behind the scenes, an optional on-chain *receipt* of the exchange
can be anchored to a registry contract, and the network — not you — covers the fee.

> **Status — experimental / testnet.** This runs against the Citrate **testnet** (chain id `40204`).
> It has not completed a formal external audit. The seed inference model and on-chain receipt anchoring
> are still being finished (see "Honest status" below). Don't treat anything here as production-grade.

## Who it's for

- People who want to try an AI-native dApp without buying or bridging any tokens.
- Builders who want a reference implementation of **gasless EIP-2771 sponsorship** on Citrate.

## Key features & screens

Source: `src/app/page.tsx`, `src/components/`.

| Screen / component | What you see | Path |
|---|---|---|
| Hero | "Chat with Citrate", suggested-prompt chips, gasless explainer | `src/components/hero.tsx` |
| Conversation | Streaming message bubbles; an on-chain receipt chip; copy / regenerate | `src/components/conversation.tsx` |
| Composer | Auto-growing input, send/stop, model badge, Cmd+Enter to send | `src/components/composer.tsx` |
| Header | Log-in button or your address chip | `src/components/header.tsx` |
| Sidebar | Thread history (when logged in and a database is configured) | `src/components/sidebar.tsx` |
| Modals | Privy login, "How it works", wallet drawer, rate-limit toast | `src/components/` |

## How to use

1. Open the app. Unauthenticated, you'll see the hero and a **Log in** button.
2. Click **Log in** → the Privy modal creates an embedded wallet or links an existing one
   (`src/components/auth-provider.tsx`). No email needed.
3. Type a message and send. The response streams in real time from the configured inference source
   (`POST /api/chat`, `src/app/api/chat/route.ts`).
4. If on-chain receipts are enabled, the app builds an EIP-2771 `ForwardRequest`, you sign it (free,
   no gas), and it's submitted via the relayer (`src/hooks/use-sponsored-write.ts` → `POST /api/relay`).
5. Logged-in chats can be saved as threads in the sidebar when a database is configured.

### What's gasless, exactly

You sign a typed-data `ForwardRequest` with your embedded wallet. The relayer
(`src/app/api/relay/route.ts`) verifies your session owns the `from` address, rate-limits the request
to protect the Foundation wallet, validates the signature on-chain, then calls the forwarder's
`execute(...)` and pays the gas. The contracts are `CitrateForwarder` and `ChatRegistry`
(`contracts/src/CitrateForwarder.sol`).

## Tutorials

- A standalone "send your first gasless message" tutorial is planned. For now, follow **How to use**
  above; the wallet-extension install tutorial (`/apps/tutorials/install-the-wallet-extension`) covers
  getting a wallet if you don't use the Privy embedded one.

## Security & access

**Tier: public.** This is exactly the kind of open, developer-facing dApp the Codex keeps public —
concepts and reference a developer needs to build a gasless app.

**No secrets in this doc.** The relayer wallet key, Privy app secret, database URL, and Redis tokens
are server-only environment variables and are **not** reproduced here. Public chain addresses and the
public RPC (`https://rpc.citrate.ai`) are not secrets.

> **Repo hygiene finding (flagged, not transcribed):** the working tree contains a committed
> `.env.local` with a live testnet relayer private key and a Vercel OIDC token. These are
> testnet/dev credentials but should be rotated and removed from version control. This was **not**
> copied into this page.

User-facing safety: the relay endpoint enforces per-address and per-IP rate limits and verifies that
your authenticated session owns the address before sponsoring any transaction.

## Source & verification

- **Repo:** `citrate-chatbot`
- **Audited against SHA:** `023372f`
- **Key paths:** `src/app/api/relay/route.ts`, `src/app/api/chat/route.ts`,
  `src/hooks/use-sponsored-write.ts`, `src/components/auth-provider.tsx`,
  `contracts/src/CitrateForwarder.sol`, `README.md`, `.agentile/PRODUCT_SPEC.md`

### Honest status

- **Gas rail (S-2): done** — `CitrateForwarder` + `ChatRegistry` deployed to testnet; relay endpoint working.
- **In progress:** receipt-in-chat flow (S-3) and encrypted thread history (S-4).
- **Open dependencies:** live inference gateway URL, a registered/runnable model in `ModelRegistry`,
  and Privy credentials must be supplied by the deployer. No formal audit yet.
