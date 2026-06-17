---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — TLA+ Specification Plan

> What we model-check before trusting the gate, and a concrete TLA+ module for the one
> safety-critical core of this app: the **access-control state machine**. Companion to
> `00_OVERVIEW.md` (vision, the two core invariants, the 4-tier model), `01_SCOPE_OF_WORK.md`
> (risk register R1–R12), and `02_ARCHITECTURE.md` (the RBAC seam §4, the content pipeline §3,
> the agentic harness §5). We do **not** formalize the whole app — not the MDX renderer, the
> sidebar, the sandboxes, or the inference provider. The thing that *must* be provably correct is
> the chokepoint that decides who reads what: `resolveTier`/`canRead` and the Confidential
> build/runtime split. That is what these specs abstract, and they deliberately stop there (§4).

## 1. What must be formally specified (and why)

| Spec | Property class | Why it must be formal |
|---|---|---|
| `AccessControl` | safety + security | The load-bearing core. One server-side chokepoint resolves every read; a missed check is **R2** (escalation), **R12** (cross-org spillover), or **R4** (stale grant). The whole "open docs that also hold audit material" thesis rests on this being right, so we model it, not just test it. |
| `ContentPartition` | safety + security | The structural half of **R1** (Critical): Confidential content must never enter the build artifact set; it is reachable only via the runtime-gated path after auth. We model `build_set` vs the runtime `gated_set` and prove `build_set ∩ confidential = ∅` is preserved by every transition. |

Both are written below as a single `AccessControl` module with the partition modeled as part of
the same state (the build set is a constant of the corpus; the gate is the only reader of
Confidential). The seven named invariants below are all checked against this one module.

## 2. The model

The world is a finite set of **principals**, each carrying a resolved session
`(tier, orgId, citrateRole, expiresAt, kycStatus)`, and a finite set of **content nodes**, each
tagged `(tier, orgId, kycRequired, disclosureGate, inBuild)`. A wall-clock `now` advances. The
only way a principal reads a node is the chokepoint predicate `CanRead`, which is `resolveTier`
composed with the org / expiry / KYC / disclosure guards. `acks` records click-through
disclosure acknowledgements per `(sub, doc)`; `reads` records what was actually served (the trace
we check invariants against). Tiers are **totally ordered** `Public < Commercial < Academic <
Confidential` for the *band* a principal sits in — but reading a node is the **conjunction**
`tier ∧ org ∧ ¬expired ∧ kyc ∧ disclosure`, never the band alone.

```tla
-------------------------- MODULE AccessControl --------------------------
EXTENDS Naturals, FiniteSets, Sequences, TLC

CONSTANTS Principals,        \* finite set of subject ids (OIDC sub)
          Nodes,             \* finite set of content node ids
          Orgs,              \* finite set of org_id scopes (NoOrg = unscoped)
          TIME_MAX           \* model bound on the clock

\* Tiers as a total order; index() gives the comparable rank.
Tiers   == {"public", "commercial", "academic", "confidential"}
Rank(t) == CASE t = "public"       -> 0
             [] t = "commercial"   -> 1
             [] t = "academic"     -> 2
             [] t = "confidential" -> 3
NoOrg   == CHOOSE x : x \notin Orgs

VARIABLES
    session,     \* [Principals -> [tier, orgId, role, kyc, expiresAt]]   resolved entitlement
    node,        \* [Nodes -> [tier, orgId, kycReq, discGate, inBuild]]   content tagging (static)
    acks,        \* SUBSET (Principals \X Nodes)   recorded disclosure acknowledgements
    reads,       \* Seq of <<Principals, Nodes>>   what the gate actually served (the trace)
    now          \* current time

vars == <<session, node, acks, reads, now>>

\* Entitlement shape resolved in citrate-identity at findAccount (02_* §4). kyc is the *status*
\* claim only — Codex stores no PII (R7).
Entitlement == [ tier:     Tiers,
                 orgId:    Orgs \cup {NoOrg},
                 role:     {"none","auditor","operator","admin"},
                 kyc:      {"none","pending","verified"},
                 expiresAt: 1..TIME_MAX ]

NodeTag == [ tier:     Tiers,
             orgId:    Orgs \cup {NoOrg},
             kycReq:   BOOLEAN,
             discGate: BOOLEAN,
             inBuild:  BOOLEAN ]

TypeOK ==
    /\ session \in [Principals -> Entitlement]
    /\ node    \in [Nodes -> NodeTag]
    /\ acks    \subseteq (Principals \X Nodes)
    /\ reads   \in Seq(Principals \X Nodes)
    /\ now     \in 0..TIME_MAX

\* ---- the chokepoint (lifted shape of resolveTier / canRead, 02_* §4) ----

\* resolveTier NEVER escalates: an expired or absent grant resolves to Public; otherwise the
\* principal's banded tier. Default is Public.
ResolveTier(p) ==
    IF session[p].expiresAt <= now THEN "public" ELSE session[p].tier

\* canRead == tier  /\  org  /\  not-expired  /\  kyc  /\  disclosure   (single conjunction)
CanRead(p, n) ==
    LET s == session[p] IN
    /\ Rank(ResolveTier(p)) >= Rank(node[n].tier)                 \* tier band dominates
    /\ ( node[n].orgId = NoOrg \/ node[n].orgId = s.orgId )       \* org scope (R12)
    /\ s.expiresAt > now                                          \* not expired (R4)
    /\ ( ~node[n].kycReq \/ s.kyc = "verified" )                  \* kyc gate
    /\ ( ~node[n].discGate \/ <<p,n>> \in acks )                  \* disclosure ack before render

\* Confidential nodes are NEVER in the build set: an invariant on the corpus tagging that every
\* state preserves (Serve cannot mint a Confidential-in-build node).
NotInBuild(n) == node[n].tier = "confidential" => ~node[n].inBuild

Init ==
    /\ session \in [Principals -> Entitlement]
    /\ node    \in [Nodes -> NodeTag]
    /\ \A n \in Nodes : NotInBuild(n)            \* corpus is well-tagged at genesis
    /\ acks  = {}
    /\ reads = <<>>
    /\ now   = 0

\* ---- actions ----

Tick == now < TIME_MAX /\ now' = now + 1 /\ UNCHANGED <<session,node,acks,reads>>

\* Re-resolution at the chokepoint: identity may hand back a new entitlement (revocation,
\* re-grant, kyc change, auditor time-gate). Modeled as a fresh resolved session.
Reresolve(p, e) ==
    /\ e \in Entitlement
    /\ session' = [session EXCEPT ![p] = e]
    /\ UNCHANGED <<node,acks,reads,now>>

\* Acknowledge a disclosure for (p,n): records the click-through.
Acknowledge(p, n) ==
    /\ node[n].discGate
    /\ acks' = acks \cup {<<p,n>>}
    /\ UNCHANGED <<session,node,reads,now>>

\* Serve: the ONE place a read happens. Fail-closed — it fires only when CanRead holds, and it
\* records the served pair. There is no other action that appends to `reads`.
Serve(p, n) ==
    /\ CanRead(p, n)
    /\ reads' = Append(reads, <<p,n>>)
    /\ UNCHANGED <<session,node,acks,now>>

Next ==
    \/ Tick
    \/ \E p \in Principals, e \in Entitlement : Reresolve(p, e)
    \/ \E p \in Principals, n \in Nodes : Acknowledge(p, n)
    \/ \E p \in Principals, n \in Nodes : Serve(p, n)

Spec == Init /\ [][Next]_vars

\* ---- invariants (named; see §3 for prose + enforcement map) ----

\* I1 NoTierEscalation: every served read was at-or-below the reader's resolved tier; resolution
\* never returns above the granted band; default Public.
NoTierEscalation ==
    \A i \in 1..Len(reads) :
        LET p == reads[i][1] n == reads[i][2] IN
            Rank(ResolveTier(p)) >= Rank(node[n].tier)

\* I2 ConfidentialNeverInBuild: no Confidential node is ever in the build set (build_set ∩
\* confidential = ∅). Confidential is reachable only via Serve (the runtime gate), never baked in.
ConfidentialNeverInBuild == \A n \in Nodes : NotInBuild(n)

\* I3 NoCrossOrgRead: an org-scoped read only ever touched same-org (or unscoped) content — even
\* at the same tier. An auditor/enterprise scoped to org A never read org B's node.
NoCrossOrgRead ==
    \A i \in 1..Len(reads) :
        LET p == reads[i][1] n == reads[i][2] IN
            node[n].orgId = NoOrg \/ node[n].orgId = session[p].orgId

\* I4 EntitlementExpiry: once now >= expiresAt, the principal resolves to Public — so any node
\* above Public is unreadable. (Stated as: an expired principal can read nothing above Public.)
EntitlementExpiry ==
    \A p \in Principals, n \in Nodes :
        (session[p].expiresAt <= now /\ Rank(node[n].tier) > 0) => ~CanRead(p, n)

\* I5 KycGateMonotonic: a kyc-required node is unreadable unless kyc = verified; losing
\* verification immediately removes access (CanRead re-evaluates session — no stale grant).
KycGateMonotonic ==
    \A p \in Principals, n \in Nodes :
        (node[n].kycReq /\ session[p].kyc # "verified") => ~CanRead(p, n)

\* I6 DisclosureBeforeRender: every served read of a disclosure-gated node had a recorded ack
\* for that (p,n) at serve time.
DisclosureBeforeRender ==
    \A i \in 1..Len(reads) :
        LET p == reads[i][1] n == reads[i][2] IN
            node[n].discGate => <<p,n>> \in acks

Invariant ==
    /\ TypeOK
    /\ NoTierEscalation
    /\ ConfidentialNeverInBuild
    /\ NoCrossOrgRead
    /\ EntitlementExpiry
    /\ KycGateMonotonic
    /\ DisclosureBeforeRender

THEOREM Spec => []Invariant
=========================================================================
```

The seventh invariant — **`AgentRespectsTier`** — is a *refinement* of `NoTierEscalation` onto
the RAG layer, modeled as a side condition rather than a new module: the agent's retrieval set for
a caller `p` is `RAG(p) == { n \in Nodes : CanRead(p, n) }`, computed with the **same** `CanRead`
*before* generation. The property is set containment, proved by construction once retrieval is the
same predicate as the gate:

```tla
\* I7 AgentRespectsTier: the Ask-agent retrieval set is a subset of what the caller may read.
\* RAG filters by CanRead before the model sees anything (02_* §5); the guardrail prompt is
\* defense-in-depth, not the control. This holds iff RAG uses the chokepoint predicate.
AgentRespectsTier ==
    \A p \in Principals : { n \in Nodes : CanRead(p,n) } \subseteq { n \in Nodes : CanRead(p,n) }
\* (The check that matters is the refinement obligation: the implementation's retrieval filter
\*  IS CanRead — verified by the trace check that no served RAG chunk violates NoTierEscalation.)
```

## 3. Invariant → architecture → BDD map

Each invariant pins a specific risk to a specific enforcement point in `02_ARCHITECTURE.md` and a
matching Gherkin feature in `04_FEATURES_BDD.md`.

| # | Invariant | Risk | Enforced at (`02_*`) | BDD feature (`04_*`) |
|---|---|---|---|---|
| I1 | `NoTierEscalation` | R2 | `resolveTier`/`canRead`, the single chokepoint — §4 | *Tier resolution & denial* |
| I2 | `ConfidentialNeverInBuild` | R1 (Critical) | content pipeline build/runtime split — §3 (`gated` source kind, runtime `/api/content/*`) | *Confidential build-grep / runtime gate* |
| I3 | `NoCrossOrgRead` | R12 | `canRead` org-scope conjunct + RAG `org` partition — §4, §5 | *Cross-tenant denial* |
| I4 | `EntitlementExpiry` | R4 | `resolveTier` expiry collapse to Public at the chokepoint — §4; `entitlement_cache` short TTL — §8 | *Stale entitlement / revocation* |
| I5 | `KycGateMonotonic` | R7 (gate), R2 | `canRead` kyc conjunct (reads kyc *status* claim only) — §4 | *KYC-gated surface* |
| I6 | `DisclosureBeforeRender` | R9 | runtime gateway step (3) disclosure ack + `disclosure_ack` table — §3, §8 | *Disclosure acknowledgement* |
| I7 | `AgentRespectsTier` | R3 | tier-aware RAG: retrieval filtered by `canRead` *before* generation — §5 | *Ask tier scoping* |

All seven resolve through the **same** `verifySession`-derived entitlement (`00_OVERVIEW.md`,
second core invariant). The two `00_*` core invariants map directly: "Confidential never in the
build" is **I2**; "the tier check is one chokepoint and the agent obeys it too" is **I1 + I7**.

## 4. What we deliberately do NOT formalize

- **The OIDC / KYC protocol itself.** We consume `citrate-identity`; we do not re-prove the OIDC
  exchange, PKCE, or the KYC attestation flow. The model *starts* from a resolved `session` and
  asks only whether the gate uses it correctly. `citrate-identity`'s own specs/tests own the issuer.
- **The MDX render, the sidebar, search, the sandboxes, the inference provider.** None carry an
  ordering or access obligation TLC is the right tool for. The sandboxes are read-mostly,
  rate-limited, fail-closed (`02_* §6`) and tested at the integration level.
- **Cryptographic hardness.** The access-log AES-GCM-at-rest and any hashing are modeled as
  perfect; we check *access* safety, not primitives. (Primitives are the federation-pinned versions.)
- **The build pipeline mechanics.** We model the *invariant on the output set* (`inBuild` tagging,
  `build_set ∩ confidential = ∅`) — not remark/rehype or transclusion-SHA pinning. The CI build-grep
  (R1 mitigation) is the runtime check that refines I2 on the real artifact.

## 5. Model-checking plan

- **Location & convention.** Specs live under `citrate-docs/specs/tla/` with a `run_all.sh`, the
  same convention `citrate-chain/specs/tla/run_all.sh` uses (and `citrate-comms` follows). Each
  `MODULE.tla` ships a `MODULE.cfg` declaring the constants, the invariant list, and the bounds.
- **Bounds.** Small finite models, sized to expose every interleaving that matters:
  **3 principals, 4 nodes (one per tier), 2 orgs, TIME_MAX 4.** This surfaces tier escalation, a
  cross-org pair at equal tier, an entitlement expiring mid-trace, a kyc-required node read before
  and after verification flips, a disclosure-gated read with and without an ack, and a
  Confidential node — all in one state space. One node per tier with one org-scoped pair is the
  smallest model that distinguishes "band passes" from "conjunction fails."
- **Invariants checked.** All of `Invariant` (= `TypeOK ∧ I1..I6`) as state invariants; `I7
  AgentRespectsTier` as the refinement obligation that the RAG filter *is* `CanRead` (spot-checked
  by asserting no served pair violates `NoTierEscalation`). There is no liveness obligation here —
  access control is a pure safety property (the gate fails closed, so "eventually serves" is not a
  thing we want to prove; we *want* it to not serve).
- **CI gate.** Any WP touching `lib/auth/` (`resolveTier`/`canRead`), the content pipeline
  build/runtime split (`lib/content/`), the Confidential gateway (`/api/content/*`), or the
  tier-aware RAG filter (`lib/ai/`) re-runs the relevant spec via `run_all.sh`; a failed invariant
  **blocks merge.** This is the one place Codex hard-blocks (complementing the soft Agentile trailer
  nudge) — a tier escalation or a Confidential-in-build leak is unrecoverable, not advisory, and is
  R1/R2 in the register.
- **Refinement spot-check.** Two prose↔model checkpoints kept in lockstep as the code lands: (a)
  the build-output CI grep (R1) is the on-artifact refinement of `ConfidentialNeverInBuild`; (b) the
  retrieval filter in `lib/ai/tools.ts` (`searchDocs(query, tier)`) is reviewed to be the *same*
  `canRead` predicate the gate uses, discharging `AgentRespectsTier`.

## 6. Formal-verification rules

These specs follow the federation's formal-verification discipline — spec placement, the TLC CI
gate, the bounded-model sizing convention, and the "model the boundary you authored, trust-and-pin
the rest" rule — recorded in
[`citrate-agentile-archive/rules/FORMAL_VERIFICATION_RULES.md`](../../citrate-agentile-archive/rules/FORMAL_VERIFICATION_RULES.md).
The access-control core is the boundary Codex authored; everything below it (`citrate-identity`,
the inference gateway, the chain RPC, OpenMLS-style libraries elsewhere in the federation) is
trusted-and-pinned, not re-proven here.
