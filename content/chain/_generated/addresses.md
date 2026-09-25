---
title: Contract addresses
codex_slug: /chain/addresses
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/addresses/40204.json
surfaces: [CHAIN-addresses]
audited_against_sha: de518be8
book_deployed_at: 2026-09-12T14:16:34Z
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 5
---

This is the canonical list of contract addresses on chain 40204 (Citrate Network). It is generated
from the federation address book (`citrate-chain/contracts/addresses/40204.json`), the single source of truth
every application reads from, and is regenerated after each re-roll or address fan-out. As of the book at
commit `de518be8`, deployed 2026-09-12 14:16:34UTC.

Not every entry in the book is deployed. At block 178426 (2026-09-25T05:28:37Z), 57 of the 76
application and account-abstraction entries have code on chain; rows marked **not deployed** have none. A call to a
not-deployed address returns empty data, and a value transfer to one succeeds and strands the value, so check the
status column before you send anything. Re-check any address yourself with
`cast code <address> --rpc-url https://rpc.citrate.ai`.

The core and account-abstraction addresses are deterministic (CREATE2 through the genesis factory), so a
re-roll moves them together and this page moves with them. The membership contracts are the exception (see below). The RPC endpoint is `https://rpc.citrate.ai` and the deployer is `0x4fAB35c8c5033c80b3a0452A873B81e6ED4ED732`.

## Core contracts

| Contract | Address | Status |
|---|---|---|
| `ModelRegistry` | `0xba36fa0da9327030bd14351db968c8c43c5a67e4` | deployed |
| `SkillRegistry` | `0x2B687899EF4aF05A18F4f36cE1fE9d51c017A97c` | deployed |
| `WrappedSALT` | `0xaa918302b94a4b0e75e01e019cc6b819b4f7c906` | deployed |
| `AgentDecisionRegistry` | `0xd4008e0b4f0bd00d630810d1f7f0f78db0ba837a` | deployed |
| `SpecRegistry` | `0x8ce7000c83d0ef5276a70bdc34bf2fa2fe0159ff` | deployed |
| `IPFSIncentives` | `0xb79e438bc8c68f7d94cf694eb0ec8eae40525680` | deployed |
| `X402Facilitator` | `0xae0d2ddc74732df4424d2a89c0815cba84be37e7` | deployed |
| `X402Paywall` | `0xca98b1678a3127a4d605ac3b37454646adbf5453` | deployed |
| `LiquidStakingPool` | `0xead6a4a47c528ecea2a86cd9d9af7504d7a5e30e` | deployed |
| `ContributionAccounting` | `0xd00d442c735c16d00f04ae31a180c78eec5ec32f` | deployed |
| `NematocystSlashing` | `0xfeb23abd20084d36a1145da8a2dc04e8b48f65c7` | deployed |
| `MarketMakerAllocation` | `0xfcc747d35d616c48bddef98a31b7e8ebc8786864` | deployed |
| `ModelMarketplace` | `0xbd94012b113c81843dc66196d13fe0667651a7f0` | deployed |
| `InferenceRouter` | `0x00463e63a5645de75083460f5f1ee108d0870815` | deployed |
| `LoRAFactory` | `0xbb7eeb6286a756b0e23af2ead3e03acca72f9e39` | deployed |
| `LearningPool` | `0xd973cc744f9fd8da55a8b08cde303d5b59a29771` | deployed |
| `LearningCycleManager` | `0xcce506d1f270f954b726c552879ebc19f3719035` | deployed |
| `ClassroomRegistry` | `0x124f5f69691e0963c3a7c4d9497d1e224568ffb3` | deployed |
| `MentorMatcher` | `0x78ca904036cd144b55f6dd07bc3e36603c6c089b` | deployed |
| `ComputeVerifier` | `0x067c16ea5c2b90045607d9b33c127606e67e61da` | deployed |
| `ComputeMarketplace` | `0x527e636389a46784b9537690716db00d4ab987d4` | deployed |
| `ComputePool` | `0xcd778fc9820ac8cada5cd95aa7cddf6e4ca4d375` | deployed |
| `HeartbeatMonitor` | `0xe9eaac272844f342266862bbefc6d117a227ad9b` | deployed |
| `DisputeResolution` | `0x4562d2a68063a61b83683aae301fe0f480e4f03a` | deployed |
| `ComputePricingOracle` | `0x10b5c17d6f018631fc221594ed8b8bb003c9c975` | deployed |
| `StablecoinTreasury` | `0x0e9c5953bd7c77252119e32f989ba94f735c8599` | deployed |
| `BulkComputeGateway` | `0xf55f743e4a20557f03fdaa3cc43b0d2354c73c79` | deployed |
| `TestnetFarmingAccounting` | `0x220cc378641607df8ff9cff6e985d67331704ca4` | deployed |
| `TreasuryGovernor` | `0xab7c486db6377225453a04a0bf7161291f2611b1` | deployed |
| `InstitutionalVault` | `0xb38a64922fad87e86e36254dc2fd65a971eb211e` | deployed |
| `ClassroomClusterV1` | `0xdd6bad78e88147a46f502e02ff56808916c8c4b8` | deployed |
| `BudgetAllocation` | `0x220a8dbb48ba3dfbe2c4f5ae162c5e5b6dc2351e` | deployed |
| `CashoutRequest` | `0xaeb938bf9eedcffb14ab2db1e8787e591b539700` | deployed |
| `AIModelRegistryPortable` | `0xda30a0408b1690afa739fb63901a6608547f4da6` | deployed |
| `AIInferenceRouterPortable` | `0x85b04c554ee0137818a0e9acbe6d5f8f4b6ef1d7` | deployed |
| `AILearningCycleCorePortable` | `0x615297a23f954681ef4b648eaaf722455eca925c` | deployed |
| `ModelAccessControl` | `0xc68f19c4f3e1fae734ca0a053af8a5b34ed98c63` | deployed |
| `TEEAttestationRegistry` | `0x0834a05a5607af5ff10dade01e1c96cd6e83bd8b` | deployed |
| `ComputePoolTraining` | `0x0858b110dfa9c61df34b9d57576e751229b900b7` | deployed |
| `KYCRegistry` | `0xf72248f5dfe5c8dab3047ae52958aa65b216be8f` | deployed |
| `IPFSIncentivesV2` | `0x951ddc6316efbeda36dcb940e4d81747415b8500` | deployed |
| `IPFSIncentivesV3` | `0xc27a867b8d076d77cf17981f235c64a0d0203a68` | deployed |
| `AggregationChallenge` | `0xe7d7ebe1242feec29d514b00c9272fbffc9e69be` | deployed |
| `ComputePoolPipeline` | `0xc05a38141bb095275f8dc24dfbbcf69722cd1a3b` | deployed |
| `ValidatorRegistry` | `0x2655d9fbbe599e75ff6e53790f99ebc9a20c93bf` | deployed |
| `EduForwarder` | `0xe4c6aa7afd77e24c838f8a490aae6f34b286faff` | deployed |
| `AnchorRegistry` | `0xfeaacf58d9a38c60cbc473c3abea55dd629cf660` | **not deployed** (no code) |
| `MeetingRegistry` | `0x8fffde6f66901b30adcd1544763c279ca1e1b30a` | **not deployed** (no code) |
| `GovernanceTemplateRegistry` | `0x90a3d1ccc159501833d1160190a58470db1a0a88` | **not deployed** (no code) |
| `GovernanceProtocolFactory` | `0xbba38be5c9a0ad00c7d24430b53a7049f46c9b3f` | **not deployed** (no code) |
| `PolicyBinding` | `0x76c41259d1454d983a2def855d532bfd67e10ea0` | **not deployed** (no code) |
| `CapabilityGrant` | `0x3139e17e23914e9442e126228f5b14658b50a449` | **not deployed** (no code) |
| `VoteAllowance` | `0xee0f77fb2e6f5f31ac8b5df14932ba4715b558bd` | **not deployed** (no code) |
| `Sortition` | `0x1eabce0dddb74f5c144c7f452a7d27292c62e900` | **not deployed** (no code) |
| `PatronageLedger` | `0x726f2c8a0bfa4145dca7c154577705803c8dafa3` | **not deployed** (no code) |
| `ModelCooperative` | `0x54b70368373b0b22ac8ad9882961228d790133bf` | **not deployed** (no code) |
| `FacilitySBTImpl` | `0xa8ad418a0be3877a797f183bade8dc52b1608ad0` | **not deployed** (no code) |
| `NetworkSBTImpl` | `0x3a6ff326f83cd77ed936dcb1620ece2f5b41d7af` | **not deployed** (no code) |
| `FacilitySBT` | `0x2520b5307752318b03047cf547b38b99311f65fb` | **not deployed** (no code) |
| `NetworkSBT` | `0x062b355f67b8252054ad59c220b3aac1cd0a0ff6` | **not deployed** (no code) |
| `CitrateMemberSBT` | `0xf0badd9eed5a81871a2f0d309b1f0a225646448a` | deployed |
| `MemberBond` | `0x7d6b92757e928ab4207be3b54166ecd2c491aa92` | deployed |
| `MembershipStakeVaultImpl` | `0x72035977f3ec295c70e2a734acbdffb0c98e6f0b` | deployed |
| `MembershipStakeVault` | `0x53fb4badffaceedd575d47d0e74bb721504f786e` | deployed |
| `CitrateCooperativeFactory` | `0xd4750aa00f0634cb2d5154dfc19eb8dcbc885e9f` | **not deployed** (no code) |
| `CoopDeployer` | `0xccdfcb866f42dcde3aa19d2aa1434e4c3c6a3b48` | **not deployed** (no code) |
| `CoopMembershipSBT` | `0xb455c14880aca8eeddf95f6e1dcfddb13d8b6a83` | **not deployed** (no code) |
| `ContributionRewardPool` | `0x2aee5a81e0fa056d2e6949d71aaf96456218b6c8` | **not deployed** (no code) |
| `CoopGovernor` | `0x8046c10f1bb4bf58cedb4a7a55ebfa7f8b09e64b` | **not deployed** (no code) |

## Membership

The membership soulbound token and stake vault are top-level entries in the book. They are deployed by
nonce rather than through the CREATE2 factory, so their addresses change at every re-roll; always read them
from the book.

| Contract | Address | Status |
|---|---|---|
| `CitrateMemberSBT` | `0xf0bADD9Eed5A81871a2F0D309b1f0a225646448a` | deployed |
| `MembershipStakeVault` | `0x53fB4baDfFacEEDD575D47D0E74Bb721504F786e` | deployed |

## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

| Contract | Address | Status |
|---|---|---|
| `EntryPoint` | `0x97d5391a647429233e202f99231743c53a648f3c` | deployed |
| `CitrateWallet` | `0x2D742B98D867Fc7363F530DD6d756622e4Eb768D` | deployed |
| `CitrateWalletFactory` | `0x86486d1de9f256e2cba327c46ac11120df0aa51a` | deployed |
| `CitratePaymaster` | `0xfdc9f7a72163b5d45becdb8a9d8d44b970f77318` | deployed |
| `WebAuthnP256Validator` | `0x0f421a99a0b8f6138dea12f45a523cb896d09fc7` | deployed |
| `CitrateECDSAValidator` | `0xd2d35421379ae5b461e216bfcdd1b7e6a64bbc40` | deployed |
| `GuardianRecoveryModule` | `0x0a909769160c1945401b8f37a9310d37dbb6a891` | deployed |

## Precompiles

Precompiles are fixed genesis addresses and do not move across re-rolls.

| Contract | Address | Status |
|---|---|---|
| `ModelDeploy` | `0x0000000000000000000000000000000000000100` | precompile (no code by design) |
| `ModelInference` | `0x0000000000000000000000000000000000000101` | precompile (no code by design) |
| `BatchInference` | `0x0000000000000000000000000000000000000102` | precompile (no code by design) |
| `ModelMetadata` | `0x0000000000000000000000000000000000000103` | precompile (no code by design) |
| `ModelBenchmark` | `0x0000000000000000000000000000000000000105` | precompile (no code by design) |
| `ModelEncryption` | `0x0000000000000000000000000000000000000106` | precompile (no code by design) |
| `TensorCommit` | `0x0000000000000000000000000000000000000107` | precompile (no code by design) |
| `InferenceProofVerify` | `0x0000000000000000000000000000000000000108` | precompile (no code by design) |
| `MerkleVerifyTensor` | `0x0000000000000000000000000000000000000109` | precompile (no code by design) |
| `TensorMatmulQ16` | `0x000000000000000000000000000000000000010a` | precompile (no code by design) |
| `TensorDotQ16` | `0x000000000000000000000000000000000000010b` | precompile (no code by design) |
| `TensorSoftmaxQ16` | `0x000000000000000000000000000000000000010c` | precompile (no code by design) |
| `TensorReluQ16` | `0x000000000000000000000000000000000000010d` | precompile (no code by design) |
| `TensorLinearQ16` | `0x000000000000000000000000000000000000010e` | precompile (no code by design) |
| `TensorTransposeQ16` | `0x000000000000000000000000000000000000010f` | precompile (no code by design) |
| `BelnapAggregate` | `0x0000000000000000000000000000000000000110` | precompile (no code by design) |
| `RoutingInference` | `0x0000000000000000000000000000000000000111` | precompile (no code by design) |
| `Ed25519Verify` | `0x0000000000000000000000000000000000000120` | precompile (no code by design) |
| `X402Eip712Verify` | `0x0000000000000000000000000000000000000200` | precompile (no code by design) |
| `X402TransferAuthVerify` | `0x0000000000000000000000000000000000000201` | precompile (no code by design) |
| `X402BatchPaymentVerify` | `0x0000000000000000000000000000000000000202` | precompile (no code by design) |

