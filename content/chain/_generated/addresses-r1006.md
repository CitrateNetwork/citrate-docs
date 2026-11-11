---
title: Contract addresses: r1006
codex_slug: /chain/addresses/r1006
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/addresses/40204.json
surfaces: [CHAIN-addresses]
network: r1006
network_status: current
book_sha256: 2f92030ac33ec59469e654bb797324209f5407311de6c514d81cdaaee27dfed8
book_deployed_at: 2026-01-01T00:00:00Z
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 6
---

These are the contract addresses of network **r1006** on chain 40204 (Citrate Network).
The page is rendered at build time from the published package `@citratelabs/chain-config@0.2.0` (book sha256 `2f92030ac33ec594`), which is the canonical federation address
book `citrate-chain/contracts/addresses/40204.json`. The addresses are not copied by hand. The book is for the chain whose block 0 is `0xa3651a272fe411948cbb4cf7cca4cee44be4248d32ab4376cea7636821c6cdd4`. Before you trust any address, check that `eth_getBlockByNumber("0x0", false)` on your RPC returns that hash.

At block 648047 (2026-11-09T16:34:08Z), 106 of the 106 application, membership and account-abstraction entries had code on r1006; rows marked **not deployed** had none. A call to an address with no code returns empty data, and a value transfer to one succeeds and strands the
value, so check the status column before you send anything. Re-check any address yourself with
`cast code <address> --rpc-url https://rpc.citrate.ai`.

Programs should read the book, not this page: `npm install @citratelabs/chain-config` and import
`contracts`, `aaStack`, `memberSBT` and `genesisHash` from it. The RPC endpoint is `https://rpc.citrate.ai` and the
genesis deployer is `0xe40325ba1f4cf362b203d9fe2b8160312e926c11`.

## Networks

- [r1006](/chain/addresses/r1006): current, block 0 `0xa3651a272fe411948cbb4cf7cca4cee44be4248d32ab4376cea7636821c6cdd4`
- [r1005](/chain/addresses/r1005): retired 2026-11-10

## Core contracts

| Contract | Address | Status |
|---|---|---|
| `ModelRegistry` | `0x4c367f7742059b5bf39f6fbe5837ce6164afd33f` | deployed |
| `WrappedSALT` | `0xaa918302b94a4b0e75e01e019cc6b819b4f7c906` | deployed |
| `AgentDecisionRegistry` | `0x74eb3393d3be1b732adf5002334383dbfbe28f8d` | deployed |
| `SpecRegistry` | `0xba9aa1ca90de62d0857839420491899abb2826d4` | deployed |
| `IPFSIncentives` | `0xce5e13bf7c9d7320b4cafd0ef326febfba95dd52` | deployed |
| `X402Facilitator` | `0x0c5167e9b1db3423ad2c068edc51da84db03dc44` | deployed |
| `X402Paywall` | `0x30e1dcca7a222fdaeef2e1410d2d49ee8fb9ab44` | deployed |
| `ContributionAccounting` | `0x621395beb46a6f59c0e3a94ba5248db94af1896f` | deployed |
| `NematocystSlashing` | `0xce8dc4f9bd74729f275a84184cf245f5aad7cbf1` | deployed |
| `MarketMakerAllocation` | `0x63dd6c064db0c54513b6711887a2c9284b755348` | deployed |
| `ModelMarketplace` | `0xb7ea46dc2ecaed8595149b415f25e5b7d806278a` | deployed |
| `InferenceRouter` | `0x165b811cdf1edd330d3ed77b87da38e9e0c9bd0f` | deployed |
| `LoRAFactory` | `0x62e9aabec26288e60db2503f518eacf9cdcc8890` | deployed |
| `LearningPool` | `0xba5c9c886d65a969d02e40d7fbbade316ad81e66` | deployed |
| `LearningCycleManager` | `0xff400ad31c9f203d4a0a0d744833a135ac951268` | deployed |
| `ClassroomRegistry` | `0xe2b56b2bfcaeb3c8d14400184eab01bbc980cc05` | deployed |
| `MentorMatcher` | `0xa29d2ad464c579de580ce72951f1d01f48d49879` | deployed |
| `ComputeVerifier` | `0xbaa6cc72886a5958e3902470fca17d471e563449` | deployed |
| `ComputeMarketplace` | `0x2fec2ac1dde3a1a749c84d487738904cd2ed50c2` | deployed |
| `ComputePool` | `0x7fbe2cb7c983d7b732fb2b8cb91fbbb2ee841787` | deployed |
| `HeartbeatMonitor` | `0x7add85321992306e106a82345bc7867a5c557747` | deployed |
| `DisputeResolution` | `0xbc3f09bd846bdb04f70b7b905fc5d34801b1f14a` | deployed |
| `ComputePricingOracle` | `0xc3b66ef29726dfd3bb27e7c841efa664634a5027` | deployed |
| `StablecoinTreasury` | `0xb2c19472903ab7d9298ac1dabdfd37b2e3b25158` | deployed |
| `BulkComputeGateway` | `0x37a9dec7ea9b7e7ef6fd9d094540d22933ddd8d0` | deployed |
| `TestnetFarmingAccounting` | `0x866b40857af3105043c1c932f8728a3058173839` | deployed |
| `TreasuryGovernor` | `0xf3591f9ec1738508f648dfc252d4a3493a1dfd6c` | deployed |
| `InstitutionalVault` | `0x9fea5d6bcfa82fa5879a7061381b40647aa67938` | deployed |
| `ClassroomClusterV1` | `0x6015f82f95762e3a31205a4f6c391410652301f9` | deployed |
| `BudgetAllocation` | `0xcc98a91155e170bdc4d92b2d425dd13b44cdb4cf` | deployed |
| `CashoutRequest` | `0x82775eadc5803861f99d90b43dc6ebc0390edaff` | deployed |
| `AIModelRegistryPortable` | `0xda30a0408b1690afa739fb63901a6608547f4da6` | deployed |
| `AIInferenceRouterPortable` | `0x02912ede26224b5ab217f30a2b66e285d914f03d` | deployed |
| `AILearningCycleCorePortable` | `0x696e330dfca80a870dbcaf4d0b08155d0b828e2c` | deployed |
| `ModelAccessControl` | `0xb562faf611c903de86976f519401c967b8f8f97b` | deployed |
| `TEEAttestationRegistry` | `0xa6b7a6c1e6a7388a29352bd12a26cbc25c63c4da` | deployed |
| `ComputePoolTraining` | `0x736034d7a01f1e9c1812c6404564e64cf22decbc` | deployed |
| `ValidatorRegistry` | `0xf511327ef586908bc34990621e3624d5de4131cd` | deployed |
| `CitrateMemberSBT` | `0x883165132776171fbcfde2d3c789ef5bdb0d060d` | deployed |
| `MemberBond` | `0x25118a63b614901c1871fef91b447602e11e1e9b` | deployed |
| `MembershipStakeVaultImpl` | `0x46eae8b70644f5d3e0c67faa16a9f2383246f211` | deployed |
| `MembershipStakeVault` | `0xd6632ea2179d047d2460f1de90abcc519839555e` | deployed |
| `EduForwarder` | `0x9fb93ee5607accb7ac3cff7987f2ed9528caacce` | deployed |
| `GovernanceTimelock` | `0x038bc87f5c0a0204127e47f4f6cc5348094dd467` | deployed |
| `GovernanceMultisig` | `0x3975c796e3ca6825de3c8ac7dae0820a1c0b2c5c` | deployed |
| `GuardianTimelock` | `0x1f1883c468a145d3dd8771a72182e74aa4c70200` | deployed |
| `GuardianMultisig` | `0xc6ed3ed2a3a302f1ed2249fb43e94808c9fbaf1d` | deployed |
| `GuardianCanceller` | `0xf84cb95142c876d44df1ea0c817838b440a4256d` | deployed |
| `TeamVesting_team_1` | `0x2a60d582019e002dce914c8a24f28435605a47be` | deployed |
| `FederatedRoundLedger` | `0x25fc02fbfad9589d0dde84f858d0962bfa0253c5` | deployed |
| `PatronageLedger` | `0x41f68b9e710585b064459a0ec706148fbf503659` | deployed |
| `AgentDecisionRegistryV2` | `0xbd7996c4fde4116cbeaf0c796378f45828b135b2` | deployed |
| `AgentSBT` | `0xa087094ffaaf774c22d594520b39e3b1a66e32f2` | deployed |
| `AggregationChallenge` | `0x88128d3f666f46f8d6aa5aa2e72c07379d2c560e` | deployed |
| `AnchorRegistry` | `0xab87534ef027b52bb6233e889f758767127bf47a` | deployed |
| `BenchmarkRegistry` | `0x1231b7629d7febd3bf24b0ce8788b944b10242c5` | deployed |
| `CapsuleRegistry` | `0x46a3a5be60d919f30de3cb3d545709c557e9ef02` | deployed |
| `ComplianceRegistry` | `0xd504c9ac2a36b6ac13150d14315e27977971c145` | deployed |
| `ComputePoolPipeline` | `0xafa0a4a75b4e135930eff30c856612904bf3eafd` | deployed |
| `FacilitySBT` | `0x5980214bea79d4174df69d604f913bd469adca4c` | deployed |
| `FacilitySBTImpl` | `0x58ac5816c42a3d293552fe368c4db53b89edb02c` | deployed |
| `IPFSIncentivesV2` | `0x23ae921cc49ed1dd3435696a274608605335b2dd` | deployed |
| `IPFSIncentivesV3` | `0xc596caab803219f0f5b7e8639c0cfd3b3248b268` | deployed |
| `InstitutionTreeV1` | `0x539315c9f43580d67e572b9ec305f5aa167f52c1` | deployed |
| `KYCRegistry` | `0x4270895ff826b1093976f892fba8ae02fb8fdf5d` | deployed |
| `NetworkSBT` | `0x7e7a5a040efc5d7f1900ecc25e0e7f775b417345` | deployed |
| `NetworkSBTImpl` | `0x01d34046343a171ec7cd4db8978adbab095ef955` | deployed |
| `OrganizationSBT` | `0x960bc81a48f29cf1912ac29b2b15203ebd35dda6` | deployed |
| `SkillRegistry` | `0xbedad7a474785ecb27fc0aa02ca583bdb3761a49` | deployed |
| `AppRegistry` | `0xfc3d6f960acfb25549670809405fb81d2e8b96a6` | deployed |
| `AuditBundleRegistry` | `0x0fa488adca9f052d9c2fafbb30386e69bf754110` | deployed |
| `CapabilityGrant` | `0x11e25913e402f4416b73ee52c668035dd4fc0e6a` | deployed |
| `ClassificationRegistry` | `0x104d4050c376dca9d3de66947071d5a190a0f1bd` | deployed |
| `ContradictionLedger` | `0x02e21d49483c32e5f02df1cf179f2b81b8008a4f` | deployed |
| `CrossOrgEnvelope` | `0xb0f3da7d71f4c90396fadd66a97eb5bf1ed4f26b` | deployed |
| `CrossOrgIndex` | `0x3512a8b9bad9142207f62bc4819e9e7a9e3fa731` | deployed |
| `DefensePrimeComplianceRegistry` | `0xb07724913568ac6d72ba696442fb93dd204bd91d` | deployed |
| `DefensePrimeFLScopeIndex` | `0x9730f81a69367fd92b6a48f40a4ff950d49c033d` | deployed |
| `EntityRegistry` | `0x41ac12b5cc8b2118faf7d8cb6e742cfafee73098` | deployed |
| `GovernanceProtocolFactory` | `0x252f6f58f897f683e4b5bde2fbc1bf67c5804e02` | deployed |
| `GovernanceTemplateRegistry` | `0x58593865c2393f7990516dabc83a05d2ddac2861` | deployed |
| `MeetingRegistry` | `0xdd5ec8bcd4d76288107726b0e0f469069d7b2363` | deployed |
| `MoqRegistry` | `0x48606d37500900fefb9fc404a385f10d90c8e194` | deployed |
| `MultiSigEnvelope` | `0x52588c609062b22f9af24c6858000ac044adeb5f` | deployed |
| `PartProvenanceRegistry` | `0x5d0c4ad25607ed4ec8fc1261bfc12a2c1db8dd9c` | deployed |
| `PolicyBinding` | `0x1618206c55e3e06b1be957c99ce5b08c16b64ba5` | deployed |
| `Quorum.AnchorRegistry` | `0x5924d1d3c1406de4849a1e1b01a5ec8c122a5641` | deployed |
| `ReleaseManifestRegistry` | `0x82224833dcb91b2b9e88628ec7aef5bd15dc7222` | deployed |
| `RoleEscalation` | `0x1a53c9a5d8c14cc6ca84a4d6a4686690d766ea36` | deployed |
| `RoleGrantTenantIndex` | `0x0c01987f687fe550220b78f1fde93b7958f930be` | deployed |
| `Sortition` | `0x75271094b4264497de796a638c3c723e83a03722` | deployed |
| `SponsorEvidenceRegistry` | `0x0a169e2136afe687a66eb4b67b32f4cd4a3b3f5f` | deployed |
| `SupplierRegistry` | `0xc7e0d6130c2f9bf8c9393bd9b42ddd03ba2a2077` | deployed |
| `TenantHierarchy` | `0xe1c1674962792ec89dc28f72e99cf9d0edd6bc18` | deployed |
| `TinaWorkpaperRegistry` | `0x64ac656f98cabcb477c0517bc4589c2e72938c50` | deployed |
| `TripwireRegistry` | `0xf4f8dc2d8b6381804cf2ca5173f02692997da728` | deployed |
| `VoteAllowance` | `0xf2359912d5f3b6335d189a40659c3c4f4db91354` | deployed |

## Membership

The membership soulbound token and stake vault are top-level entries in the book. They are deployed by
nonce rather than through the CREATE2 factory, so their addresses can change at every new genesis; always
read them from the book.

| Contract | Address | Status |
|---|---|---|
| `CitrateMemberSBT` | `0x883165132776171fbcfde2d3c789ef5bdb0d060d` | deployed |
| `MembershipStakeVault` | `0xd6632ea2179d047d2460f1de90abcc519839555e` | deployed |

## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

| Contract | Address | Status |
|---|---|---|
| `EntryPoint` | `0x97d5391a647429233e202f99231743c53a648f3c` | deployed |
| `CitrateWallet` | `0x2d742b98d867fc7363f530dd6d756622e4eb768d` | deployed |
| `CitrateWalletFactory` | `0x6ee3b59099c9c812cdf1c9e7e6ff166b2558434c` | deployed |
| `CitratePaymaster` | `0x5a1e2d73f8154a01a78b56e551c977cb8327ff56` | deployed |
| `WebAuthnP256Validator` | `0x0f421a99a0b8f6138dea12f45a523cb896d09fc7` | deployed |
| `CitrateECDSAValidator` | `0xd2d35421379ae5b461e216bfcdd1b7e6a64bbc40` | deployed |
| `GuardianRecoveryModule` | `0x0a909769160c1945401b8f37a9310d37dbb6a891` | deployed |

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
