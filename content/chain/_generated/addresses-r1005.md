---
title: Contract addresses: r1005 (retired)
codex_slug: /chain/addresses/r1005
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/addresses/r1005/40204.json
surfaces: [CHAIN-addresses]
network: r1005
network_status: archived
book_sha256: 4194dcc1612b5589c865221b03b67e46f74acc7b80b0804335b3b4be517a337c
book_deployed_at: 2026-10-06T05:43:04Z
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 7
---

> **Retired network.** r1005 is no longer the live chain (retired 2026-11-10). These addresses are a record. Do not send to them on the live chain: an address with no code accepts a value transfer and strands it. The live addresses are on [Contract addresses](/chain/addresses) (r1006).

These are the contract addresses of network **r1005** on chain 40204 (Citrate Network).
The page is rendered at build time from a frozen copy of the chain's archived book (`content/chain/address-books/r1005.json`, sha256 `4194dcc1612b5589`), which is the canonical federation address
book `citrate-chain/contracts/addresses/r1005/40204.json`. The addresses are not copied by hand.

At block 750 (2026-10-06T05:45:23Z), 100 of the 100 application, membership and account-abstraction entries had code on r1005; rows marked **not deployed** had none. The live RPC now serves r1006, so a `cast code` check against it says nothing about these rows.

Programs must not read this record. The live book is the current release of `@citratelabs/chain-config`. The RPC endpoint is `https://rpc.citrate.ai` and the
genesis deployer was `0x7DAbC319867fCcA7dE8A20809EfBd39BbF17Acdf`.

## Networks

- [r1006](/chain/addresses/r1006): current, block 0 `0xa3651a272fe411948cbb4cf7cca4cee44be4248d32ab4376cea7636821c6cdd4`
- [r1005](/chain/addresses/r1005): retired 2026-11-10

## Core contracts

| Contract | Address | Status |
|---|---|---|
| `ValidatorRegistry` | `0xde4F679632be7810D915F637Cc6a72bf076A3BD9` | had code on r1005 |
| `ModelRegistry` | `0x086F13745C53b460512eA2A0367EcdB62A2875eF` | had code on r1005 |
| `WrappedSALT` | `0xAa918302B94a4B0E75E01e019cc6b819B4F7c906` | had code on r1005 |
| `AgentDecisionRegistry` | `0x40A34010347C75c85F1EC990B1607a51FFDBE79d` | had code on r1005 |
| `SpecRegistry` | `0xA7d848e4104B5dCac0dE081e92Eb1E93e43D6a1a` | had code on r1005 |
| `IPFSIncentives` | `0x003563c0EE71FA2C69c6EB6440EE3c0fC8e1a467` | had code on r1005 |
| `X402Facilitator` | `0x0D36F6e2a186436f4E4Cc78Bbc7DA2a1aC37aadb` | had code on r1005 |
| `X402Paywall` | `0x5e833f530Dc09CaA0631AB2A50532025C0c0C0F0` | had code on r1005 |
| `LiquidStakingPool` | `0x73270e9818530d9C141596411Ef58730C1eB9f0D` | had code on r1005 |
| `ContributionAccounting` | `0x97Affbd04813Ea9a63DA0Cb659EE9b06E6BE6CdF` | had code on r1005 |
| `NematocystSlashing` | `0x594C4110F0B23752cad0B1622193132d223c3595` | had code on r1005 |
| `MarketMakerAllocation` | `0x6E01671D2D3dbF719EE1C5d6929111027aEc316A` | had code on r1005 |
| `ModelMarketplace` | `0x6A93B6e99BfaBfb4e655c6fC15DB4d98192D040f` | had code on r1005 |
| `InferenceRouter` | `0x42Ae16Dae5D7Bf535b5cce9d5b6521c504500896` | had code on r1005 |
| `LoRAFactory` | `0x9BF27858C9Ece2eC13fAEa3e6BD356A20E9C5185` | had code on r1005 |
| `LearningPool` | `0xBA5C9c886d65a969d02e40d7FBbADe316AD81E66` | had code on r1005 |
| `LearningCycleManager` | `0x594b6EDD65EE13262cEddE14f3DeA5d62527615b` | had code on r1005 |
| `ClassroomRegistry` | `0xe2b56b2BFcaeB3c8d14400184eAb01BBC980cC05` | had code on r1005 |
| `MentorMatcher` | `0x19fc5C7f005c8416C5b6bddbBA634b20d9Dd56c7` | had code on r1005 |
| `ComputeVerifier` | `0x55C3febF3c57e7f679CC773b1Cd87A5eE8a2c679` | had code on r1005 |
| `ComputeMarketplace` | `0xA96a891b9a060788FBc93997D61A8a98D02e621d` | had code on r1005 |
| `ComputePool` | `0x3e5969bDb10dD62ce48E84ad5FBe9CFE6F7D8AD4` | had code on r1005 |
| `HeartbeatMonitor` | `0xBEaC9b2955D17fe14b5514CCb61aB58ac9089F65` | had code on r1005 |
| `DisputeResolution` | `0xac5004C3282A6715712061bE7A1037362E9171f8` | had code on r1005 |
| `ComputePricingOracle` | `0xdE15b71a7bD85499CAe26DF82407ee0bd0c3445D` | had code on r1005 |
| `StablecoinTreasury` | `0x131fc17A9Df7c9e7B08c51B122D320018356A232` | had code on r1005 |
| `BulkComputeGateway` | `0x244474F2E5fA35592ef60A873D356F9FEB4cb8Fa` | had code on r1005 |
| `TestnetFarmingAccounting` | `0x19AaDBb6EDC2B9a2AF4B7f437c4E4bBD3778e487` | had code on r1005 |
| `TreasuryGovernor` | `0x3848b933691d6dcd535D1a704E50657Fdb8C4604` | had code on r1005 |
| `ModelAccessControl` | `0xaE0fC1a3E21afC38e781d9fB12F194dD71F53AA0` | had code on r1005 |
| `TEEAttestationRegistry` | `0xDAC8b840A2e98A4cBEAfC413fad7DCd447D79Fb1` | had code on r1005 |
| `ComputePoolTraining` | `0x17F0b25b8d8893f77bc5b55375BCdBd66F4cB8f3` | had code on r1005 |
| `InstitutionalVault` | `0x3ec6473CF73bd8d4f8bC8Fb22aC923C5e0A09771` | had code on r1005 |
| `ClassroomClusterV1` | `0x6b94b96485f789c8dDc4102A171bDafab41CE0b0` | had code on r1005 |
| `EduForwarder` | `0x840e011A30e9082998e2094E83BeC7dC0E019bE3` | had code on r1005 |
| `BudgetAllocation` | `0x8dC786BE442FF0A36794DDD201e7D220A97F733f` | had code on r1005 |
| `CashoutRequest` | `0xBd8b17E21132B2bEaFdCf6FC2CbA998B33430517` | had code on r1005 |
| `AIModelRegistryPortable` | `0xdA30A0408b1690AfA739fB63901a6608547F4dA6` | had code on r1005 |
| `AIInferenceRouterPortable` | `0x5375785324843e8eAF024A6D2cf8CEE63496f0f1` | had code on r1005 |
| `AILearningCycleCorePortable` | `0x197A32842aFA3775055f6F04da0c5aCaa09E0E72` | had code on r1005 |
| `CitrateMemberSBT` | `0xf8aD11f6d3AeFA605e2EBF7C81ED08A2b38B3A3c` | had code on r1005 |
| `MemberBond` | `0x7D6B92757e928ab4207Be3B54166Ecd2C491Aa92` | had code on r1005 |
| `MembershipStakeVaultImpl` | `0x72035977F3Ec295C70e2A734AcbDFfB0C98E6F0b` | had code on r1005 |
| `MembershipStakeVault` | `0xA93F7f688A8F212E0caD59eDBd1F7D3592151751` | had code on r1005 |
| `InstitutionTreeV1` | `0xac4694986FE8E593A48D3f427E08Ac12Cc463c8F` | had code on r1005 |
| `ComplianceRegistry` | `0xe3635aAE0B03e3c751b9E6375226E35995aD9154` | had code on r1005 |
| `FacilitySBTImpl` | `0x58ac5816c42a3d293552Fe368C4db53b89edB02c` | had code on r1005 |
| `FacilitySBT` | `0x47a65E700fdFBb5ccBCd64e0592D2EE58f1a8808` | had code on r1005 |
| `NetworkSBTImpl` | `0x01D34046343a171ec7cd4DB8978adbaB095EF955` | had code on r1005 |
| `NetworkSBT` | `0x82A14fA278055BFf7A50A82Acd00486a091E2C17` | had code on r1005 |
| `TenantHierarchy` | `0xdf841E8C5F57fB18DE127c0223E98cE179C02c0d` | had code on r1005 |
| `ClassificationRegistry` | `0x0084e573Bb22c3D72dc018A4d7bAC669828Ffa53` | had code on r1005 |
| `RoleEscalation` | `0xCCbC5B7E8E3fe9a7C4cD3fe657800c58C42a4D4d` | had code on r1005 |
| `MultiSigEnvelope` | `0xA32d82817c38Cf9baA052a9670050fece06Ddea2` | had code on r1005 |
| `AgentDecisionRegistryV2` | `0x5F82681f959C9F1417bf59A18052CD2FEE9787eD` | had code on r1005 |
| `ContradictionLedger` | `0x026BFbd2b9c7040BA40FD61Bdf893a72Ae8edCDb` | had code on r1005 |
| `QuorumAnchorRegistry` | `0x9b743B49b1f7FEE8896C7BD0D1A8cE49652fe1e3` | had code on r1005 |
| `MeetingRegistry` | `0x9A6Cdc2482730593b9E08D386157E0d41f129d4f` | had code on r1005 |
| `GovernanceTemplateRegistry` | `0xd83eEa8e9C82a5E0ADdDd5b1aF5f646a8fa1489D` | had code on r1005 |
| `GovernanceProtocolFactory` | `0xF6D1bf22317a7C986338d393243A33855eF28fB8` | had code on r1005 |
| `PolicyBinding` | `0xCfCc444e54Ea3C855bDE630f0063D736d8E0ff90` | had code on r1005 |
| `CapabilityGrant` | `0x250Ec3D18D9F0a7d99541A0B9C7Ae51469D7150a` | had code on r1005 |
| `VoteAllowance` | `0x9E47dC72F831E6eb7304C77B3a6b26e41671F6fc` | had code on r1005 |
| `Sortition` | `0xcdef59da0f6364959a79134b9c7421d98bB59bdC` | had code on r1005 |
| `PartProvenanceRegistry` | `0x418D258AC8725C2048Ef3707aD22292387E5a072` | had code on r1005 |
| `SupplierRegistry` | `0x391F6909Bc3DDc5dE73D4aFcaA7eb8800ACd7F0C` | had code on r1005 |
| `MoqRegistry` | `0x58353A3b463Fc7aA1fAD167D793cD1A00126c252` | had code on r1005 |
| `DefensePrimeFLScopeIndex` | `0xdcDf39d46E42BEB0C83f8847733E57Eda472b6F0` | had code on r1005 |
| `AppRegistry` | `0x520AfE4F405B7501FBCCa8d2F13fb29a0946f963` | had code on r1005 |
| `CrossOrgIndex` | `0x899DDb0663477A3Cd2b5D863d1334e73BA82913c` | had code on r1005 |
| `AuditBundleRegistry` | `0xd21f20C8616D173704d0eF50967d1C3e7Ae04542` | had code on r1005 |
| `DefensePrimeComplianceRegistry` | `0x0a320720cB00CEC119260058d1DBAFF3c6AFdE37` | had code on r1005 |
| `RoleGrantTenantIndex` | `0x399193F404EA49a1bFeeB420Ec35A5bE9A2c9955` | had code on r1005 |
| `EntityRegistry` | `0x34098cF54a3a3EB5324B079f83D424F178402f77` | had code on r1005 |
| `TinaWorkpaperRegistry` | `0xfe13A08593fc91EADdeDbD26b4f381fEA0386a9A` | had code on r1005 |
| `CrossOrgEnvelope` | `0x641E2F1AD7a30DeeF51c9596B3c32177d603ab7B` | had code on r1005 |
| `TripwireRegistry` | `0x1aC7a2e53758ECB5eCaA2584eBF0428dC3b57Ba8` | had code on r1005 |
| `SponsorEvidenceRegistry` | `0xE77e584c91196B7f3DE1090FA57ff9cAAe56098E` | had code on r1005 |
| `ReleaseManifestRegistry` | `0x2C36d78F30207431EC641Fcc4D32e01F29c573E3` | had code on r1005 |
| `KYCRegistry` | `0xCBd3e3DF59Ac1A710d1637A5A718ba42d4d63125` | had code on r1005 |
| `IPFSIncentivesV2` | `0xF753903DAB5f891D9593c9c713374A923E80f930` | had code on r1005 |
| `IPFSIncentivesV3` | `0xF5c115E6d88A960CC4f48129524C01004f067135` | had code on r1005 |
| `AggregationChallenge` | `0x115a144495bE3fB4f426352BfB784BAea274603A` | had code on r1005 |
| `ComputePoolPipeline` | `0x9A1A558AaA4a392FA1809F2767A2F5E6cb099551` | had code on r1005 |
| `OrganizationSBT` | `0x423E4552E918A0bBCAe907A4109cc2E497C0FB1e` | had code on r1005 |
| `AgentSBT` | `0x7c95195cfDF1F5D9444E7Cfb8B9C9869d9Fdc559` | had code on r1005 |
| `CapsuleRegistry` | `0x88010Cc0778b9F48FeE167C86918aec8d9Ab46B2` | had code on r1005 |
| `AnchorRegistry` | `0xAB87534EF027B52bb6233E889F758767127Bf47A` | had code on r1005 |
| `BenchmarkRegistry` | `0x1231B7629D7FEBD3Bf24B0ce8788B944B10242c5` | had code on r1005 |
| `SkillRegistry` | `0xbeDaD7a474785eCB27fc0Aa02ca583bdb3761A49` | had code on r1005 |
| `CitAgentTimelock` | `0xC93d648F9D01D6c4D63F20F75E4d3e6910AeeFA4` | had code on r1005 |

## Membership

The membership soulbound token and stake vault are top-level entries in the book. They are deployed by
nonce rather than through the CREATE2 factory, so their addresses can change at every new genesis; always
read them from the book.

| Contract | Address | Status |
|---|---|---|
| `CitrateMemberSBT` | `0xf8aD11f6d3AeFA605e2EBF7C81ED08A2b38B3A3c` | had code on r1005 |
| `MembershipStakeVault` | `0xA93F7f688A8F212E0caD59eDBd1F7D3592151751` | had code on r1005 |

## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

| Contract | Address | Status |
|---|---|---|
| `EntryPoint` | `0x97d5391a647429233E202f99231743C53a648f3c` | had code on r1005 |
| `WebAuthnP256Validator` | `0x0f421a99A0b8F6138Dea12F45A523Cb896D09fc7` | had code on r1005 |
| `CitrateECDSAValidator` | `0xD2d35421379Ae5b461e216BFcdD1B7e6a64BBC40` | had code on r1005 |
| `GuardianRecoveryModule` | `0x0A909769160C1945401b8f37a9310d37DbB6a891` | had code on r1005 |
| `CitrateWallet` | `0x2D742B98D867Fc7363F530DD6d756622e4Eb768D` | had code on r1005 |
| `CitrateWalletFactory` | `0x9Ac05AD65C9E8E48Fbb41dDE029512afA5346C85` | had code on r1005 |
| `CitratePaymaster` | `0x804a8021cc1212798180bC9330f6467f883C392c` | had code on r1005 |

## Precompiles

Precompiles are fixed genesis addresses. This table is the book's own `precompiles` block; the full set,
including the agent precompiles and which addresses contract code can reach, is on
[precompile addresses](/chain/precompile-addresses).

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
