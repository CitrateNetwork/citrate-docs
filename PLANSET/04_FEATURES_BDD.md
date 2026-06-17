---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Features (BDD / Gherkin)

> Executable-intent specs for every v1 capability. The architecture these exercise is in
> `02_ARCHITECTURE.md`; the formal safety invariants behind the tier/denial/cross-org scenarios are in
> `03_TLA_SPECS.md` (`NoTierEscalation`, `ConfidentialNeverInBuild`, `NoCrossOrgRead`, `EntitlementExpiry`,
> `KycGateMonotonic`, `DisclosureBeforeRender`, `AgentRespectsTier`); the surface→tier map the navigation scenarios assert
> is `06_INFORMATION_ARCHITECTURE.md`. A feature is "done" when its scenarios pass against real code
> (Rule 1 — no mocks in the path under test: a real `citrate-identity` OIDC issuer, a real `verifySession`
> chokepoint, real testnet endpoints on chain 40204). The Feature→invariant→sprint map closes the file.

## Feature: Splash & sign-in (DOCS-CODEX-S1)
```gherkin
Background:
  Given a deployed Citrate Codex with citrate-identity OIDC configured at auth.citrate.ai
  And the public corpus is built and served

Scenario: A visitor lands on the splash and may browse Public without logging in
  Given an anonymous visitor with no session
  When the visitor opens "/"
  Then the splash renders with a "Sign in" call to action
  And the visitor can navigate to any Public doc and run any sandbox without authenticating
  And resolveTier returns "public" for the anonymous session

Scenario: A visitor signs in via citrate-identity OIDC (PKCE)
  Given an anonymous visitor on the splash
  When the visitor clicks "Sign in"
  And completes the OIDC authorization-code + PKCE flow at auth.citrate.ai
  Then the callback at /api/auth establishes an authenticated session with a verified sub
  And the entitlement claim (tier, org_id, citrate_role, expires_at) is present on the session
  And the sidebar re-renders to include every section the caller may read

Scenario: A failed or cancelled sign-in leaves the visitor on the Public tier
  When the OIDC flow returns an error or the visitor cancels
  Then no authenticated session is created
  And the visitor remains able to browse the Public tier
```

## Feature: Tier resolution (DOCS-CODEX-S2)
```gherkin
Scenario Outline: A user sees exactly the tier their entitlement grants
  Given a signed-in user whose entitlement.tier = "<tier>" and entitlement is unexpired
  When the user requests their highest readable band via resolveTier
  Then resolveTier returns "<resolved>"
  And the sidebar shows the "<resolved>" surfaces and hides everything above it

  Examples:
    | tier         | resolved     |
    | public       | public       |
    | commercial   | commercial   |
    | academic     | academic     |
    | confidential | confidential |

Scenario: An authenticated user with no entitlement defaults to Public
  Given a signed-in user whose entitlement claim is absent
  When resolveTier runs
  Then it returns "public" (NoTierEscalation default)
  And the user sees only Public surfaces

Scenario: An expired entitlement drops the user to Public
  Given a signed-in user whose entitlement.tier = "commercial"
  And entitlement.expires_at is in the past relative to now
  When resolveTier(session, now) runs
  Then it returns "public" (EntitlementExpiry)
  And every previously-visible Commercial route now resolves as not-readable

Scenario: A time-gated auditor sees Confidential only during the engagement window
  Given an auditor whose entitlement.tier = "confidential" with citrate_role = "auditor"
  And expires_at is the end of an active engagement window
  When the auditor reads while now < expires_at
  Then resolveTier returns "confidential"
  And once now >= expires_at the same call returns "public"
```

## Feature: Tier-isolation & denial (DOCS-CODEX-S2, S3 · R1, R2)
```gherkin
Scenario: A Commercial user requesting an Academic route is denied
  Given a signed-in user whose entitlement.tier = "commercial"
  When the user requests an Academic doc route (e.g. /docs/research/paraconsistent-consensus)
  Then canRead returns false and the server responds 403
  And no Academic content is rendered into the response

Scenario: A Commercial user requesting a Confidential route is denied
  Given a signed-in user whose entitlement.tier = "commercial"
  When the user requests a Confidential route under /docs/internal/*
  Then the server responds 403
  And the access_log records no successful Confidential read for this sub

Scenario: An unauthenticated user requesting a Confidential doc gets 404
  Given an anonymous visitor with no session
  When the visitor requests a Confidential doc slug directly
  Then the gateway responds 404 (existence is not disclosed to the unauthenticated)
  And no row is written suggesting the doc exists

Scenario: The static build contains zero Confidential content (ConfidentialNeverInBuild)
  Given a completed production build of citrate-docs
  When CI greps the build output for known Confidential markers
    (e.g. "CONFIDENTIAL", funding cap-table tokens, audit finding IDs, ops role-charter strings)
  Then zero matches are found in any emitted artifact
  And the build fails closed if any single marker appears
```

## Feature: Per-sector / per-company scoping (DOCS-CODEX-S2 · R12)
```gherkin
Scenario: Org A cannot read Org B's space at the same tier (NoCrossOrgRead)
  Given user "alice" with entitlement.tier = "commercial" and org_id = "org-A"
  And a Commercial doc scoped to org_id = "org-B"
  When alice requests that org-B doc
  Then canRead returns false even though alice's tier equals the doc's tier
  And the server responds 403

Scenario: A Boeing-scoped Confidential shell is invisible to other Confidential principals
  Given an auditor with tier = "confidential", citrate_role = "auditor", org_id = "org-defense-X"
  And the citrate-boeing-shell space scoped to org_id = "org-boeing"
  When the auditor requests a Boeing-scoped Confidential doc
  Then access is denied (NoCrossOrgRead) and a 403 is returned

Scenario: A user sees only its own org's spaces in the sidebar
  Given alice (org_id = "org-A", tier = "commercial")
  When the sidebar renders
  Then it lists the org-A Commercial space
  And it does not list any org-B space
```

## Feature: KYC gate (DOCS-CODEX-S2 · R7)
```gherkin
Scenario: A C·kyc surface is locked until kyc_status is verified
  Given a signed-in user whose entitlement.tier = "commercial"
  And the user's kyc_status claim = "unverified"
  When the user requests a C·kyc surface (e.g. /docs/operators/sell-compute)
  Then canRead returns false and the server responds 403
  And the response invites the user to complete KYC at citrate-identity

Scenario: A verified user reads the KYC-private implementation band
  Given a signed-in user whose kyc_status claim = "verified"
  When the user requests the same C·kyc surface
  Then canRead returns true and the deep implementation content is served
  And Codex reads only the kyc_status claim and stores no PII

Scenario: Losing verification removes access
  Given a previously verified user reading a C·kyc surface
  When citrate-identity revokes the user's KYC and kyc_status becomes "unverified"
  And the entitlement_cache TTL expires so the chokepoint re-resolves
  Then the next request to the C·kyc surface returns 403
```

## Feature: Confidential gateway & disclosures (DOCS-CODEX-S3 · R1, R4, R9)
```gherkin
Scenario: An issued auditor must acknowledge the disclosure gate before reading
  Given an auditor with tier = "confidential" and an active, unexpired engagement
  And a Confidential doc carrying a disclosure_gate the auditor has not yet acknowledged
  When the auditor opens the doc via /api/content/[...slug]
  Then the gateway returns the disclosure modal first, not the content
  When the auditor records the click-through acknowledgement
  Then a disclosure_ack row (sub, disclosure id, ts) is written
  And the doc content is then served

Scenario: A Confidential read is fetched at runtime and never enters the bundle
  Given an authorized, disclosure-acknowledged auditor request for a Confidential doc
  When the gateway serves it
  Then the doc is fetched server-side from its private home repo at request time
  And the rendered HTML is returned without ever existing in the client bundle
  And an access_log row (sub, doc slug, tier, org_id, disclosure_ack, ts) is written

Scenario: An embargoed Confidential doc is auto-held until its date
  Given a Confidential doc with an embargo date in the future
  When an otherwise-authorized auditor requests it before the embargo date
  Then the gateway holds the content and returns an embargo notice
  And after the embargo date the same authorized request succeeds and is logged
```

## Feature: Ask agent — tier-aware RAG (DOCS-CODEX-S4 · R3, R11)
```gherkin
Scenario: The agent answers a Public question for an anonymous user
  Given an anonymous visitor (resolveTier = "public")
  When the visitor asks "What is GhostDAG blue-score?"
  Then /api/chat resolves the caller tier as public before retrieval
  And RAG retrieves only Public-tier chunks
  And the agent answers and cites Public docs

Scenario: A Commercial user gets Commercial citations but never an above-tier chunk (AgentRespectsTier)
  Given a signed-in user with tier = "commercial" and org_id = "org-A"
  When the user asks an implementation question covered by Commercial docs
  Then retrieval filters to chunks where chunk.tier <= commercial AND chunk.org_id in {null, org-A}
    BEFORE the model is invoked
  And no Academic or Confidential chunk is ever placed in the model context
  And the answer cites only org-A-scoped Commercial and Public sources

Scenario: Every tool call the agent makes is audited
  Given any Ask conversation
  When the agent invokes searchDocs, getSurface, or a read-only chain tool
  Then a tool_call_audit row (sub, tool, truncated args, ts) is written

Scenario: Ask is rate-limited per sub/IP
  Given a caller exceeding the configured request budget
  When the caller issues another Ask request
  Then the request is rejected with a rate-limit response (Upstash, in-memory fallback)
```

## Feature: Sandboxes (DOCS-CODEX-S5 · R8)
```gherkin
Background:
  Given the five sandboxes are mounted: GhostDAG blue-score, gasless EIP-2771 relay,
    x402 402-flow, inference-gateway call, RPC method explorer
  And they target live testnet chain 40204, read-mostly

Scenario Outline: Each sandbox runs a live testnet call
  Given the "<sandbox>" endpoint is up
  When the visitor triggers the sandbox's primary action
  Then it issues "<live_call>" against chain 40204 and renders a real result

  Examples:
    | sandbox                | live_call                                        |
    | GhostDAG blue-score    | citrate_blueScore / citrate_tipSet read          |
    | gasless relay          | EIP-2771 forwarder meta-tx via the public relay  |
    | x402 402-flow          | X402Client challenge -> 402 -> settle (testnet)  |
    | inference-gateway      | POST /v1/chat/completions (testnet key)          |
    | RPC method explorer    | an allowlisted eth_* / citrate_* read            |

Scenario Outline: Each sandbox fails closed when its endpoint is down
  Given the "<sandbox>" endpoint is unreachable
  When the visitor triggers the sandbox
  Then the sandbox shows an explicit "endpoint unavailable" error and performs no fallback action
  And no signing key is ever held in the docs app

  Examples:
    | sandbox             |
    | GhostDAG blue-score |
    | gasless relay       |
    | x402 402-flow       |
    | inference-gateway   |
    | RPC method explorer |

Scenario: Sandboxes are rate-limited
  Given a visitor repeatedly invoking a sandbox above the configured budget
  When the next invocation arrives
  Then it is rejected by the per-sub/IP rate limiter
```

## Feature: Navigation & Information Architecture (DOCS-CODEX-S1, S6)
```gherkin
Scenario: The sidebar renders the full surface map
  Given the IA defined in 06_INFORMATION_ARCHITECTURE.md
  When any caller loads the app
  Then the sidebar renders the sections the caller may read, in 06 order (0..12)
  And each section the caller can read includes a Tutorials subsection

Scenario: Search returns only results the caller may read
  Given a signed-in user with tier = "commercial" and org_id = "org-A"
  When the user searches for a term that also matches Academic and Confidential docs
  Then results include only chunks where chunk.tier <= commercial AND chunk.org_id in {null, org-A}
  And no Academic or Confidential title, snippet, or slug appears in the results

Scenario: Every section exposes a Tutorials subsection
  Given any section visible to the caller
  When the section is expanded
  Then a Tutorials subsection is present (per the 06 "Tutorials" line for that section)
```

## Feature: MCP server (DOCS-CODEX-S4 · R2)
```gherkin
Scenario: An external agent's entitlement caps the resources it can retrieve
  Given an external agent authenticating to /api/mcp with an API key whose entitlement.tier = "commercial"
  When the agent lists and reads MCP resources
  Then it can retrieve Public and Commercial (org-scoped) surfaces
  And any attempt to read an Academic or Confidential resource is denied at the same chokepoint
  And the denial resolves through canRead/resolveTier, not a separate code path

Scenario: An MCP key with an expired entitlement is treated as Public
  Given an API key whose entitlement.expires_at is in the past
  When the agent requests any above-Public resource
  Then resolveTier returns "public" (EntitlementExpiry) and the request is denied
```

---

## Feature → invariant → sprint map

| Feature | TLA invariant (`03_*`) it operationalizes | Sprint (`05_*`) that delivers it |
|---|---|---|
| Splash & sign-in | `NoTierEscalation` (anonymous = Public default) | DOCS-CODEX-S1 |
| Tier resolution | `NoTierEscalation`, `EntitlementExpiry` | DOCS-CODEX-S2 |
| Tier-isolation & denial | `NoTierEscalation`, `ConfidentialNeverInBuild` | DOCS-CODEX-S2 / S3 |
| Per-sector / per-company scoping | `NoCrossOrgRead` | DOCS-CODEX-S2 |
| KYC gate | `KycGateMonotonic` | DOCS-CODEX-S2 |
| Confidential gateway & disclosures | `ConfidentialNeverInBuild`, `DisclosureBeforeRender`, `EntitlementExpiry` (engagement window) | DOCS-CODEX-S3 |
| Ask agent — tier-aware RAG | `AgentRespectsTier`, `NoCrossOrgRead` | DOCS-CODEX-S4 |
| Sandboxes | (fail-closed liveness; rate-limit safety) | DOCS-CODEX-S5 |
| Navigation & IA | `NoTierEscalation` (search/sidebar filtered pre-render) | DOCS-CODEX-S1 / S6 |
| MCP server | `NoTierEscalation`, `EntitlementExpiry` | DOCS-CODEX-S4 |
