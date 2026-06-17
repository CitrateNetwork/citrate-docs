---
title: Memrizz (agent-memory DAG and MCP)
codex_slug: /apps/memories
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-memories
surfaces: [APP-memories]
audited_against_sha: 5a972d9
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Memrizz is the webapp and MCP server for a federated agent-memory DAG, "git for agents." It gives a
team fast, provenance-carrying access to its organizational memory across many repositories, and it
gives an agent durable, auditable memory through the same store over MCP.

## What it is

Memrizz (repo `citrate-memories`) holds a team's memory as a knowledge DAG and presents it through two
faces. The webapp renders that memory as a 2.5D constellation you can fly through, with conversational
recall, time-travel, and a review center where a person confirms or rejects what the system proposes.
The MCP server exposes the same memory to agents as a set of tools, so a model in Claude Desktop,
Claude Code, Cursor, or a generic client can recall, search, verify, and contribute to it.

Underneath, the store is two-plane. A Derived plane rebuilds deterministically from git, markdown, and
manifests, so it can always be reconstructed from the repositories themselves. An Asserted plane holds
signed human and agent claims, append-only, canonical for its own content. The split keeps the
distinction between what was reconstructed and what was asserted, and it is the same kind of memory
substrate the [research pages](/research) describe.

Everything is scoped to an Org and isolated per Org. Every call is authorized by a signed capability
grant, and every read, write, and denial is recorded to a tamper-evident hash-chained audit log. The
memory in an Org is treated as client property; the platform operator role deliberately has no access
to memory content.

## How to use it

### The webapp

1. Sign in with Citrate over OIDC with PKCE, then pick your Org.
2. Explore the constellation, or use Ask to query in natural language and get answers with citations
   that light up the nodes they came from.
3. Use the node inspector to follow a claim's provenance and verify it, and the review center to
   confirm or reject proposed edges, keeping a person in the loop.

### Connecting an agent over MCP

The MCP server speaks JSON-RPC over stdio as a headless daemon, or Streamable-HTTP through the gateway
at `POST /mcp/u/:sub`. From the Connect page you mint a short-lived token and copy a config block into
Claude Desktop, Claude Code, Cursor, or a generic client. The gateway authorizes every call against
your Org membership and your capability grant, and audits it. The agentic side, including the MCP
bridge and the RPC surface, is covered under [chain RPC](/chain/rpc).

## Reference

### Webapp surfaces

Defined in `PLANSET/06_WEBAPP_FRONTEND_SPEC.md`.

| Surface | What you see |
|---|---|
| Constellation | A 2.5D DAG explorer with layout modes, an `as_of` time-scrubber, and blast-radius focus. |
| Ask | Conversational recall with a model picker; citations light up the nodes they draw from. |
| Node inspector | Identity, plane and trust badges, a source pointer that links rather than copies, the verify verdict, and neighbors. |
| Review Center | A human-in-the-loop inbox of edge proposals, contradictions, supersessions, and self-critic findings. |
| Org and Audit | A federation overview and the integrity-verified, hash-chained audit log. |
| Connect | Mints your personal MCP endpoint and a short-lived token, with copy-paste client config. |

### MCP tools

Defined in `crates/mem-mcp/src/lib.rs`. Read tools return content; write tools record signed
assertions and are quarantined by default for inferred content.

| Kind | Tools |
|---|---|
| Read | `memory.recall`, `memory.search`, `memory.neighbors`, `memory.as_of`, `memory.verify`, `memory.critique`, `memory.analogy` |
| Write | `memory.assert`, `memory.propose_edge`, `memory.confirm_edge`, `memory.merge_diff` |

Every response carries provenance, a trust tier, and a freshness watermark.

### Gateway and engine

The system runs as three parts, described in `PLANSET/07_IMPLEMENTATION_AND_HARDENING_PLAN.md`.

| Part | Role | Source |
|---|---|---|
| Webapp | The browser front end and OIDC relying party. | `webapp/` |
| Gateway | Authentication, Org resolution, authorization, the HTTP and JSON API, and the SSE stream. | `crates/mem-gateway/` (`org.rs`, `authz.rs`, `oidc.rs`, `http.rs`) |
| Engine | The memory store and vector index. | the engine crates |

## Design rationale

Two planes exist because reconstructed knowledge and asserted knowledge carry different guarantees and
must not be confused. The Derived plane can always be rebuilt from the repositories, so it never needs
to be trusted on faith; the Asserted plane is append-only and signed, so a claim's author and time are
fixed. Org isolation, signed capability grants, and the audit chain follow from treating memory as
client property: the operator who runs the platform should be able to keep it healthy without being
able to read what it holds. Inferred writes are quarantined by default and surfaced in the review
center, so a person decides what becomes canonical rather than the model deciding silently.

## Failure modes

This surface holds client memory, so it is built to fail closed.

- Authentication is OIDC with the signing algorithm pinned to RS256 and read from configuration rather
  than the token header, with issuer, audience, and expiry enforced. A token that does not satisfy
  these is rejected, and the gateway refuses to start without its OIDC configuration.
- Every call is checked against Org membership and a signed, resource-scoped capability grant. A call
  outside the grant is denied, and the denial is recorded.
- The audit log is a hash chain. A break in the chain is detectable, and the Org view shows whether
  the chain is intact.
- Memory content is encrypted at rest with XChaCha20-Poly1305, with a master key per Org.
- The platform operator role has no access to memory content by design.
- No secrets appear in this page. None of the OIDC, capability, or encryption keys are reproduced here.

> Repo hygiene, flagged and not transcribed: the working tree carries `webapp/.env.local` holding a
> live Neon Postgres connection string and a Vercel OIDC token. These should be rotated and the file
> removed from version control. Neither is reproduced here.

## Access and canon

Commercial. This is paid, contracted, multi-Org product depth, and memory is client property isolated
per Org. The store reuses pieces of the Citrate Network engine, and its audit roots are designed to
anchor periodically to the public ledger; the federated-learning surface it sits alongside is
[Citrate Orchard](/research/learning). On-premise sovereignty and identity-checking through CLEAR hold
across Citrate, as described in [what Citrate is](/start/what-is-citrate).

## Source and verification

- Source repo: `citrate-memories`. The product is named Memrizz; an earlier working codename still
  lingers in some spec and crate comments and is not used in Atlas.
- Audited against: `5a972d9`.
- Key paths: `crates/mem-mcp/src/lib.rs`, `crates/mem-gateway/` (`org.rs`, `authz.rs`, `oidc.rs`,
  `http.rs`), `crates/mem-store/src/shred.rs`, `PLANSET/00`–`07`, `webapp/`, `README.md`.
- Status by area:
  - Security foundation (milestone M0, landed 2026-06-14): **Implemented (pre-audit).** Org
    control-plane and isolation, OIDC verification, capability-grant authorization, the HTTP read and
    write API, the MCP-over-HTTP bridge, and durable control-plane persistence.
  - See, Ask, and Steward MVP (milestone M1): **Specified**, in progress. The constellation,
    conversational recall, the review center, signed assert and confirm, and the SSE audit tail are
    being built. Later milestones add the admin console, model-bring-your-own revoke, operations, and
    crypto-shred forget.
  - Known limits: encryption is classical today, with a post-quantum hybrid (Kyber-768 and X25519)
    roadmapped; crypto-shred is per-Org rather than per-recipient; v1 is exploratory with a v2
    greenfield rebuild planned.
  - A Tier-1 external audit is required before any non-internal exposure, and none has been completed.
