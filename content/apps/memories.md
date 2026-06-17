---
title: Memrizz (knowledge DAG + MCP)
codex_slug: /apps/memories
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-memories/README.md
surfaces: [APP-memories]
audited_against_sha: 5a972d9
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Memrizz

> A federated knowledge-DAG webapp and MCP server, "git for agentic operators." Explore your
> organization's memory as a constellation, ask it questions, and connect your own model over MCP.

## Overview

Memrizz (repo `citrate-memories`) gives a team fast, trustworthy access to its organizational memory
across many repos. It has two faces:

- A **webapp** that renders memory as a 2.5D **constellation** (a knowledge DAG you can fly through),
  with conversational RAG, time-travel, and a human-in-the-loop review center.
- An **MCP server** that exposes that memory to AI agents as a set of tools, so your own model (Claude
  Desktop/Code, Cursor, etc.) can recall, search, verify, and contribute to it.

The model is two-plane: a **Derived** plane that rebuilds deterministically from git/markdown/manifests,
and an **Asserted** plane of signed human/agent claims. Everything is Org-scoped, authorized by signed
capability grants, and audited on a tamper-evident hash chain.

> **Status, v1 in active development.** The security foundation (M0) landed 2026-06-14; the See/Ask/Steward
> MVP (M1) is in progress. A Tier-1 security audit is required before any non-internal exposure. Treat
> as exploratory.

## Who it's for

- Teams (Orgs) that want a queryable, provenance-carrying memory across a multi-repo codebase.
- Agent operators who want to give their model durable, auditable memory over MCP.

## Key features & screens

Source: `webapp/`, `PLANSET/06_WEBAPP_FRONTEND_SPEC.md`.

| Surface | What you see |
|---|---|
| Constellation (home) | 2.5D DAG explorer; layout modes, time-scrubber (`as_of`), blast-radius focus |
| Ask | Conversational RAG with model picker; citations light up nodes |
| Node inspector | Identity, plane/trust badges, source pointer (links, not copies), verify verdict, neighbors |
| Review Center | HITL inbox: edge proposals, contradictions, supersessions, self-critic findings |
| Org / Audit | Federation overview; integrity-verified hash-chained audit log |
| Connect | Generates your personal MCP endpoint + short-lived token, with copy-paste client config |

## How to use

### The webapp

1. Sign in with Citrate (OIDC PKCE); pick your Org.
2. Explore the **constellation**, or use **Ask** to query in natural language with citations.
3. Use the **Node inspector** to follow provenance and verify a claim, and the **Review Center** to
   confirm or reject proposed edges (human-in-the-loop).

### Connecting your model over MCP

The MCP server (`crates/mem-mcp/src/lib.rs`) speaks JSON-RPC over **stdio** (headless daemon) or
**Streamable-HTTP** via the gateway (`POST /mcp/u/:sub`). From the **Connect** page you mint a
short-lived token and copy a config block into Claude Desktop/Code, Cursor, or a generic client. The
gateway authorizes every call against Org membership + your capability grant and audits it.

### MCP tools

Read: `memory.recall`, `memory.search`, `memory.neighbors`, `memory.as_of`, `memory.verify`,
`memory.critique`, `memory.analogy`. Write (signed, quarantine-by-default for inferred content):
`memory.assert`, `memory.propose_edge`, `memory.confirm_edge`, `memory.merge_diff`. Every response
carries provenance, trust tiers, and a freshness watermark.

## Tutorials

- A "connect your model to Memrizz over MCP" tutorial is planned. Until then, use the **Connect** page
  in the app, which emits ready-to-paste client config.

## Security & access

**Tier: commercial.** This is paid, contracted, multi-Org product depth, memory is client IP, isolated
per Org. The Platform-Operator role deliberately has **no** access to memory content.

**No secrets in this doc.** Auth uses OIDC (RS256 pinned, issuer/audience/expiry enforced, fail-closed)
plus signed, resource-scoped capability grants; data is encrypted at rest (XChaCha20-Poly1305). None of
those keys or tokens are reproduced here.

> **Repo hygiene finding (flagged, not transcribed):** the working tree contains a committed
> `webapp/.env.local` with a live Neon Postgres connection string and a Vercel OIDC token. These should
> be rotated immediately and the file removed from version control. They were **not** copied into this page.

## Source & verification

- **Repo:** `citrate-memories`
- **Audited against SHA:** `5a972d9`
- **Key paths:** `crates/mem-mcp/src/lib.rs`, `crates/mem-gateway/` (`org.rs`, `authz.rs`, `oidc.rs`,
  `http.rs`), `PLANSET/00`–`07`, `webapp/`, `README.md`

### Honest status

- **M0 landed (2026-06-14):** Org control-plane + isolation, OIDC verification, capability-grant authz,
  HTTP read API, MCP-over-HTTP bridge, persisted control-plane.
- **M1 in progress:** constellation, Ask RAG, Review Center, signed assert/confirm, SSE audit tail;
  later milestones add the admin console, BYOM revoke, ops, and Forget (crypto-shred).
- **Known limitations:** classical crypto today (post-quantum hybrid is roadmapped), crypto-shred is
  per-tenant (not per-recipient envelopes), and v1 is exploratory with a v2 greenfield rebuild planned.
  Gateway + webapp fold into a Tier-1 audit before non-internal exposure.
