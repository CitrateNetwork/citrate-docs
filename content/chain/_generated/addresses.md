---
title: Contract addresses
codex_slug: /chain/addresses
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/addresses/40204.json
surfaces: [CHAIN-addresses]
audited_against_sha: 0aab474b
book_deployed_at: 2026-09-30T00:21:18Z
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 5
---

This is the canonical list of contract addresses on chain 40204 (Citrate Network). It is generated
from the federation address book (`citrate-chain/contracts/addresses/40204.json`), the single source of truth
every application reads from, and is regenerated after each re-roll or address fan-out. As of the book at
commit `0aab474b`, deployed 2026-09-30 00:21:18UTC.

Not every entry in the book is deployed. At block 6929 (2026-09-30T02:15:56Z), 99 of the 99
application and account-abstraction entries have code on chain; rows marked **not deployed** have none. A call to a
not-deployed address returns empty data, and a value transfer to one succeeds and strands the value, so check the
status column before you send anything. Re-check any address yourself with
`cast code <address> --rpc-url https://rpc.citrate.ai`.

The core and account-abstraction addresses are deterministic (CREATE2 through the genesis factory), so a
re-roll moves them together and this page moves with them. The membership contracts are the exception (see below). The RPC endpoint is `https://rpc.citrate.ai` and the deployer is `0xa3512bE80ABe86439525a3e5a185884aB0ccb87a`.

## Core contracts

| Contract | Address | Status |
|---|---|---|
| `ValidatorRegistry` | `0xBa4aBd4f3fcA5365b2451b4E9662e4Cfd22b3ad5` | deployed |
| `ModelRegistry` | `0x807cB7eE477Ae58C321cAEd980CEB11D78048e84` | deployed |
| `WrappedSALT` | `0xAa918302B94a4B0E75E01e019cc6b819B4F7c906` | deployed |
| `AgentDecisionRegistry` | `0x94A204DaC83C99F5ce2C8ac19fc101C07D8b9A41` | deployed |
| `SpecRegistry` | `0xf38D10dFb550EE3Bce1332A887adC0D2C75EB642` | deployed |
| `IPFSIncentives` | `0xc37aB44b145a31E8c458996437080326Fd19e129` | deployed |
| `X402Facilitator` | `0x7F7b6e8D9Ad0A8b4e6152Df6167E49E48AFB3463` | deployed |
| `X402Paywall` | `0x13e50000FFFc95D910D42Cd8D679c28F6265a970` | deployed |
| `LiquidStakingPool` | `0x68Aa320Be609A073fC8ebB7dBCD237270A5DEEb0` | deployed |
| `ContributionAccounting` | `0x52a47cAF8902D8214d1e246E74aA3Ad099DA47D1` | deployed |
| `NematocystSlashing` | `0xee9501285F7b3c8Bb99B8aF70F95b402F4D2468b` | deployed |
| `MarketMakerAllocation` | `0xb5dDD7c5146c240D53Ce6c7e87E5aCB59E4f7351` | deployed |
| `ModelMarketplace` | `0x5517A9fDD70d503a57898c86eFeaaeEF8FE06413` | deployed |
| `InferenceRouter` | `0xe1A717f0656b000e33A78B97507Cd0440Ad62570` | deployed |
| `LoRAFactory` | `0x985036F3441258B8Ff6DDa8a43EA40EEEb1D02A6` | deployed |
| `LearningPool` | `0xBA5C9c886d65a969d02e40d7FBbADe316AD81E66` | deployed |
| `LearningCycleManager` | `0x4254d5aeb3Fb90A5038e1bC5E10b30d0021990Bd` | deployed |
| `ClassroomRegistry` | `0xe2b56b2BFcaeB3c8d14400184eAb01BBC980cC05` | deployed |
| `MentorMatcher` | `0x05d6a67279972273F23124EF95237956Ef923C05` | deployed |
| `ComputeVerifier` | `0xA483021adE196D642e6500B2D92c5E077186Ee00` | deployed |
| `ComputeMarketplace` | `0xE4fD2413d19946E7a8e78733E62C1531139430Bb` | deployed |
| `ComputePool` | `0x47FFB16216a5431dcF852f70Fe534c556cE807eF` | deployed |
| `HeartbeatMonitor` | `0x85c1A278ed86169C5087616d879013e9337a7013` | deployed |
| `DisputeResolution` | `0xea0E6716A8A0bA39DF1d30552CFeC0bBab36D602` | deployed |
| `ComputePricingOracle` | `0xDfaF0b02846Ac33f1fC753ACC2c1D7D0B2F1aE4e` | deployed |
| `StablecoinTreasury` | `0x6867F82401F2773bf625887cC5b1FA1d6EAfa352` | deployed |
| `BulkComputeGateway` | `0x9CF7DdBFbba683a14ceF4Eb0e7934f79ec10C586` | deployed |
| `TestnetFarmingAccounting` | `0xE19aef1A41b883021222aC7596c7ca96A62C6156` | deployed |
| `TreasuryGovernor` | `0xe0537e5f14C087EC865E152B9D3356d721E5a24F` | deployed |
| `ModelAccessControl` | `0x66f78C103D6EE077CD2875C71D676540708d5356` | deployed |
| `TEEAttestationRegistry` | `0x6693b6FcBc5bf3935bEEB7a21654bDfBd90e84b6` | deployed |
| `ComputePoolTraining` | `0x1D71814BbC78ae994CA5B6eE9c4b9378178b2B36` | deployed |
| `InstitutionalVault` | `0x7eAb0072153FB71E292A5e272e6Ac66E3f86D094` | deployed |
| `ClassroomClusterV1` | `0xF2D989FFA09719aa9ee2020Fbf09aD0924ccb486` | deployed |
| `EduForwarder` | `0x1531224eECc9dFe1CdcCd80Be1BD35804005F181` | deployed |
| `BudgetAllocation` | `0x365e98100B879a7A54Dc3FED969C977D21be59A0` | deployed |
| `CashoutRequest` | `0x6E357EDCfc392bAc92b55e1f39f0FA8FC4e8E03A` | deployed |
| `AIModelRegistryPortable` | `0xdA30A0408b1690AfA739fB63901a6608547F4dA6` | deployed |
| `AIInferenceRouterPortable` | `0xb8603904aEBeFefa317D9DeDF60B19A120366715` | deployed |
| `AILearningCycleCorePortable` | `0x42196F4257E5AfAa9fF92735f88aa0c23fBe8b91` | deployed |
| `CitrateMemberSBT` | `0xA24aa35fbA269f8755C2173779cc3DBC9690c4C9` | deployed |
| `MemberBond` | `0x7D6B92757e928ab4207Be3B54166Ecd2C491Aa92` | deployed |
| `MembershipStakeVaultImpl` | `0x72035977F3Ec295C70e2A734AcbDFfB0C98E6F0b` | deployed |
| `MembershipStakeVault` | `0x4C0f8b27c509cBA4A32E1Cd2BC5709bBD2699024` | deployed |
| `SkillRegistry` | `0x2B687899EF4aF05A18F4f36cE1fE9d51c017A97c` | deployed |
| `InstitutionTreeV1` | `0x028f98faeFeE5FF58cb494E493eD8f636aa3042B` | deployed |
| `ComplianceRegistry` | `0xa301FA601702B0fb850201182cEF381E312c63ee` | deployed |
| `AnchorRegistry` | `0x41e0f9A4dCD29C650dc58Ee569BF267fD9ba4817` | deployed |
| `FacilitySBTImpl` | `0x58ac5816c42a3d293552Fe368C4db53b89edB02c` | deployed |
| `FacilitySBT` | `0xb266e583A30cb47cFF54d9d7429aD55DC68C5e57` | deployed |
| `NetworkSBTImpl` | `0x01D34046343a171ec7cd4DB8978adbaB095EF955` | deployed |
| `NetworkSBT` | `0x823c5031A273a304C5a087a3F414F228907Ad7DB` | deployed |
| `CitAgentTimelock` | `0xBaC05BC639af6eF107F40fe606f1c4A22b7836A2` | deployed |
| `OrganizationSBT` | `0xB1Bb65Fc3F2188Ff1209845cBe64eba985461689` | deployed |
| `AgentSBT` | `0xd16b1ad6e744F3E92223C65F492c35D36ae07c7b` | deployed |
| `CapsuleRegistry` | `0xb2b1DF947d8064797083CE6024DCe0C64999C79C` | deployed |
| `CitAgentAnchorRegistry` | `0xB38b0e8b264d828A4e55276033B54800C223De45` | deployed |
| `BenchmarkRegistry` | `0x84247a5f65370947c792181A3afeD5AC0F452EC8` | deployed |
| `TenantHierarchy` | `0x7e92a5CbD49659fe594B503b50B26F5BD7060e90` | deployed |
| `ClassificationRegistry` | `0x37844e433f6E1Df3eBdaa9FdF2cFC44c222f251d` | deployed |
| `RoleEscalation` | `0xAab258228E85A22C99Cb298915277521eb7049D9` | deployed |
| `MultiSigEnvelope` | `0x3052Ef8C8d6B71f1fF12703C65b33f29F6627Bbf` | deployed |
| `AgentDecisionRegistryV2` | `0x678D03b31A77F146b8977E1128c2f57D3e3583F7` | deployed |
| `ContradictionLedger` | `0xdeB5D07716a20838b1b7287c51bCA00e8d12D20d` | deployed |
| `QuorumAnchorRegistry` | `0x94Aca73127c7A34d5872A861D0A7C9393030Fa2E` | deployed |
| `MeetingRegistry` | `0x4B0C7Cf5feF3B6f5A8b042E2E71788450Ec70De4` | deployed |
| `GovernanceTemplateRegistry` | `0xFF6481c1F532E52aA1EFaaEEF117A29e1F84bC82` | deployed |
| `GovernanceProtocolFactory` | `0x17c2e4e24e8E041302cBbe8C51A7996949719Df6` | deployed |
| `PolicyBinding` | `0x2e54Ea789a4EeC4A4e360b9436B04085419a29e9` | deployed |
| `CapabilityGrant` | `0x1670F43B5eC0cd18088147d4fd7543E51A679d30` | deployed |
| `VoteAllowance` | `0x2271042A2f4F4783949ee74733A2AbfE0c50018C` | deployed |
| `Sortition` | `0xB934aE6B6836ad17F2525b6428CcE7A5F7D6F0ec` | deployed |
| `PartProvenanceRegistry` | `0x60FF23F311E5Cbec702E62aFC99F96F36180347d` | deployed |
| `SupplierRegistry` | `0x3A40A13EEa4a28Fc3A86E6cc9ab3F4CDF4C85f26` | deployed |
| `MoqRegistry` | `0x577Fb91D26569820A64bB752d78Da008EF04666d` | deployed |
| `DefensePrimeFLScopeIndex` | `0x100d4e9Eb591f20Cc39D9A0080F2811ea12CA28E` | deployed |
| `AppRegistry` | `0xA0C18325Ee5426A26Feff56b3d2F7C6EF8264ad0` | deployed |
| `CrossOrgIndex` | `0xD62f4A63054e53B1cbE10a1956AA607D65CD2FDd` | deployed |
| `AuditBundleRegistry` | `0xAc20e8F340c15D990270832650bB76d0805fe473` | deployed |
| `DefensePrimeComplianceRegistry` | `0xd99dF90C0385ba89be36Bf5FBc42d6bc950920E6` | deployed |
| `RoleGrantTenantIndex` | `0xC8127F90D5b7B7e88B48Ec7312c2cB5884a3f1D6` | deployed |
| `EntityRegistry` | `0xE97f4529A0C9e8c81FB32ad72D3a578F92dE4b79` | deployed |
| `TinaWorkpaperRegistry` | `0xA9E05E9Bd0DDB62CabDcBBe263429a093B21aeC9` | deployed |
| `CrossOrgEnvelope` | `0x3b2913E078fa859dc10Aa9EA90A6FCF3E1D47480` | deployed |
| `TripwireRegistry` | `0xaC5e1E599788540a5E97B1258d6bd99c417Ce9eA` | deployed |
| `SponsorEvidenceRegistry` | `0xc5CA4ae343367995b49570d97759643A289F298D` | deployed |
| `ReleaseManifestRegistry` | `0x7B955B307c4EbBeA469C40FfeD41AD08a8ECe075` | deployed |
| `KYCRegistry` | `0x2a45692244dE4A87172061F604b1167D2c7f6C3b` | deployed |
| `IPFSIncentivesV2` | `0x7747745AA3d78c93993DD1eF6aCD8CC8AFED8aEC` | deployed |
| `IPFSIncentivesV3` | `0xe016f7655172dCc8039863484F1A8C306553867D` | deployed |
| `AggregationChallenge` | `0xB5D143dC15dD9C570D198c7156Fe427ccEFc7377` | deployed |
| `ComputePoolPipeline` | `0xbE60946E62697e99697bdF90b59700D4D76f5E60` | deployed |

## Membership

The membership soulbound token and stake vault are top-level entries in the book. They are deployed by
nonce rather than through the CREATE2 factory, so their addresses change at every re-roll; always read them
from the book.

| Contract | Address | Status |
|---|---|---|
| `CitrateMemberSBT` | `0xA24aa35fbA269f8755C2173779cc3DBC9690c4C9` | deployed |
| `MembershipStakeVault` | `0x4C0f8b27c509cBA4A32E1Cd2BC5709bBD2699024` | deployed |

## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

| Contract | Address | Status |
|---|---|---|
| `EntryPoint` | `0x97d5391a647429233E202f99231743C53a648f3c` | deployed |
| `WebAuthnP256Validator` | `0x0f421a99A0b8F6138Dea12F45A523Cb896D09fc7` | deployed |
| `CitrateECDSAValidator` | `0xD2d35421379Ae5b461e216BFcdD1B7e6a64BBC40` | deployed |
| `GuardianRecoveryModule` | `0x0A909769160C1945401b8f37a9310d37DbB6a891` | deployed |
| `CitrateWallet` | `0x2D742B98D867Fc7363F530DD6d756622e4Eb768D` | deployed |
| `CitrateWalletFactory` | `0x24e2a41E48Fb3d5A054528bF017ebAeC0aC94EFf` | deployed |
| `CitratePaymaster` | `0x8E65bff91E4c53556E1Cee8b0135ffb09D427E58` | deployed |

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

