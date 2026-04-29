---
title: "The BR1J Constitution: DAO Governance Declaration and Code of Ethics (v3)"
version: v3
created: 2026-04-28T04:15:00Z
branch: main
author: Larry Klosowski + Lauren Mendenhall + Claude Opus 4.7
status: active
maturity: Specified — `TreasuryGovernor` deployed; legal entity filed (Wyoming)
supersedes: v2
---

# Paper VIII — The BR1J Constitution (v3)

## Abstract

A decentralized autonomous organization is defined by what it
will **refuse** to do. This paper is the constitutional law of
the Citrate DAO — the boundaries within which all governance
operates and outside which no proposal can pass.

v3 inherits v2's seven principles unchanged but tightens the
**operational mechanics** to match the deployed `TreasuryGovernor`
contract (`0x541923570Df41b307cA037fdD0fb508502885455`) and the
2-step governance pattern (`Governable` mixin) introduced by
sprint RFI26-05.

## 1. Legal standing

| Layer | Entity | Jurisdiction |
|-------|--------|--------------|
| DAO operator | **BR1J Hodling Co** | Wyoming W.S. 17-31-101 (DAO LLC) |
| Operating company | **Dandi Health Inc** | Delaware C-Corp |
| Foundation | **Cnidarian Foundation** | nonprofit, jurisdiction TBD |

Wyoming W.S. 17-31-101 (the 2021 DAO LLC statute) recognizes a
DAO as a member-managed LLC where the on-chain governance
contract IS the operating agreement. Member liability is
limited to staked SALT.

The **practical implication**: contributors who hold $SALT and
participate in governance are members of BR1J Hodling Co. They
have voting rights, fiduciary protections, and tax treatment as
LLC members.

## 2. The seven principles

These principles are **inviolate** — no governance proposal,
including a 100% supermajority constitutional amendment, can
override them. They are the network's value floor.

### 2.1 Collective intelligence

Decisions over network parameters draw on **multiple sources**.
A proposal informed by one node's view of the world is rejected
in favor of a proposal informed by paraconsistent aggregation
across many nodes. Encoded operationally as: governance
proposals must include a `rationale_signers` field with at least
3 distinct addresses.

### 2.2 Human-AI symbiosis

AI systems are **partners** but do not vote autonomously. An AI
contribution to a proposal is recorded (and rewarded under the
`AppDevelopment` contribution type), but the **human operator's
governance weight is what counts at the ballot box**. AI agents
have no token-balance accounts of their own with voting rights.

### 2.3 Autonomy with accountability

Every privileged action by an AI agent (or by an automated
script with elevated permissions) **must be recorded** in
`AgentDecisionRegistry` (`0x0aaa6e00FCab1dA5599F6DCE86e361A5e03A5759`).
Any human operator can audit which automated actions touched
their account. Unrecorded automated actions are by default
prohibited.

### 2.4 On-chain governance

All decisions affecting network parameters happen via on-chain
votes. Off-chain coordination (Discord, Snapshot polls) is
allowed for **discussion** but the binding decision happens via
TreasuryGovernor. There is no committee with private veto power.

### 2.5 Equitable distribution

The system pursues low Gini coefficient on SALT holdings as an
explicit goal. Contributing types and reward weights (Paper VII)
are tuned to spread holdings; concentrated whales are countered
with quadratic-voting modifiers on parameter changes >10% deltas.

### 2.6 Data privacy

User data flowing through the network is **opt-in for retention**.
Inference requests are not stored on-chain by default. Training
data is registered by content hash (CID), not content; the
underlying data lives on IPFS and is unpinnable by its owner.

### 2.7 Adaptive amendment

The Constitution itself can be amended, but only through the
highest-quorum (50%) voting threshold and with a 7-day timelock
between approval and activation. The principles in §2.1–2.6 are
**not amendable** by any quorum — they are the floor.

## 3. Governance mechanics

### 3.1 Voting weight formula

```
weight(addr) = blue_score(addr)
             + contribution_score(addr)
             + governance_participation(addr)
```

Each term is normalized to a [0, 1] range; the sum is in
[0, 3]. This means:

- A passive whale with high SALT but no blue_score, no
  contribution score, and no governance participation has
  **no voting weight**.
- An active validator + adapter creator + governance participant
  with modest SALT holdings has **substantial voting weight**.

This is the v3 substantive change in voting: it's no longer
"weighted by SALT balance." It's weighted by **demonstrated
participation**.

### 3.2 Tiered quorums

| Proposal class | Quorum | Time to activation |
|----------------|-------:|--------------------|
| Operational parameter (≤10% delta) | 25% | 1 day timelock |
| Operational parameter (>10% delta) | 33% | 3 day timelock |
| Mint / spend from Treasury | 40% | 5 day timelock |
| Constitutional amendment | 50% | 7 day timelock |
| Inviolate principle override | ∞ (impossible) | — |

Source: `contracts/src/TreasuryGovernor.sol` (deployed at
`0x541923570Df41b307cA037fdD0fb508502885455`).

### 3.3 Two-step governance transfer

Governance roles use the `Governable` mixin (sprint SOL-21,
RFI26-05). Transferring governance is two-step:

1. Current governance calls `proposeGovernance(newAddr)`.
2. `newAddr` calls `acceptGovernance()` to confirm.

This prevents accidental locking out (typo'd address) and
adversarial replacement (a stolen private key cannot
unilaterally transfer governance).

Affected contracts: `BudgetAllocation`, `CashoutRequest`,
`Forwarder`, and others. Source: SOL audit fixes in commit
`be65c63e`.

## 4. Three failure modes

### 4.1 Voter apathy

When governance turnout drops below quorum, the network's
parameters become **frozen**. Mitigations:

- Governance participation is a contribution type (Paper VII)
  with weight 0.5×. Voting earns SALT.
- Important proposals are bundled with smaller proposals to
  drive incidental turnout.
- A specially privileged "delegate" mechanism (à la Compound
  governance) lets users assign voting power to active
  delegates. Delegates with non-trivial vote share are
  scrutinized publicly.

### 4.2 Whale capture

A small group acquires > 50% of voting weight via SALT
acquisition. v3 mitigates with the **weight formula** (§3.1) —
weight = blue_score + contribution_score + governance_score
all matter. A whale who only holds SALT has near-zero
voting weight.

This is a **non-trivial defense**. It means a whale must also
**run validators** (raise their blue_score), **participate in
governance regularly** (raise their gov_score), and
**contribute non-trivially** (run model hosts, write adapters,
register data) to actually have voting power. At that point,
they're a major contributor, not a passive capital holder, and
their interests align with the network.

### 4.3 Constitutional capture

A 51%+ quorum that wants to amend the inviolate principles. The
Constitution refuses such amendments at the contract level —
attempting to set a principle override returns
`Governable_NotGovernance` revert. The only path is a network
fork, which leaves dissenting members on the original chain.

## 5. The Cnidarian Foundation

The Cnidarian Foundation is the philosophical and stewardship
arm of Citrate. It does not hold tokens; it does not vote in
governance. Its role:

- **Custody of the Constitution** — every constitutional
  amendment passes through a Foundation review (advisory, not
  binding) before activation.
- **Stewardship of the SPIRIT and SOUL documents**
  (`.agentile/SPIRIT.md`, `.agentile/SOUL.md`) which describe
  the public meaning layer the Constitution operates within.
- **Liaison to research and education partners** — university
  collaborations, academic publication, the Learning Center
  pilot program.

The Foundation is intentionally **not** a power center. Its
authority is *interpretive*, not *legislative*. It can say "this
proposal seems to violate principle 2.6" but cannot block the
proposal — that's the on-chain quorum's job.

## 6. The pedagogical layer (Learning Center)

Citrate's **Learning Center** (school-pilot product) is governed
by a separate stack: per-district `InstitutionalVault`
(`0xBF62Ee8EE209321bBDdF5DD15afd77ac327367cD`) with
`ClassroomClusterV1` (`0x4ee0BEf59a87A9ea3f91B80fd68ebFE69E72075A`)
RBAC and `Forwarder` (`0x1F17fc3525E540cFD14ED0270A87C159c56aAdEE`)
EIP-2771 meta-tx relay.

Districts operate as **subordinate DAOs** under the BR1J
Constitution: they have local governance over their own
classrooms, but constitutional principles flow down. A district
cannot, for example, opt out of §2.6 (data privacy) — the
contract refuses storage of student PII regardless of local
governance vote.

## 7. Implementation reality check

| Component | Status | Citation |
|-----------|--------|----------|
| Wyoming W.S. 17-31-101 filing | Filed | external (BR1J Hodling Co) |
| `TreasuryGovernor` contract | **Implemented + Deployed** | `0x541923570Df41b307cA037fdD0fb508502885455` |
| `Governable` 2-step mixin | **Implemented** | RFI26-05, commit `be65c63e` |
| `AgentDecisionRegistry` | **Implemented + Deployed** | `0x0aaa6e00FCab1dA5599F6DCE86e361A5e03A5759` |
| Voting weight formula | Specified | partial — blue_score live, gov_score live, contribution_score live; aggregation in voter contract pending |
| Tiered quorum activation | Specified | TreasuryGovernor supports thresholds via configuration |
| Constitutional principles in code | Specified — interpretation, not contract enforcement | bridge between text and code is documentation |

## 8. References

- Wyoming W.S. 17-31-101 (DAO LLC statute, 2021).
- Compound Governance — delegate-based voting reference.
- Aragon Court — DAO arbitration prior art.
- Citrate Paper II / III / VII — the technical and economic
  scaffolding the Constitution sits over.
- `.agentile/SPIRIT.md`, `.agentile/SOUL.md` — Foundation
  meaning layer.
