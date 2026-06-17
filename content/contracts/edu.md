---
title: Citrate Schools contracts
codex_slug: /contracts/edu
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain (contracts/src/ClassroomRegistry.sol, contracts/src/edu/ClassroomClusterV1.sol, contracts/src/edu/InstitutionTreeV1.sol, contracts/src/edu/BudgetAllocation.sol, contracts/src/edu/CashoutRequest.sol, contracts/src/edu/InstitutionalVault.sol, contracts/src/MentorMatcher.sol, contracts/src/TestnetFarmingAccounting.sol)
surfaces: [SC-edu-classroomRegistry, SC-edu-classroomClusterV1, SC-edu-institutionTreeV1, SC-edu-budget, SC-edu-cashout, SC-edu-mentor, SC-edu-vault, SC-edu-testnetFarming]
audited_against_sha: 54d1f2c
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

These are the contracts behind Citrate Schools, the stack that lets a US K-12 public school run on Citrate
while its student data stays on its own hardware. They track classrooms, roles, budgets, and teacher
cashouts on the public ledger; the records of who learns what, and the work that went into it, stay on
Citrate Ground. For developers and the people who integrate a school onto chain id 40204.

## What it is

A school district is an orchard with many rows. Citrate Schools is the registry that records the rows,
who tends each one, and what each is allowed to draw from the shared store, without ever moving the soil.
The student records, the model outputs, and the day to day work stay in the school's own Citrate Ground
instance. What reaches the public ledger is the structure around it: a classroom exists, this account is
its teacher, this budget has this much left, this cashout was approved by someone other than the person who
asked for it. US K-12 public schools have free access in perpetuity, and the on-chain stack is deliberately
thin so that the sensitive material never has to leave the building.

Every contract here gates its sensitive operations through role checks. There are two generations of the
classroom layer, and it matters which one you build against:

- **ClassroomClusterV1** is the current design. It carries scoped, multi-role access control for a whole
  institution, and it supersedes the older ClassroomRegistry.
- **ClassroomRegistry** is the first-generation, single-teacher design. It is still deployed and documented
  for the simple one-teacher flow, but new institutional work should target ClassroomClusterV1.

Above the classroom layer, **InstitutionTreeV1** records the institutional tree itself, the path from a
charter management organization down through a district to a school, with only HMAC hashes of the official
identifiers on chain and no personal data. Two contracts handle money, **BudgetAllocation** and
**CashoutRequest**, both drawing against a school treasury, the **InstitutionalVault**. **MentorMatcher**
pairs higher-accuracy mentors with mentees in the learning network, and **TestnetFarmingAccounting** is a
one-time payout that closes out the testnet.

## How to use it

Pick the path that matches the school you are bringing on.

1. **A single teacher, one classroom.** Deploy or reuse ClassroomRegistry. The teacher calls
   `createClassroom`, hands students a hashed invite code, and whitelists the models the class may reach.
   This is the lightest path and needs no governance account.
2. **A whole institution.** Use ClassroomClusterV1. Set a governance account at construction, grant org
   roles (IT, Admin, SuperAdmin) to staff, then create classrooms and grant in-classroom roles (Student,
   TA, Teacher). Account status follows a lifecycle aligned to FERPA, not a single revoke flag.
3. **A district or a charter network.** Register the tree in InstitutionTreeV1 first, the CMO, then its
   districts, then their schools, each keyed by an HMAC hash of its official code. Each school then runs its
   own ClassroomClusterV1 in the shape above.
4. **Money.** Fund the InstitutionalVault, set per-classroom limits in BudgetAllocation, and route teacher
   withdrawals through CashoutRequest, where a teacher files and governance approves. A teacher cannot
   approve their own request.

Before you trust any address, read it back from the chain:

```bash
curl -s https://rpc.citrate.ai -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0xde991179021a208cf7e6caebf3a07c229aed3d0f","latest"]}'
# a non-"0x" result confirms code is deployed at that address on chain 40204
```

## Reference

Each contract is named once with its source path. The ABI is summarized, not reproduced; read the source
for the full interface. Symbols not listed here do not exist in the contract at this SHA.

| Surface | Contract | Source | Status |
|---|---|---|---|
| SC-edu-classroomClusterV1 | ClassroomClusterV1 | `contracts/src/edu/ClassroomClusterV1.sol` | Implemented (current) |
| SC-edu-classroomRegistry | ClassroomRegistry | `contracts/src/ClassroomRegistry.sol` | Implemented (legacy) |
| SC-edu-institutionTreeV1 | InstitutionTreeV1 | `contracts/src/edu/InstitutionTreeV1.sol` | Implemented |
| SC-edu-budget | BudgetAllocation | `contracts/src/edu/BudgetAllocation.sol` | Implemented |
| SC-edu-cashout | CashoutRequest | `contracts/src/edu/CashoutRequest.sol` | Implemented |
| SC-edu-mentor | MentorMatcher | `contracts/src/MentorMatcher.sol` | Implemented |
| SC-edu-vault | InstitutionalVault | `contracts/src/edu/InstitutionalVault.sol` | Implemented; multisig path Specified |
| SC-edu-testnetFarming | TestnetFarmingAccounting | `contracts/src/TestnetFarmingAccounting.sol` | Implemented |

### ClassroomClusterV1

Source: `contracts/src/edu/ClassroomClusterV1.sol`. The current classroom layer, scoped multi-role access
control for an institution. Two planes of roles run side by side. Org roles are
`None`, `Admin`, `IT`, and `SuperAdmin`; in the access checks, Admin and SuperAdmin pass any
`onlyAdminOrAbove` gate, while IT passes only the `onlyIT` gate (which Admin and SuperAdmin also satisfy),
so Admin sits above IT for institution-wide actions. Per-classroom roles are `None`, `Student`, `TA`, and
`Teacher`. A FERPA-aligned account status state machine, `Active`, `Inactive`, `Withdrawn`, `Transferred`,
`Graduated`, `Suspended`, and `Expelled`, replaces the older binary revoke flag. Governance is a single
account with a two-step handover, not a multisig in itself; the account is typically the InstitutionalVault.

| Function | Access | Purpose |
|---|---|---|
| `transferGovernance(address)` / `acceptGovernance()` / `cancelGovernanceTransfer()` | `onlyGovernance` to propose or cancel; the pending account accepts | Two-step governance handover so a mistyped key cannot lock the institution. |
| `grantOrgRole(address, OrgRole)` | Admin or above; granting SuperAdmin requires governance | Assign an org-scope role. |
| `revokeOrgRole(address)` | `onlyAdminOrAbove` | Revoke an org role; sets status Inactive, which is reversible. |
| `setAccountStatus(address, AccountStatus)` | tiered: IT for Active/Inactive, Admin for Suspended/Withdrawn/Transferred, SuperAdmin or governance for Graduated/Expelled | FERPA lifecycle transitions; Graduated and Expelled are permanent. |
| `createClassroom(string, address teacher, uint8 gradeLevel, uint16 academicYear, string section)` returns `uint256` | `onlyAdminOrAbove` | Create a classroom, returns its id. |
| `grantClassroomRole(uint256, address, ClassroomRole)` / `revokeClassroomRole(uint256, address)` | `onlyTeacherOf`; granting Teacher needs Admin or above | Manage in-classroom roles; a teacher cannot escalate a student to teacher. |
| `transferStudent(address, uint256 from, uint256 to)` | source teacher or Admin and above | Atomic move between classrooms. |
| `registerDevice(bytes32, address)` / `revokeDevice(bytes32)` | `onlyIT` | Device certificate registry. |
| `claimClassroom(address, uint256)` | pure | Migration placeholder; returns `0`, not yet implemented at this SHA. |
| `getOrgRole`, `getClassroomRole`, `getAccountStatus`, `isActiveMember`, `isDeviceActive`, `getDeviceUser`, `getClassroomInfo`, `getClassroomName`, `getClassroomTeacher`, `getStudentCount` | view | Read accessors. |

Events: `GovernanceTransferProposed`, `GovernanceTransferred`, `GovernanceTransferCancelled`,
`AccountStatusChanged`, `OrgRoleGranted`, `OrgRoleRevoked`, `ClassroomCreated`, `ClassroomRoleGranted`,
`ClassroomRoleRevoked`, `StudentTransferred`, `DeviceRegistered`, `DeviceRevoked`.

### ClassroomRegistry

Source: `contracts/src/ClassroomRegistry.sol`. The legacy single-teacher layer, superseded by
ClassroomClusterV1 but still deployed for the simple flow. A teacher creates one classroom keyed by their
own address, mints a hashed invite code with a time to live, enrolls students who present the code, and
whitelists the models the class may reach. The structure enforces that a student is in at most one
classroom, invite codes are unique and expire, and a student can only reach a model the teacher whitelisted.
Access is governed by a single `onlyTeacher` modifier: the caller must own a classroom.

| Function | Access | Purpose |
|---|---|---|
| `createClassroom(string, uint256 maxStudents, bytes32 inviteCodeHash)` | any caller, who becomes that classroom's teacher | Create a classroom and its first invite code, default 7-day life. |
| `enrollWithCode(bytes32 inviteCodeHash)` | any non-teacher | Enroll by presenting a valid, unexpired code. |
| `unenroll()` | enrolled student | Leave the current classroom. |
| `removeStudent(address)` | `onlyTeacher` | Teacher removes a student. |
| `whitelistModel(bytes32)` / `removeModel(bytes32)` | `onlyTeacher` | Manage the per-classroom model whitelist. |
| `rotateInviteCode(bytes32)` | `onlyTeacher` | Rotate the invite code at the default life. |
| `rotateInviteCodeWithTtl(bytes32, uint64 ttlSeconds)` | `onlyTeacher` | Rotate with an explicit life, capped at `MAX_INVITE_TTL`. |
| `canStudentAccessModel(address, bytes32)` returns `bool` | view | True only when the student is enrolled and the model is whitelisted. |
| `getClassroom`, `isStudentEnrolled`, `getStudentTeacher`, `isModelWhitelistedFor`, `getActiveInviteCode`, `classroomExists` | view | Read accessors. |

Constants: `DEFAULT_INVITE_TTL = 7 days`, `MAX_INVITE_TTL = 90 days`. Events: `ClassroomCreated`,
`StudentEnrolled`, `StudentUnenrolled`, `ModelWhitelisted`, `ModelRemoved`, `InviteCodeRotated`,
`InviteCodeTtlSet`.

### InstitutionTreeV1

Source: `contracts/src/edu/InstitutionTreeV1.sol`. A four-level tenancy registry, CMO, district, school,
that records the institutional tree above the classroom layer. Every identifier stored on chain is an
HMAC-SHA-256 hash of the provider-supplied id (a CMO EIN, an NCES district or school code), so no personal
data appears on chain. Each node carries an `admin` account; only that account, or the parent's admin, or
governance can register children, and only governance can revoke a node.

| Function | Access | Purpose |
|---|---|---|
| `registerCmo(bytes32 cmoIdHash, address admin, uint8 stateIdx)` | `onlyGovernance` | Register a CMO (level 1). |
| `registerDistrict(bytes32 cmoIdHash, bytes32 districtIdHash, address admin, uint8 stateIdx)` | CMO admin or governance under a CMO; governance only for a standalone district | Register a district (level 2). |
| `registerSchool(bytes32 districtIdHash, bytes32 schoolIdHash, address admin, uint8 stateIdx)` | district admin, parent CMO admin, or governance | Register a school (level 3). |
| `revokeInstitution(bytes32 nodeKey)` | `onlyGovernance` | Mark a node revoked; admins cannot self-revoke. |
| `transferGovernance(address)` / `acceptGovernance()` / `cancelGovernanceTransfer()` | `onlyGovernance`; pending account accepts | Two-step governance handover. |
| `getNode`, `isActive`, `getInstitutionLineage`, `listDistrictsForCmo`, `listSchoolsForDistrict`, `listAllSchoolsForCmo`, `totalNodes` | view | Read accessors and tree walks. |

Events: `CmoRegistered`, `DistrictRegistered`, `SchoolRegistered`, `InstitutionRevoked`,
`GovernanceTransferProposed`, `GovernanceTransferAccepted`, `GovernanceTransferCancelled`.

### BudgetAllocation

Source: `contracts/src/edu/BudgetAllocation.sol`. Per-classroom SALT spending limits drawn against the
InstitutionalVault. Each classroom carries an allocated, spent, and monthly-limit budget; spends are gated
so they cannot exceed the remaining allocation. Governance funds and refills through a two-step transfer.

| Function | Access | Purpose |
|---|---|---|
| `allocateBudget(uint256 classroomId, uint256 amount, uint256 monthlyLimit)` | `onlyGovernance` | Set or raise a classroom budget and activate it. |
| `spendFromBudget(uint256 classroomId, uint256 amount)` | any caller | Spend against the remaining budget; reverts on overspend. |
| `refillBudget(uint256 classroomId, uint256 amount)` | `onlyGovernance` | Top up an active budget. |
| `proposeGovernance(address)` / `acceptGovernance()` | `onlyGovernance` to propose; pending account accepts | Two-step governance transfer. |
| `getRemaining`, `getAllocated`, `getSpent`, `getMonthlyLimit` | view | Read accessors. |

Events: `BudgetAllocated`, `BudgetSpent`, `BudgetExhausted`, `BudgetRefilled`, `GovernanceProposed`,
`GovernanceAccepted`.

### CashoutRequest

Source: `contracts/src/edu/CashoutRequest.sol`. Teacher-initiated SALT withdrawals with governance approval.
A teacher files a request with an amount and a hashed reason; governance approves or rejects; a teacher
cannot approve their own request. A SALT-to-USD rate in basis points is tracked for display only.

| Function | Access | Purpose |
|---|---|---|
| `requestCashout(uint256 classroomId, uint256 saltAmount, bytes32 reasonHash)` returns `uint256` | any caller, who becomes the requester | File a request, returns its id. |
| `approveCashout(uint256 requestId)` | `onlyGovernance`, and not the requester | Approve a pending request. |
| `rejectCashout(uint256 requestId, bytes32 rejectionReasonHash)` | `onlyGovernance` | Reject a pending request. |
| `setSaltUsdRate(uint256 rateBasisPoints)` | `onlyGovernance` | Update the displayed rate. |
| `proposeGovernance(address)` / `acceptGovernance()` | `onlyGovernance` to propose; pending account accepts | Two-step governance transfer. |
| `getRequestStatus`, `getRequestTeacher`, `getRequestAmount`, `getSaltUsdRate` | view | Read accessors. |

Events: `CashoutRequested`, `CashoutApprovedByAdmin`, `CashoutRejectedByAdmin`, `GovernanceProposed`,
`GovernanceAccepted`.

### MentorMatcher

Source: `contracts/src/MentorMatcher.sol`. On-chain mentor-mentee pairing for the learning network. It pairs
higher-accuracy mentors with lower-accuracy mentees under a per-mentor capacity cap, a trust floor, and a
minimum accuracy gap, all Q16.16 fixed-point and governance-mutable. Each pairing records the mentor's
accuracy at pairing time, so a later score change does not retroactively void it. The matching test is a
pure function, so an off-chain process can `eth_call` `validatePairing` and get exactly the answer the write
path would.

| Function | Access | Purpose |
|---|---|---|
| `validatePairing(address mentor, address mentee, uint32 mentorAcc, uint32 menteeAcc)` returns `PairingValidity` | view | Preview whether a pairing would be accepted. |
| `assignMentees(address mentor, address[] mentees, uint32 mentorAcc, uint32[] menteeAccs, bytes32 dimension)` | any caller | Atomic batch-assign mentees to one mentor; reverts if any fails. |
| `unassignMentee(address mentor, address mentee)` | the mentor, the mentee, or governance | Remove a pairing; the index is tombstoned and stays stable. |
| `recordNoQualifiedMentor(address mentee, uint256 cycleId)` | any caller | Emit an observability event when no mentor qualifies. |
| `getMenteeProfile(...)`, `selectBestDimension(...)` | view | Read scores from the wired ContributionAccounting source. |
| `setMentorCap`, `setTrustFloor`, `setMinAccuracyGap`, `setGovernance`, `setContributionAccounting` | `onlyGovernance` | Tune parameters and wire the score source. |
| `pairingCount`, `getPairings`, `getPairing`, `isPaired` | view | Paginated pairing reads. |

Defaults: `mentorCap = 3`, `trustFloor = 19661` (about 0.30), `minAccuracyGap = 3277` (about 0.05). Events:
`MentorAssigned`, `MentorUnassigned`, `NoQualifiedMentor`, `MentorCapUpdated`, `TrustFloorUpdated`,
`MinAccuracyGapUpdated`, `ContributionAccountingSet`.

### InstitutionalVault

Source: `contracts/src/edu/InstitutionalVault.sol`. A k-of-n multisig holding native SALT for an
institution, the treasury that BudgetAllocation and CashoutRequest draw against. Signers propose cashouts,
which need a quorum of distinct approvals, with the proposer barred from approving their own, before
execution. Any single signer can pause outflows; unpausing needs a quorum. Adding or removing a signer goes
through its own quorum-gated proposal flow. The multisig design is implemented in code, but it is **not
operational on testnet**, see Failure modes.

| Function | Access | Purpose |
|---|---|---|
| `deposit()` / `receive()` | any, payable | Fund the vault with native SALT. |
| `proposeCashout(address to, uint256 amount, bytes32 reasonHash)` returns `uint256` | `onlySigner`, not paused | Propose an outflow. |
| `approveCashout(uint256 txId)` | `onlySigner`, not paused, not the proposer | Approve a pending cashout. |
| `executeCashout(uint256 txId)` | `onlySigner`, not paused | Execute once approvals reach the threshold. |
| `rejectCashout(uint256 txId)` | `onlySigner` | Reject a pending cashout. |
| `emergencyPause()` | `onlySigner`, one signer is enough | Halt outflows immediately. |
| `unpause()` | `onlySigner`, needs a quorum | Resume after a quorum approves. |
| `proposeSignerChange` / `approveSignerChange` / `executeSignerChange` / `rejectSignerChange` | `onlySigner` | Quorum-gated add or remove of a signer. |
| `setThreshold(uint256)` | `onlySigner` | Change k, between 1 and n; this is a single-signer call and is not quorum-gated. |
| `getBalance`, `isPaused`, `getThreshold`, `getSignerCount`, `isSigner`, `getApprovalCount`, `hasApproved`, `getSignerProposalApprovalCount`, `hasApprovedSignerChange` | view | Read accessors. |

Events: `Deposited`, `CashoutProposed`, `CashoutApproved`, `CashoutExecuted`, `CashoutRejected`,
`EmergencyPaused`, `Unpaused`, `SignerChangeProposed`, `SignerChangeApproved`, `SignerChangeRejected`,
`SignerAdded`, `SignerRemoved`, `ThresholdChanged`.

### TestnetFarmingAccounting

Source: `contracts/src/TestnetFarmingAccounting.sol`. A one-time payout that closes the testnet. Governance
snapshots every participant's ContributionAccounting score, in batches, then activates a stablecoin pool;
each participant claims a share proportional to their snapshot score, computed as `pool * score / totalScore`.
The snapshot is taken once and locked before distribution, and each participant claims exactly once. Claims
are reentrancy-guarded.

| Function | Access | Purpose |
|---|---|---|
| `takeSnapshot(address[] participants)` | `onlyGovernance` | The one-time initial snapshot of scores. |
| `takeSnapshotBatch(address[] participants)` | `onlyGovernance` | Add more participants for large sets; skips duplicates. |
| `activateDistribution(address stablecoin, uint256 amount)` | `onlyGovernance` | Lock the pool; the contract must already hold `amount`. |
| `claim()` | any snapshotted participant | Claim a proportional share. |
| `sweep(address to)` | `onlyGovernance` | Sweep unclaimed stablecoin after the window. |
| `calculateShare`, `getTopContributors`, `snapshotParticipantCount`, `getSnapshotPage`, `remainingDistribution` | view | Read accessors. |
| `transferGovernance` / `acceptGovernance` | inherited from Governable | Two-step governance. |

Events: `SnapshotTaken`, `SnapshotBatchAdded`, `DistributionActivated`, `Claimed`, `Swept`,
`GovernanceTransferred`.

## Design rationale

The whole stack is built to keep the sensitive material off the public ledger. A school's records and a
student's work belong on Citrate Ground, on the school's own hardware, so what reaches the chain is the
structure around them: a classroom exists, an account holds a role, a budget has a balance, a cashout was
approved by a second person. That is also why ClassroomClusterV1 replaced ClassroomRegistry. A single
`onlyTeacher` flag is enough for one teacher, but a district needs IT, administrators, and teachers with
distinct authority, and it needs a student lifecycle that matches FERPA rather than a single revoke bit. The
governance handovers are all two-step on purpose: a school's keys change hands as staff change, and a
mistyped address should never be able to lock an institution out of its own records. The money path is split
so that allocation, withdrawal, and custody are separate concerns, and no single teacher can both ask for
funds and release them.

## Failure modes

These contracts hold roles and, in the vault's case, value, so the ways they fail closed matter.

- **The vault multisig is not operational on testnet.** Per `contracts/DEPLOYED_ADDRESSES.md`, the deployed
  InstitutionalVault was launched with `SIGNER_1` set to the deployer and `SIGNER_2` and `SIGNER_3` set to
  throwaway addresses. The 2-of-3 multisig therefore cannot reach a real quorum and must not be relied on for
  value on testnet. The signers are rotated at the mainnet ceremony. The code path is Implemented; the
  operational multisig is Specified.
- **`setThreshold` is a single-signer call.** Unlike signer add and remove, which go through a quorum-gated
  proposal, any one signer can change the threshold k between 1 and n. Treat the threshold as trusted only as
  far as you trust each individual signer, and confirm the signer set before depositing.
- **Cashouts fail closed.** A cashout cannot execute without enough distinct approvals, the proposer cannot
  self-approve, and any single signer can pause all outflows immediately. The conservative direction, halting,
  is the easy one; resuming needs a quorum.
- **Budgets cannot overspend.** `spendFromBudget` reverts the moment a spend would exceed the remaining
  allocation, and an inactive budget rejects all spends.
- **Invite codes expire.** A ClassroomRegistry invite code with no recorded life, or one past its life, will
  not enroll a student; the teacher must rotate it.

## Access and canon

Public. These contracts are the open building blocks an integrator needs, and their ABIs are public on chain;
no keys, mnemonics, private endpoints, or credentials appear here or are needed to read them. The deployed
addresses are public testnet values. The sensitive material the stack exists to protect, student records and
their work, stays on Citrate Ground and never reaches this page or the public ledger. Compliance posture for
this stack, FERPA, COPPA, and CIPA, is documented under [K-12 and education](/enterprise/k12). The account and
recovery surface, Citrate Keyring, is documented under [Citrate Identity](/aa/identity). The pilot timeline,
school pilots in summer 2026, is on the [roadmap](/start/roadmap).

This is pre-audit. The contracts carry formal-methods coverage and remediation work, but they have not
completed an external third-party audit. The pilot deployment is testnet-beta on chain 40204; do not custody
material value.

## Source and verification

- **Source repo:** `citrate-chain` at SHA `54d1f2c`.
- **Paths:** `contracts/src/ClassroomRegistry.sol`, `contracts/src/edu/ClassroomClusterV1.sol`,
  `contracts/src/edu/InstitutionTreeV1.sol`, `contracts/src/edu/BudgetAllocation.sol`,
  `contracts/src/edu/CashoutRequest.sol`, `contracts/src/edu/InstitutionalVault.sol`,
  `contracts/src/MentorMatcher.sol`, `contracts/src/TestnetFarmingAccounting.sol`. Role and enum shapes
  verified against `contracts/src/edu/interfaces/IClassroomCluster.sol`.
- **Deployed addresses:** `contracts/DEPLOYED_ADDRESSES.md` (chain 40204). Verify any address with
  `eth_getCode` against `https://rpc.citrate.ai`.
- **Status:** Implemented (testnet-beta, pre-audit) for every contract, with one exception: the
  InstitutionalVault multisig path is Specified, not operational on testnet, until signers are rotated at the
  mainnet ceremony.
