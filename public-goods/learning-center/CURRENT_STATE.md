# Learning Center Current State

Last updated: 2026-04-09

This page separates the last verified Learning Center baseline from work that is
actively being built on the branch.

## Exact technical anchors

| Item | Value |
|------|-------|
| Citrate chain ID | `40204` |
| Public testnet RPC | `https://rpc.citrate.ai` |
| Education app default local RPC | `http://127.0.0.1:8545` |
| InstitutionalVault | `0x18d3e03eb3364f63db8e4f6bbd078ad8098c2c2b` |
| ClassroomClusterV1 | `0x00132c0f7fad65a6d54d2c561dc4609237437449` |
| Forwarder | `0xcb5fcad35f892e7e1da4bb4d17a48dd9e056583e` |
| BudgetAllocation | `0xdaff2b9dc254b6cb3040f8f14304d30e136fa136` |
| CashoutRequest | `0xb87a4f754ca316d2416553d04f4eded26424b536` |
| LearningCycleManager | `0x20a0b74c766e84b20558abd76a7a0fd6434a4c4c` |

The contract addresses above match the canonical register in
`citrate_v0.01.1/contracts/DEPLOYED_ADDRESSES.md` as of 2026-04-09.

## Verified baseline

The last public-ready Learning Center baseline supports the following claims:

- 7-role RBAC across student, TA, teacher, admin, super-admin, IT, and unaffiliated users
- 17 implemented Slint views across IT, admin, teacher, student, and shell flows
- 5 education contracts deployed on Citrate chain `40204`
- FERPA-aligned account lifecycle in `ClassroomClusterV1`
- bulk roster import from CSV, TSV, and XLSX into on-chain provisioning flows
- local encryption using AES-256-GCM with admin-controlled key rotation
- a meta-transaction relay path for student actions, with local proof and contract coverage
- 1092 Forge tests passing across the contract workspace
- 158 rendered Learning Center PNG snapshots in `target/gui-edu-snapshots`
- no `.unwrap()` matches in production Learning Center source

## Working-branch reality

The repository is also being used to build the `P-1` integration and live-smoke
test harness.

That means:

- the audited Phase A baseline remains the public proof point
- active test-harness branches may temporarily move ahead of the last fully green
  public verification point
- no public claim should say the end-to-end integration suite is complete until the
  new `integration` and `smoke_testnet` gates are green

In plain English: the Learning Center is real, the contract stack is deployed, the
UI exists, and the product direction is concrete. The next honest step is turning
that into hard end-to-end proof and deployment packaging.

## What we can say publicly today

- the product exists and is not slideware
- the education contract stack is deployed on chain `40204`
- the district-facing privacy and IT posture is being designed around local control,
  role isolation, auditability, and on-prem operation
- the pilot program is focused on proving workflows, packaging the app, and making
  parent and IT operations deployment-grade

## What we should not say yet

- that the product is already district-rollout complete
- that all UI flows have live testnet receipts
- that the parent portal is already finished
- that silent installers and MDM packages are already done
- that bundled tutoring AI is part of the pilot baseline

