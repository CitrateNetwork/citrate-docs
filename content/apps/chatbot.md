---
title: Citrate Chat (gasless chat app)
codex_slug: /apps/chatbot
tier: public
org_scope: ~
source_kind: authored
source: citrate-chatbot
surfaces: [APP-chatbot]
audited_against_sha: e3827c3
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A gasless chat app that runs inference on Citrate and signs in with a Citrate Keyring account, so you
can talk to a model on the network without holding any SALT. It is for anyone who wants to try a chat
app native to Citrate, and for builders who want a reference for gasless sponsorship on the network.

## What it is

Citrate Chat is a public app that lets you talk to a model running on Citrate. Two things make it
different from an ordinary chat app, and both rest on Citrate being a substrate rather than a service
you have to trust.

The first is the account. You sign in with a Citrate Keyring account rather than a username and a
password. The account is created for you on first sign-in, so there is no key to set up by hand. The
[passkeys page](/aa/passkeys) covers the account model in full.

The second is that it is gasless. Citrate has no native paymaster, so the app uses an EIP-2771
meta-transaction relay: you sign a request, which is free, and a relayer funded by the Citrate
Foundation submits the on-chain transaction and pays the fee. You never need SALT in hand to use it.
That relay is described under [the paymaster page](/aa/paymaster).

The mental model is plain. You chat normally. The model reply streams back to you, and when receipt
anchoring is on, a short on-chain record of the exchange is written to a registry contract, with the
network covering the fee rather than you. The on-chain inference path, where a model call is itself a
ledger operation through the inference RPC methods on [chain RPC](/chain/rpc), is specified and
partly built but not yet wired; today the model reply is served over the gateway, and the gasless
on-chain part is the receipt.

## How to use it

1. Open the app. Signed out, you see the hero and a sign-in button.
2. Sign in. An account is created or linked for you, with no email or key setup required
   (`src/components/auth-provider.tsx`).
3. Type a message and send it. The reply streams in real time from the configured inference source
   (`POST /api/chat`, `src/app/api/chat/route.ts`).
4. When receipt anchoring is on, the app builds an EIP-2771 `ForwardRequest`, you sign it for free,
   and it is submitted through the relayer (`src/hooks/use-sponsored-write.ts`, then `POST /api/relay`).
5. Once signed in, your chats can be saved as threads in the sidebar when a database is configured.

## Reference

The screens are built from the components below, in `src/components/`.

| Screen | What you see | Source |
|---|---|---|
| Hero | The empty state with suggested-prompt chips and the gasless explainer. | `src/components/hero.tsx` |
| Conversation | Streaming message bubbles, an on-chain receipt chip, copy and regenerate. | `src/components/conversation.tsx` |
| Composer | An auto-growing input, send and stop, a model badge, Cmd+Enter to send. | `src/components/composer.tsx` |
| Header | The sign-in button or your account address chip. | `src/components/header.tsx` |
| Sidebar | Thread history, when signed in and a database is configured. | `src/components/sidebar.tsx` |
| Settings | Chain info, account address, balance, and a read-back of recorded receipts. | `src/components/settings.tsx` |

### What gasless means here

You sign a typed-data `ForwardRequest` with your account. The relayer route
(`src/app/api/relay/route.ts`) checks that your authenticated session owns the `from` address,
rate-limits the request to protect the Foundation account, validates the signature on-chain with the
forwarder's `verify`, then calls the forwarder's `execute` and pays the gas. Only the relayer can call
`execute`, and it appends your address to the call per the EIP-2771 standard.

### Contracts

| Contract | Role | Source |
|---|---|---|
| `CitrateForwarder` | EIP-2771 forwarder; verifies the signed request and executes it on the user's behalf. | `contracts/src/CitrateForwarder.sol` |
| `ChatRegistry` | Records a content hash per thread in contract state, so receipts can be read back with `eth_call`. | `contracts/src/ChatRegistry.sol` |

Both are deployed to testnet and covered by 14 passing Foundry tests. `ChatRegistry` stores receipts
in state rather than only emitting events, because the network's read path uses `eth_call` rather than
event indexing.

### Inference source

The chat route resolves an inference provider and streams the reply. The working modes are a
self-hosted local endpoint and an OpenAI-compatible gateway; the on-chain mode is present in the
interface but throws until it is wired (`src/lib/inference/index.ts`). The gateway reply is streamed,
not an on-chain call. The inference RPC methods that the on-chain mode will use are on
[chain RPC](/chain/rpc).

## Design rationale

The account and the gas rail both exist to remove the two things that usually stop a newcomer from
trying a network app: setting up keys, and acquiring the fee token first. A Citrate Keyring account is
created on sign-in, so there is no key ceremony. The EIP-2771 relay lets the network, not the user,
pay the fee, so there is nothing to acquire before the first message. The cost of sponsoring gas is
that the Foundation account is a target, which is why the relay rate-limits and checks session
ownership before it ever signs. We separated the receipt from the inference deliberately: the on-chain
receipt is gasless and live today, independent of whether the model call has moved on-chain yet.

## Failure modes

The relay spends real funds on a user's behalf, so it is built to fail closed.

- The relay verifies that your authenticated session owns the `from` address before sponsoring any
  transaction. A request to relay for an address you do not own is refused.
- The relay enforces per-address and per-IP rate limits and a daily budget before it touches the
  chain, so a flood cannot drain the Foundation account.
- Only the relayer may call the forwarder's `execute`, and the signature is validated on-chain before
  execution.
- The on-chain inference path is not wired. Calling it throws rather than silently degrading, so the
  app cannot appear to run a ledger inference when it is actually serving from the gateway.
- The relayer key, the auth provider secret, the database URL, and any chat encryption key are
  server-only environment values and do not appear in this page. The public RPC at
  `https://rpc.citrate.ai` and the public contract addresses are not secrets.

> Repo hygiene, flagged and not transcribed: the working tree carries a `.env.local` holding a live
> testnet relayer private key, a chat encryption key, a Neon Postgres connection string, and a Vercel
> OIDC token. The file is gitignored and not in history, but the values are live and should be rotated.
> None of them are reproduced here.

## Access and canon

Public. This is the kind of open, developer-facing app the Codex keeps public: the concepts and
reference a developer needs to build a gasless app on Citrate. It runs against the Citrate Network
testnet at chain id 40204. SALT settles the work the relay performs and the user holds none of it.

## Source and verification

- Source repo: `citrate-chatbot`.
- Audited against: `e3827c3`.
- Key paths: `src/app/api/relay/route.ts`, `src/app/api/chat/route.ts`,
  `src/hooks/use-sponsored-write.ts`, `src/components/auth-provider.tsx`,
  `src/lib/inference/index.ts`, `contracts/src/CitrateForwarder.sol`, `contracts/src/ChatRegistry.sol`,
  `README.md`, `.agentile/PRODUCT_SPEC.md`.
- Status by area:
  - Gas rail (sprint S-2): **Implemented (pre-audit).** `CitrateForwarder` and `ChatRegistry` are
    deployed to testnet, the relay route works, and the gasless receipt write is live.
  - Account sign-in and streaming chat (sprint S-1): **Implemented (pre-audit).**
  - On-chain inference (sprint S-3): **Specified.** The provider interface exists; the on-chain mode
    throws until wired. The live reply is served over a gateway or a local endpoint.
  - Encrypted thread history (sprint S-4): **Implemented (pre-audit)**, partial; persistence works and
    summarization is not fully live.
  - Open dependencies the deployer must supply: a live inference gateway URL, a model registered in
    `ModelRegistry` (the registry is empty today), and account-provider credentials.
  - No external audit has been completed.
