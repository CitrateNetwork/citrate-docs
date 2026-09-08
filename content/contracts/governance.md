---
title: Governance Contracts
codex_slug: /contracts/governance
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/{TreasuryGovernor,DisputeResolution,AgentDecisionRegistry,SpecRegistry}.sol
surfaces: [SC-gov-treasury, SC-gov-dispute, SC-gov-agentDecision, SC-gov-spec]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The governance surface is four contracts that decide how the network spends its treasury, how it settles a
disputed compute result, and how it keeps an accountable record of what its agents do. They sit on the
public ledger, Citrate Network, and any contracted integrator should expect to read and call them.

## What it is

Governance on Citrate is not one monolith. It is four small contracts, each with one job, so that a
treasury vote, a compute dispute, an agent audit record, and a formal-specification pin never share a
failure surface. Three of the four inherit a common ownership mixin, `Governable`, which hands authority
over in two steps: the sitting governance account proposes a successor with `transferGovernance`, and the
successor must call `acceptGovernance` before it takes effect, with `cancelGovernanceTransfer` available
before acceptance. A mistyped or unreachable successor therefore cannot lock governance, because the
handover does not complete until the new account acts.

| Contract | Role | Status |
|---|---|---|
| `TreasuryGovernor` | On-chain governor for SALT and stSALT treasury spending | Implemented, pre-audit |
| `DisputeResolution` | Bisection game that settles a challenged compute result | Implemented, TLA+ specified |
| `AgentDecisionRegistry` | Audit trail of high-risk agent tool calls, with trust tiers | Implemented, pre-audit |
| `SpecRegistry` | Domain to IPFS map of the behavioral specs agents check | Implemented, pre-audit |

The four are pre-audit. They carry inline remediation notes from internal review, for example the SOL-21
governance follow-on, but they have not completed a final third-party audit. Treat every address and
parameter as subject to change before mainnet.

## How to use it

Most readers will interact with one contract at a time. The two paths worth walking end to end are a
treasury spend and a compute dispute.

1. **Move treasury funds.** Acquire the voting power, `PROPOSAL_THRESHOLD` is 10,000 SALT, then call
   `proposeTreasurySpend`. Voters call `castVote` over the voting window. After the window, call `queue`,
   wait out `EXECUTION_DELAY`, then call `execute`. Two proposal types execute on-chain: `TreasurySpend`
   calls `treasury.distribute`, and `Call` performs a generic `(target, value, calldata)` call so the
   governor can drive any governance function on a target it controls. `ParameterChange`, `OracleUpdate`,
   and `Emergency` emit an event for an off-chain multisig to act on.
2. **Dispute a compute result.** As the challenger, call `initiateDispute` with the job and the step range,
   posting the bond. The defender calls `acknowledgeDispute` with a matching bond. The challenger narrows
   the range with `bisect` each round, the defender commits a step with `respond`, and the governance
   referee ends it with `resolve`. If either side stalls past the deadline, anyone calls `timeoutDispute`
   and the challenger wins.
3. **Record an agent decision.** An authorized recorder calls `registerDecision` (or
   `registerDecisionWithTierCheck`) with the agent id, the tool name, and a hash of the parameters. An
   authorized disputer can file against it; governance resolves with `resolveDispute`.
4. **Pin a behavioral spec.** Governance calls `registerSpec` with the operation domain and the IPFS CID of
   the Gherkin feature file, and `updateSpec` to bump the version. Agents read `getSpec` before a critical
   operation.

## Reference

The audited surface, each item citing its source file under `contracts/src/`.

### TreasuryGovernor

Source: `contracts/src/TreasuryGovernor.sol`. A full on-chain governor for treasury operations. Voting
power is the voter's native SALT balance plus their stSALT shares valued at the share price read from
`LiquidStakingPool`. The lifecycle is propose, vote, queue behind a timelock, then execute. Parameters are
fixed as constants and match `core/economics/src/governance.rs`.

| Constant | Value | Meaning |
|---|---|---|
| `PROPOSAL_THRESHOLD` | 10,000 SALT | Minimum voting power to open a proposal |
| `VOTING_PERIOD` | 50,400 blocks | Voting window, measured in blocks (wall-clock depends on block time) |
| `EXECUTION_DELAY` | 7,200 blocks | Timelock before a queued proposal can execute |
| `QUORUM_BPS` | 1,000 (10%) | Quorum as basis points of total supply |
| `APPROVAL_BPS` | 6,000 (60%) | Approval threshold as basis points of votes cast |
| `GRACE_PERIOD` | 50,400 blocks | Window to execute before a queued proposal expires |
| `EMERGENCY_THRESHOLD_MULTIPLIER` | 3 | Emergency proposals need three times the threshold |

Proposal creation, each `payable`, each returning a `proposalId`:

- `proposeTreasurySpend(title, description, stablecoin, recipients[], amounts[])`
- `proposeParameterChange(title, description, parameterKey, parameterValue)`
- `proposeOracleUpdate(title, description, target, newOracle)`
- `proposeCall(title, description, target, value, data)`, generic on-chain execution against a governed target
- `proposeEmergency(title, description)`, which requires three times the threshold

Voting and lifecycle:

- `castVote(proposalId, support)`, where `VoteType` is `For` (0), `Against` (1), `Abstain` (2)
- `queue(proposalId)`, only from the `Succeeded` state
- `execute(proposalId)`, guarded by `nonReentrant`, re-checks quorum and approval, runs the treasury call
- `cancel(proposalId)`, by the proposer or the guardian
- `acceptGovernanceOf(target)`, a permissionless completion of a `Governable` handover where this governor
  is the pending successor
- `transferGuardian(newGuardian)`, `onlyGuardian`

Views: `state`, `getVotingPower`, `getProposal`, `quorumThreshold`, `getSpendDetails`. Events:
`ProposalCreated`, `VoteCast`, `ProposalQueued`, `ProposalExecuted`, `ProposalCanceled`,
`GuardianTransferred`.

### DisputeResolution

Source: `contracts/src/DisputeResolution.sol`. A bisection game for challenged compute jobs, inheriting
`ReentrancyGuard` and `Governable`. The constructor takes a dispute bond and a maximum bisection-round
count. The design is written down and checked: the contract header cites `DisputeResolution.tla` with nine
invariants and the `AdversarialCompute.tla` properties, including that griefing is never profitable.

Flow:

- `initiateDispute(jobId, defender, rangeStart, rangeEnd)`, `payable`, `nonReentrant`; the challenger posts
  the bond
- `acknowledgeDispute(disputeId)`, `payable`; the defender posts a matching bond
- `bisect(disputeId, claimFaulty)`, the challenger halves the range each round
- `respond(disputeId, stepResultHash)`, the defender commits a step result
- `resolve(disputeId, challengerWins)`, `onlyGovernance`; pays the winner and, if the challenger wins,
  slashes the defender through the `INematocystSlashing` interface at the `Inconsistency` tier
- `timeoutDispute(disputeId)`, callable by anyone after the deadline; the challenger wins

Admin, all `onlyGovernance`: `setDisputeBond`, `setMaxBisectionRounds`, `setSlashingContract`,
`setRoundDeadline`. The constant `DEFAULT_ROUND_DEADLINE` is 150 blocks. Views: `getDispute`,
`isDisputeActive`, `getRangeSize`.

The slash call is wrapped in `try / catch`, so a missing or reverting slashing contract does not block the
dispute from resolving and paying the winner. The slashing target itself is documented under
[security contracts](/contracts/security).

### AgentDecisionRegistry

Source: `contracts/src/AgentDecisionRegistry.sol`. An on-chain audit trail of high-risk agent tool calls,
inheriting `Governable`. Each record holds an agent id, the tool name, a parameters hash, the block and
timestamp, the executing address, a status, and any dispute evidence. From the record count and the dispute
count it derives a trust score, decisions minus twice disputes, and a tier: `Untrusted` below 100,
`Standard` from 100 to under 500, `Trusted` at 500 or above.

Functions:

- `registerDecision(agentId, toolName, paramsHash)`, `onlyAuthorizedRecorder`
- `disputeDecision(decisionId, evidence)`, `onlyAuthorizedDisputer`
- `resolveDispute(decisionId, upheld)`, `onlyGovernance`
- `registerDecisionWithTierCheck` and `disputeDecisionWithTierCheck`, which do the same work and also emit
  `TrustTierChanged` when a tier boundary is crossed
- `setAuthorizedRecorder(recorder, allowed)` and `setAuthorizedDisputer(disputer, allowed)`, `onlyGovernance`

Views: `getDecisionHistory`, `getDecisionCount`, `getDisputeStatus`, `getTrustScore`, `getTrustTier`.
Events include `DecisionRecorded`, `DecisionDisputed`, `DisputeResolved`, and `TrustTierChanged`. The
contract reverts with `NotAuthorizedRecorder`, `NotAuthorizedDisputer`, or `ZeroAddress`.

A second contract, `AgentDecisionRegistryV2`, lives at `contracts/src/rbac/AgentDecisionRegistryV2.sol`. It
is a separate, newer design, not a drop-in replacement: it logs every signed action with a fuller shape
(user, tenant, correlation id, event class, artifact root) and is append-only against the
`AgentDecisionLog.tla` spec. It ships as a new contract with its own migration path; the V1 contract above
is the one this page documents as the governance audit trail, and it remains current.

### SpecRegistry

Source: `contracts/src/SpecRegistry.sol`. A map from an operation domain, for example `"contract_deploy"`,
to the IPFS CID of a Gherkin `.feature` file that agents must check before a critical operation. It inherits
`Governable`; an earlier version had its own single-step `transferGovernor`, which was removed in the
RM-L/WP-L1.1 migration in favor of the two-step mixin.

Mutators, all `onlyGovernance`: `registerSpec(domain, cid)`, `updateSpec(domain, newCid)` which bumps the
version, `deactivateSpec(domain)`, `reactivateSpec(domain)`. Views: `getSpec` returning cid, active flag,
and version; `hasActiveSpec`; `getAllDomains`. Events: `SpecRegistered`, `SpecUpdated`, `SpecDeactivated`,
`SpecReactivated`.

A treasury spend, start to finish:

```solidity
uint256 id = governor.proposeTreasurySpend(
    "Grant: Q3 dev fund", "...", usdc, recipients, amounts
);
governor.castVote(id, TreasuryGovernor.VoteType.For);
// voting period elapses
governor.queue(id);
// EXECUTION_DELAY blocks elapse
governor.execute(id);
```

## Design rationale

We split governance into four contracts rather than one because the failure modes are different in kind. A
treasury vote is slow and deliberate and gated on capital. A compute dispute is fast and adversarial and
gated on a bond. An agent audit record is high-volume and append-only. A spec pin is rare and governed.
Folding them together would mean one upgrade, one bug, and one blast radius covering all four. Keeping them
apart costs a little duplication and buys independent review and independent upgrade.

The dispute game is bisection rather than full re-execution because re-running a long computation on chain
is not affordable. Bisection narrows the disagreement to a single step in a logarithmic number of rounds,
and only that step needs adjudication. The design is written in TLA+ first so the property that matters,
that an attacker who griefs always loses net SALT, is checked before the code is trusted. That formal work
is described under [research](/research).

## Failure modes

- **Governance handover.** A handover that names the wrong successor does not complete, because the
  successor must call `acceptGovernance`. The system stays under the current governance until a real
  successor accepts. This is the point of the two-step mixin.
- **Stalled dispute.** If a party goes silent, the dispute does not hang. After the round deadline anyone
  calls `timeoutDispute` and the challenger wins, so a defender cannot escape a losing position by waiting.
- **Slashing dependency.** `DisputeResolution` calls the slashing contract inside `try / catch`. If the
  slashing target is unset or reverts, the dispute still resolves and the winner is still paid; only the
  stake penalty is skipped, and it can be applied once the dependency is fixed.
- **Treasury execution.** `execute` re-checks quorum and approval at execution time, not only at proposal
  time, and is `nonReentrant`. A proposal that lost or that has expired past the grace period cannot be
  forced through.

## Access and canon

Tier: commercial. These are deep governance contracts. An anonymous copy would materially help a competitor
clone the network's economic and dispute machinery, so the full detail is served to contracted builders,
not published openly. There are no secrets here, no keys and no private endpoints; addresses are not yet
listed because the contracts are pre-audit and pre-deployment.

The agent-safety and formal-methods pieces, `AgentDecisionRegistry` and `SpecRegistry`, are the on-chain
edge of the research surface. The behavioral specs they pin and the TLA+ work behind `DisputeResolution`
live under [research](/research). Slashing and finality are covered under
[Citrate Network consensus](/chain/consensus).

## Source and verification

- Source repo: `citrate-chain`, files under `contracts/src/`: `TreasuryGovernor.sol`,
  `DisputeResolution.sol`, `AgentDecisionRegistry.sol`, `SpecRegistry.sol`, plus
  `contracts/src/rbac/AgentDecisionRegistryV2.sol` for the V2 note and `contracts/src/lib/Governable.sol`
  for the ownership mixin.
- Audited against `citrate-chain` SHA `9d5959e`.
- Status by contract: `TreasuryGovernor` Implemented, pre-audit; `DisputeResolution` Implemented and TLA+
  specified (`DisputeResolution.tla`, `AdversarialCompute.tla`), pre-audit; `AgentDecisionRegistry`
  Implemented, pre-audit, with `AgentDecisionRegistryV2` Implemented and TLA+ specified
  (`AgentDecisionLog.tla`); `SpecRegistry` Implemented, pre-audit. None has completed a final third-party
  audit. Verify deployed bytecode yourself with `eth_getCode` once addresses are published.
