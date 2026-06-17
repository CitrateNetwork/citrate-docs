---
title: Learning Center (edu) Contracts
codex_slug: /contracts/edu
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain (contracts/src/edu/, contracts/src/ClassroomRegistry.sol, contracts/src/MentorMatcher.sol, contracts/src/TestnetFarmingAccounting.sol)
surfaces: [SC-edu-classroomRegistry, SC-edu-classroomClusterV1, SC-edu-budget, SC-edu-cashout, SC-edu-mentor, SC-edu-vault, SC-edu-testnetFarming]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Learning Center (edu) Contracts

> The on-chain contracts behind the Citrate **Learning Center**, the K-12 /
> institutional stack: classrooms, role trees, per-classroom budgets, teacher
> cashouts, mentor matching, the school treasury vault, and the testnet
> contribution payout. For developers and institution integrators building on
> Citrate (chainId **40204**).

## Overview

This page is **transcluded**: the truth lives in `citrate-chain` at the pinned
SHA (`03d7851`). Every function and event below is audited against the `.sol`
source cited per section, if a symbol is not listed here, it does not exist in
the contract at this SHA. The ABI is summarized, not reproduced (Rule 9); link
to the source for the full interface.

> **Honest status: pre-audit.** These contracts carry formal-methods coverage
> (TLA+ specs cited inline) and the SECREM-01 remediation has landed the fixes
> noted in their NatSpec, but the stack has **not** completed an external
> third-party audit. The pilot deployment is testnet-beta. Treat as
> experimental; do not custody material value. The deployed `InstitutionalVault`
> in particular ships with a **non-operational 2-of-3 multisig** on testnet
> (signers not yet rotated, see Security & access).

### Contract map

| Surface | Contract | Source | Tier | Deployed (40204) |
|---|---|---|---|---|
| SC-edu-classroomRegistry | ClassroomRegistry | `contracts/src/ClassroomRegistry.sol` | public | `0x541923570df41b307ca037fdd0fb508502885455` |
| SC-edu-classroomClusterV1 | ClassroomClusterV1 | `contracts/src/edu/ClassroomClusterV1.sol` | public | `0xde991179021a208cf7e6caebf3a07c229aed3d0f` |
| SC-edu-budget | BudgetAllocation | `contracts/src/edu/BudgetAllocation.sol` | public | `0x26bad758eac1bac02457f8e4544269b8b52bc5d7` |
| SC-edu-cashout | CashoutRequest | `contracts/src/edu/CashoutRequest.sol` | public | `0xf3c58459e723d7eabe2a61c6a97776bc2f5e28ed` |
| SC-edu-mentor | MentorMatcher | `contracts/src/MentorMatcher.sol` | public | `0x516380b0acef9a9541641c85dbe0bf89b3e56977` |
| SC-edu-vault | InstitutionalVault | `contracts/src/edu/InstitutionalVault.sol` | **commercial** | `0xf0dca50f418acfb8917d71d8bb65393308629381` |
| SC-edu-testnetFarming | TestnetFarmingAccounting | `contracts/src/TestnetFarmingAccounting.sol` | public | `0xd85e83cab6c5947e2cc5e77244edfce110309724` |

> Addresses from `contracts/DEPLOYED_ADDRESSES.md` (testnet-beta, chain 40204).
> Always cross-verify with `eth_getCode` against `https://rpc.citrate.ai` before
> trusting an address.

---

## ClassroomRegistry

Source: `contracts/src/ClassroomRegistry.sol` (license MIT). Backed by
`ClassroomRegistry.tla` invariants INV-1…INV-8.

**Purpose.** First-generation teacher-student classroom management. A teacher
creates one classroom keyed by their address, mints a hashed invite code (with a
TTL), enrolls students who present the code, and whitelists the models students
may access. Enforced structurally: a student is in at most one classroom, invite
codes are unique and expire, and a student can only reach models their teacher
whitelisted.

> Superseded by **ClassroomClusterV1** (LC-8) for multi-role institutional RBAC,
> but still deployed and documented for the single-teacher flow.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `createClassroom(string name, uint256 maxStudents, bytes32 inviteCodeHash)` | any (becomes that classroom's teacher) | Create a classroom + initial invite code with default 7-day TTL. |
| `enrollWithCode(bytes32 inviteCodeHash)` | any non-teacher | Enroll by presenting a valid, unexpired invite code. |
| `unenroll()` | enrolled student | Leave current classroom. |
| `removeStudent(address student)` | `onlyTeacher` | Teacher removes a student. |
| `whitelistModel(bytes32 modelHash)` / `removeModel(bytes32 modelHash)` | `onlyTeacher` | Manage the per-classroom model whitelist. |
| `rotateInviteCode(bytes32 newCodeHash)` | `onlyTeacher` | Rotate invite code (default TTL). |
| `rotateInviteCodeWithTtl(bytes32 newCodeHash, uint64 ttlSeconds)` | `onlyTeacher` | Rotate with explicit TTL (capped at `MAX_INVITE_TTL` = 90 days). |
| `canStudentAccessModel(address student, bytes32 modelHash)` → `bool` | view | Structural INV-6 check: enrolled **and** model whitelisted. |
| `getClassroom`, `isStudentEnrolled`, `getStudentTeacher`, `isModelWhitelistedFor`, `getActiveInviteCode`, `classroomExists` | view | Read accessors. |

Constants: `DEFAULT_INVITE_TTL = 7 days`, `MAX_INVITE_TTL = 90 days`.

### Events

`ClassroomCreated`, `StudentEnrolled`, `StudentUnenrolled`, `ModelWhitelisted`,
`ModelRemoved`, `InviteCodeRotated`, `InviteCodeTtlSet`.

---

## ClassroomClusterV1

Source: `contracts/src/edu/ClassroomClusterV1.sol` (license BUSL-1.1),
`is IClassroomCluster`. Implements `ScopedRoleTree.tla` (Q-005), 8 invariants.

**Purpose.** Versioned replacement for `ClassroomRegistry` (LC-8): scoped
multi-role RBAC for an institution. Two role planes, **org roles**
(`None / IT / Admin / SuperAdmin`) and per-classroom roles
(`None / Student / TA / Teacher`), plus a FERPA-aligned **account status** state
machine (`Active / Inactive / Suspended / Withdrawn / Transferred / Graduated /
Expelled`) replacing the old binary revoke flag. Governance uses a two-step
transfer (`transferGovernance` → `acceptGovernance`) so a lost or mistyped
governance key cannot permanently lock the institution.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `transferGovernance(address)` / `acceptGovernance()` / `cancelGovernanceTransfer()` | `onlyGovernance` / pending / `onlyGovernance` | Two-step governance handover. |
| `grantOrgRole(address, OrgRole)` | Admin+ (SuperAdmin requires governance) | Assign an org-scope role. |
| `revokeOrgRole(address)` | `onlyAdminOrAbove` | Revoke org role; sets status Inactive (reversible). |
| `setAccountStatus(address, AccountStatus)` | tiered by target status | FERPA lifecycle transitions; Graduated/Expelled are permanent and need SuperAdmin/governance. |
| `createClassroom(string name, address teacher, uint8 gradeLevel, uint16 academicYear, string section)` → `uint256` | `onlyAdminOrAbove` | Create a classroom, returns its id. |
| `grantClassroomRole(uint256, address, ClassroomRole)` / `revokeClassroomRole(uint256, address)` | `onlyTeacherOf` (Teacher role needs Admin+) | Manage in-classroom roles; no privilege escalation. |
| `transferStudent(address student, uint256 from, uint256 to)` | source teacher or Admin+ | Atomic move between classrooms. |
| `registerDevice(bytes32 deviceCertHash, address)` / `revokeDevice(bytes32)` | `onlyIT` | Device cert registry. |
| `getOrgRole`, `getClassroomRole`, `getAccountStatus`, `isActiveMember`, `isDeviceActive`, `getDeviceUser`, `getClassroomInfo`, `getClassroomName`, `getClassroomTeacher`, `getStudentCount` | view | Read accessors. |
| `claimClassroom(address, uint256)` | pure | Migration placeholder, returns `0` (not yet implemented at this SHA). |

### Events

`GovernanceTransferProposed`, `GovernanceTransferred`,
`GovernanceTransferCancelled`, plus the `IClassroomCluster` events emitted:
`AccountStatusChanged`, `OrgRoleGranted`, `OrgRoleRevoked`, `ClassroomCreated`,
`ClassroomRoleGranted`, `ClassroomRoleRevoked`, `StudentTransferred`,
`DeviceRegistered`, `DeviceRevoked`.

---

## BudgetAllocation

Source: `contracts/src/edu/BudgetAllocation.sol` (BUSL-1.1),
`is IBudgetAllocation`. Q-004 invariant `BudgetCannotExceedVaultBalance`.

**Purpose.** Per-classroom SALT spending limits drawn against the
`InstitutionalVault`. Each classroom has an `allocated` / `spent` / `monthlyLimit`
budget that governance funds and refills; spends are gated so they cannot exceed
the remaining allocation. Governance uses the two-step `proposeGovernance` /
`acceptGovernance` pattern (closes RFI26-05).

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `allocateBudget(uint256 classroomId, uint256 amount, uint256 monthlyLimit)` | `onlyGovernance` | Set/raise a classroom budget and activate it. |
| `spendFromBudget(uint256 classroomId, uint256 amount)` | any | Spend against remaining budget; reverts on overspend. |
| `refillBudget(uint256 classroomId, uint256 amount)` | `onlyGovernance` | Top up an active budget. |
| `proposeGovernance(address)` / `acceptGovernance()` | `onlyGovernance` / pending | Two-step governance transfer. |
| `getRemaining`, `getAllocated`, `getSpent`, `getMonthlyLimit` | view | Read accessors. |

### Events

`BudgetAllocated`, `BudgetSpent`, `BudgetExhausted`, `BudgetRefilled` (from
`IBudgetAllocation`); `GovernanceProposed`, `GovernanceAccepted`.

---

## CashoutRequest

Source: `contracts/src/edu/CashoutRequest.sol` (BUSL-1.1), `is ICashoutRequest`.
Q-004 invariants `CashoutRequiresAdminApproval`, `SelfApprovalForbidden`.

**Purpose.** Teacher-initiated SALT withdrawal requests with admin (governance)
approval. A teacher files a request (amount + hashed reason); governance approves
or rejects; a teacher cannot approve their own request. Tracks a SALT↔USD rate
(basis points) for display. Two-step governance transfer (RFI26-05).

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `requestCashout(uint256 classroomId, uint256 saltAmount, bytes32 reasonHash)` → `uint256` | any (becomes requester) | File a cashout request, returns its id. |
| `approveCashout(uint256 requestId)` | `onlyGovernance` | Approve a pending request (not the requester, `SelfApproval` revert). |
| `rejectCashout(uint256 requestId, bytes32 rejectionReasonHash)` | `onlyGovernance` | Reject a pending request. |
| `setSaltUsdRate(uint256 rateBasisPoints)` | `onlyGovernance` | Update the displayed SALT/USD rate. |
| `proposeGovernance(address)` / `acceptGovernance()` | `onlyGovernance` / pending | Two-step governance transfer. |
| `getRequestStatus`, `getRequestTeacher`, `getRequestAmount`, `getSaltUsdRate` | view | Read accessors. |

### Events

`CashoutRequested`, `CashoutApprovedByAdmin`, `CashoutRejectedByAdmin` (from
`ICashoutRequest`); `GovernanceProposed`, `GovernanceAccepted`.

---

## MentorMatcher

Source: `contracts/src/MentorMatcher.sol` (MIT). Specs:
`MentorSelection.tla` (7 inv) and `MentorAdversarial.tla` (7 inv). RM-FL-4 / WP-4.5.

**Purpose.** On-chain mentor-mentee assignment for the federated-learning
network. Pairs higher-accuracy mentors with lower-accuracy mentees subject to a
per-mentor capacity cap, a trust floor, and a minimum accuracy gap (all Q16.16
fixed-point, governance-mutable). Each pairing records the mentor's accuracy **at
pairing time** so later score changes don't retroactively void it. The matching
predicate is a pure function so an off-chain daemon can `eth_call`
`validatePairing` and get the exact answer the write path would.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `validatePairing(address mentor, address mentee, uint32 mentorAcc, uint32 menteeAcc)` → `PairingValidity` | view | Preview whether a pairing would be accepted (uses live cap/floor/gap/assignment). |
| `assignMentees(address mentor, address[] mentees, uint32 mentorAcc, uint32[] menteeAccs, bytes32 dimension)` | any | Atomic batch-assign mentees to one mentor (reverts if any fails). |
| `unassignMentee(address mentor, address mentee)` | mentor, mentee, or governance | Remove a pairing (tombstoned, indices stable). |
| `recordNoQualifiedMentor(address mentee, uint256 cycleId)` | any | Emit observability event when no mentor qualifies. |
| `getMenteeProfile(address, bytes32[] dimensions, uint256 from_, uint256 to_)` → `uint256[]` | view | Paginated per-dimension scores read from `ContributionAccounting`. |
| `selectBestDimension(address mentor, address mentee, bytes32[] dimensions, uint256 from_, uint256 to_)` | view | Dimension with the largest mentor-mentee score gap. |
| `setMentorCap`, `setTrustFloor`, `setMinAccuracyGap`, `setGovernance`, `setContributionAccounting` | `onlyGovernance` | Tune parameters / wire the score source. |
| `pairingCount`, `getPairings(from_, to_)`, `getPairing(mentor, mentee)`, `isPaired(mentor, mentee)` | view | Paginated pairing reads. |

Defaults: `mentorCap = 3`, `trustFloor = 19661` (≈0.30), `minAccuracyGap = 3277`
(≈0.05).

### Events

`MentorAssigned`, `MentorUnassigned`, `NoQualifiedMentor`, `MentorCapUpdated`,
`TrustFloorUpdated`, `MinAccuracyGapUpdated`, `ContributionAccountingSet`.

---

## InstitutionalVault

Source: `contracts/src/edu/InstitutionalVault.sol` (BUSL-1.1),
`is IInstitutionalVault`. Q-004 `InstitutionalVaultSafety.tla`, 9 invariants.

**Tier: commercial.** Multi-sig treasury for school-controlled SALT, operator
depth surfaced to contracted institutions, not anonymous developers. No secrets
appear on this page.

**Purpose.** A k-of-n multisig holding native SALT for an institution. Signers
propose cashouts, which need a quorum of distinct approvals (proposer cannot
self-approve) before execution. Any single signer can emergency-pause outflows;
unpausing needs a quorum. Adding/removing signers and changing the threshold also
go through a quorum-gated proposal flow.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `deposit()` / `receive()` | any (payable) | Fund the vault with native SALT. |
| `proposeCashout(address to, uint256 amount, bytes32 reasonHash)` → `uint256` | `onlySigner`, not paused | Propose an outflow. |
| `approveCashout(uint256 txId)` | `onlySigner`, not paused | Approve (not the proposer). |
| `executeCashout(uint256 txId)` | `onlySigner`, not paused | Execute once `approvalCount >= threshold`. |
| `rejectCashout(uint256 txId)` | `onlySigner` | Reject a pending cashout. |
| `emergencyPause()` | `onlySigner` (1-of-n) | Halt outflows immediately. |
| `unpause()` | `onlySigner` (k-of-n) | Resume after quorum. |
| `proposeSignerChange(address target, bool isAdd)` / `approveSignerChange(uint256)` / `executeSignerChange(uint256)` / `rejectSignerChange(uint256)` | `onlySigner` | Quorum-gated signer add/remove. |
| `setThreshold(uint256)` | `onlySigner` | Change k (0 < k ≤ n). |
| `getBalance`, `isPaused`, `getThreshold`, `getSignerCount`, `isSigner`, `getApprovalCount`, `hasApproved`, `getSignerProposalApprovalCount`, `hasApprovedSignerChange` | view | Read accessors. |

### Events

`Deposited`, `CashoutProposed`, `CashoutApproved`, `CashoutExecuted`,
`CashoutRejected`, `EmergencyPaused`, `Unpaused`, `SignerChangeProposed`,
`SignerChangeApproved`, `SignerChangeRejected`, `SignerAdded`, `SignerRemoved`,
`ThresholdChanged` (from `IInstitutionalVault`).

---

## TestnetFarmingAccounting

Source: `contracts/src/TestnetFarmingAccounting.sol` (MIT),
`is ReentrancyGuard, Governable`. Sprint ECON-2 / WP-E2.2.

**Purpose.** A one-time testnet-conclusion payout. Governance snapshots every
participant's `ContributionAccounting` score (in batches), then activates a
stablecoin distribution pool; each participant claims a share proportional to
their snapshot score (`pool * score / totalScore`). Snapshot is taken once and
locked before distribution; each participant claims exactly once.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `takeSnapshot(address[] participants)` | `onlyGovernance` | One-time initial snapshot of contribution scores. |
| `takeSnapshotBatch(address[] participants)` | `onlyGovernance` | Add more participants (large sets); skips duplicates. |
| `activateDistribution(address stablecoin, uint256 amount)` | `onlyGovernance` | Lock the pool (contract must already hold `amount`). |
| `claim()` | any snapshotted participant | Claim proportional share (reentrancy-guarded). |
| `sweep(address to)` | `onlyGovernance` | Sweep unclaimed stablecoin after the window. |
| `calculateShare(address)`, `getTopContributors(uint256)`, `snapshotParticipantCount()`, `getSnapshotPage(offset, limit)`, `remainingDistribution()` | view | Read accessors. |
| `transferGovernance` / `acceptGovernance` | inherited from `Governable` | Two-step governance. |

### Events

`SnapshotTaken`, `SnapshotBatchAdded`, `DistributionActivated`, `Claimed`,
`Swept`; `GovernanceTransferred` (from `Governable`).

---

## Tutorials

- [Read a verified contract](/contracts/tutorials/read-a-contract), query any of
  these contracts over `eth_call` / an SDK without sending a transaction.

## Security & access

- **Tier rationale.** ClassroomRegistry, ClassroomClusterV1, BudgetAllocation,
  CashoutRequest, MentorMatcher and TestnetFarmingAccounting are **public**, they are the open building blocks an institution integrator needs, and their
  ABIs are inherently public on-chain. **InstitutionalVault is commercial**: it
  is the treasury operator surface for contracted institutions; gating the
  narrative (not the bytecode, which is public) honors the paid relationship.
- **No secrets here.** No keys, mnemonics, private endpoints, or credentials
  appear on this page or are required to read these contracts. Deployed addresses
  are public testnet values.
- **Operational caveat (testnet).** Per `DEPLOYED_ADDRESSES.md`, the deployed
  `InstitutionalVault` was launched with `SIGNER_1 = deployer` and
  `SIGNER_2/3 = throwaway` addresses; the 2-of-3 multisig is **non-operational**
  until signers are rotated at the mainnet ceremony. Do not rely on it for value
  on testnet.
- **Pre-audit.** No external third-party audit has been completed. Formal-methods
  coverage (the cited TLA+ specs) and SECREM-01 remediation are in place, but
  this is not a certification.

## Source & verification

- **Source repo:** `citrate-chain` at SHA `03d7851`.
- **Paths:** `contracts/src/ClassroomRegistry.sol`,
  `contracts/src/edu/ClassroomClusterV1.sol`,
  `contracts/src/edu/BudgetAllocation.sol`,
  `contracts/src/edu/CashoutRequest.sol`, `contracts/src/MentorMatcher.sol`,
  `contracts/src/edu/InstitutionalVault.sol`,
  `contracts/src/TestnetFarmingAccounting.sol`.
- **Deployed addresses:** `contracts/DEPLOYED_ADDRESSES.md` (chain 40204).
- Verify any address with `eth_getCode` against `https://rpc.citrate.ai`.
