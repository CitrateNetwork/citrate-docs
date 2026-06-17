---
title: Governance Contracts
codex_slug: /contracts/governance
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/src/{TreasuryGovernor,DisputeResolution,AgentDecisionRegistry,SpecRegistry}.sol
surfaces: [SC-gov-treasury, SC-gov-dispute, SC-gov-agentDecision, SC-gov-spec]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Governance Contracts

> The on-chain governance surface for the Citrate network: treasury DAO, compute
> dispute resolution, the agent-decision audit trail, and the behavioral-spec
> registry. Reference for contracted integrators and operators.

## Overview

Four contracts make up the governance layer. They share a common two-step
ownership pattern (the `Governable` mixin: `transferGovernance` →
`acceptGovernance`, with `cancelGovernanceTransfer` before acceptance) so a
mistyped successor can never lock governance.

| Contract | Tier | Role |
|---|---|---|
| `TreasuryGovernor` | commercial | On-chain DAO for SALT/stSALT treasury spending |
| `DisputeResolution` | commercial | Bisection game for challenged compute results |
| `AgentDecisionRegistry` | commercial | On-chain audit trail of AI-agent tool executions |
| `SpecRegistry` | academic | Domain → IPFS Gherkin-spec registry agents must check |

> **Status: pre-audit.** These contracts carry inline remediation notes
> (e.g. `audit SOL-21`) but have not completed a final third-party audit. Treat
> all addresses and parameters as subject to change before mainnet.

## Reference

### TreasuryGovernor
`contracts/src/TreasuryGovernor.sol`, full on-chain governor. Voting power =
native SALT balance + stSALT shares × share price (from `LiquidStakingPool`).
Lifecycle: propose → vote → queue (timelock) → execute.

Key parameters (constants): `PROPOSAL_THRESHOLD` (10,000 SALT),
`VOTING_PERIOD` (50,400 blocks), `EXECUTION_DELAY` (7,200),
`QUORUM_BPS` (1,000 = 10%), `APPROVAL_BPS` (6,000 = 60%),
`GRACE_PERIOD` (50,400), `EMERGENCY_THRESHOLD_MULTIPLIER` (3×).

Proposal creation (all `payable`, return `proposalId`):
- `proposeTreasurySpend(title, description, stablecoin, recipients[], amounts[])`
- `proposeParameterChange(title, description, parameterKey, parameterValue)`
- `proposeOracleUpdate(title, description, target, newOracle)`
- `proposeEmergency(title, description)`, requires 3× threshold

Voting / lifecycle:
- `castVote(proposalId, support)`, `VoteType` is `For(0)`, `Against(1)`, `Abstain(2)`
- `queue(proposalId)`, only from `Succeeded` state
- `execute(proposalId)`, `nonReentrant`; re-checks quorum + approval; only
  `TreasurySpend` executes on-chain (calls `treasury.distribute()`); other types
  emit events for off-chain/multisig execution
- `cancel(proposalId)`, proposer or guardian
- `acceptGovernanceOf(target)`, permissionless completion of a Governable handover
- `transferGuardian(newGuardian)`, `onlyGuardian`

Views: `state(proposalId)` → `ProposalState`, `getVotingPower(voter)`,
`getProposal(proposalId)`, `quorumThreshold()`, `getSpendDetails(proposalId)`.

Events: `ProposalCreated`, `VoteCast`, `ProposalQueued`, `ProposalExecuted`,
`ProposalCanceled`, `GuardianTransferred`.

### DisputeResolution
`contracts/src/DisputeResolution.sol`, bisection dispute protocol
(`DisputeResolution.tla`) for challenged compute jobs. Inherits `Governable` +
`ReentrancyGuard`. Constructor takes `(disputeBond, maxBisectionRounds)`.

Flow:
- `initiateDispute(jobId, defender, rangeStart, rangeEnd)`, `payable`,
  `nonReentrant`; challenger posts bond
- `acknowledgeDispute(disputeId)`, `payable`; defender posts matching bond
- `bisect(disputeId, claimFaulty)`, challenger narrows range (halves each round)
- `respond(disputeId, stepResultHash)`, defender commits a step result
- `resolve(disputeId, challengerWins)`, `onlyGovernance` referee; pays winner,
  slashes defender via `INematocystSlashing` if challenger wins
- `timeoutDispute(disputeId)`, anyone, after deadline; challenger wins

Admin (`onlyGovernance`): `setDisputeBond`, `setMaxBisectionRounds`,
`setSlashingContract`, `setRoundDeadline`. Constant `DEFAULT_ROUND_DEADLINE`
(150 blocks).

Views: `getDispute`, `isDisputeActive`, `getRangeSize`; public mappings
`disputes`, `defenderCommits`, `jobDisputed`.

Events: `DisputeInitiated`, `BisectionStarted`, `BisectionRound`,
`DefenderResponded`, `DisputeResolved`, `DisputeTimedOut`, `WinnerPaid`,
`DefenderSlashedEvent`, `DisputeBondUpdated`, `MaxBisectionRoundsUpdated`,
`SlashingContractUpdated`.

### AgentDecisionRegistry
`contracts/src/AgentDecisionRegistry.sol`, on-chain audit trail of high-risk
agent tool executions. Inherits `Governable`. Records `(agentId, toolName,
paramsHash, blockNumber...)` per decision; disputes can be filed; a trust score
and tier (`Untrusted` < 100 ≤ `Standard` < 500 ≤ `Trusted`) are derived.

Functions:
- `registerDecision(agentId, toolName, paramsHash)`, `onlyAuthorizedRecorder`
- `disputeDecision(decisionId, evidence)`, `onlyAuthorizedDisputer`
- `resolveDispute(decisionId, upheld)`, `onlyGovernance`
- `registerDecisionWithTierCheck(...)` / `disputeDecisionWithTierCheck(...)`, same as above plus a `TrustTierChanged` emit on tier transition
- Authorization (`onlyGovernance`): `setAuthorizedRecorder(recorder, allowed)`,
  `setAuthorizedDisputer(disputer, allowed)`

Views: `getDecisionHistory(agentId)`, `getDecisionCount(agentId)`,
`getDisputeStatus(decisionId)`, `getTrustScore(agentId)` (= decisions − disputes×2),
`getTrustTier(agentId)`; public mappings `decisions`, `disputeCount`,
`authorizedRecorders`, `authorizedDisputers`; `decisionCount`.

Events: `DecisionRecorded`, `DecisionDisputed`, `DisputeResolved`,
`AuthorizedRecorderSet`, `AuthorizedDisputerSet`, `TrustTierChanged`.
Errors: `NotAuthorizedRecorder`, `NotAuthorizedDisputer`, `ZeroAddress`.

### SpecRegistry  *(academic tier)*
`contracts/src/SpecRegistry.sol`, maps an operation domain (e.g.
`"contract_deploy"`) to the IPFS CID of a Gherkin `.feature` behavioral spec
agents must check before critical operations. Inherits `Governable` (migrated
from the legacy atomic `transferGovernor` to the two-step mixin per RM-L/WP-L1.1).

Functions (mutators `onlyGovernance`): `registerSpec(domain, cid)`,
`updateSpec(domain, newCid)` (bumps version), `deactivateSpec(domain)`,
`reactivateSpec(domain)`.

Views: `getSpec(domain)` → `(cid, active, version)`, `hasActiveSpec(domain)`,
`getAllDomains()`; public `specs`, `domains`, `domainCount`.

Events: `SpecRegistered`, `SpecUpdated`, `SpecDeactivated`, `SpecReactivated`.

## Examples

```solidity
// Treasury spend proposal lifecycle
uint256 id = governor.proposeTreasurySpend(
    "Grant: Q3 dev fund", "...", usdc, recipients, amounts
);
governor.castVote(id, TreasuryGovernor.VoteType.For);
// ... voting period elapses ...
governor.queue(id);
// ... EXECUTION_DELAY blocks elapse ...
governor.execute(id);
```

## Tutorials

See `/contracts/tutorials` (governance walkthroughs) once published.

## Security & access

**Tier: commercial** (SpecRegistry: **academic**). These are deep
protocol-governance contracts whose anonymous copy would materially help a
competitor clone the network's economic/dispute machinery, but any contracted
builder should have them. SpecRegistry is part of the formal-methods/agent-safety
research surface, hence academic. **No secrets here**, no keys, no private
endpoints; addresses are not yet listed (pre-audit, pre-deployment).

## Source & verification

Source repo: `citrate-chain`, files under `contracts/src/`
(`TreasuryGovernor.sol`, `DisputeResolution.sol`, `AgentDecisionRegistry.sol`,
`SpecRegistry.sol`). Audited against SHA `03d7851`.
