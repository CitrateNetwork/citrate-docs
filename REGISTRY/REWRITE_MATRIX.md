---
created: 2026-06-17T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: ATLAS-S0
---

# Citrate Atlas, Per-Page Rewrite Matrix

Drives the section rewrites (ATLAS-S3..S10). Every page is rewritten from code to `../STYLE_GUIDE.md`.
Each row: the source code path(s) to verify against, the canon to embed, known issues, and the
product-surface names that apply. Facts cross-checked against `SURFACE_REGISTRY.md` (corrections log).

## Verified corrections to apply everywhere

1. **RPC names** , real: `chain_getTips/getHeight/getBlock`, `citrate_getDagStats`; AI = `citrate_requestInference/getModels/getTextEmbedding/semanticSearch/chatCompletion`; economics = `citrate_gasPrice/getEconomicState/getVotingPower/getToken`. NOT `ai_*`/`economics_*`/`citrate_blockDAG`.
2. **Contract paths flat** `contracts/src/<Name>.sol`, except `edu/` set (ClassroomClusterV1, BudgetAllocation, CashoutRequest, InstitutionalVault, Forwarder) and `aa/` set.
3. **Storage** is flat KV over RocksDB + computed SHA3-256 root, not a Merkle Patricia Trie.
4. **SDK package** is `citrate-js` (not `@citratenetwork/sdk`); exported `VERSION` 0.1.1 is stale vs package.json 0.2.0.
5. **citrate-cli** has `init` + `advanced`; `citrate-wallet` flag is `--rpc`; `citrate-faucet` is an HTTP server.
6. **Operator runbook** is `citrate-chain/docs/OPERATIONS.md` (PRIVATE_NETWORK.md does not exist).
7. **sdk-python CLI** entry point is broken (`citrate_sdk/cli.py` missing) , document as not-yet-available.
8. **bundler** `citrate_getUserAddress` not implemented (gate prechecks then proxies); SDK uses `/rpc`.
9. **inference gateway** chain queries stubbed (WP-03.2), batch GET routes pending.
10. **entitlement claim** not yet in citrate-identity (resolved RP-side; mark Specified).

## Canon (state where relevant) and product names

Substrate-not-AI; Citrate Network (public ledger) + Citrate Ground (on-prem default); GhostDAG k=18 /
finality-depth 100 / 100-validator BFT 67% / 50-block checkpoint; chain 40204 testnet, mainnet Q2 2027,
pilots prior summer; KYC via CLEAR (no PII held); SALT settles work (not the product); K-12 free in
perpetuity; compliance floors FERPA/COPPA/CIPA/HIPAA/SOC 2/ITAR.
Names: Citrate Network / Ground / Market / Orchard / Node / Keyring / Schools / Atlas.

## Start Here + Methodology  (S3)

| slug | source | canon | issues | names |
|---|---|---|---|---|
| /start/what-is-citrate | README, citrate-chain | substrate, BlockDAG, 40204, timeline | redundant H1 | Network, Ground |
| /start/primer | citrate-chain consensus/learning/economics | blue-score vs height, finality-by-depth, gasless AA, on-prem | none major | Network, Keyring, Node |
| /start/roadmap (NEW) | MISSION canon | mainnet Q2 2027, pilots prior summer | page missing | Network |
| /start/agentile | AGENTILE.md (linked) | 13 rules, operators+auditors | em-dashes | , |
| /start/tutorials/your-first-10-minutes | chain RPC/CLI, sdk-js | real RPC names, 40204 | fictional RPC | Network |
| /methodology/rules | docs/AGENTILE_RULES.md (linked) | 13 rules | em-dashes | , |
| /methodology/workflow | docs/AGENTILE_WORKFLOW.md (linked) | sprint lifecycle | , | , |
| /methodology/sops | repo READMEs | customer/dev/operator SOPs; internal gated | stale links | Node, Keyring |

## Chain Core  (S4)

| slug | source | canon/issues | names |
|---|---|---|---|
| /chain/consensus | core/consensus/ | k=18, depth 100, ECVRF, 50-block checkpoint; blue-score recomputed | Network, Node |
| /chain/lvm | core/execution/revm_adapter.rs | EVM + parallel MVCC + precompiles; primary path | Network |
| /chain/precompiles | core/execution/precompiles/ | tensor/x402/q16; ZKP/inference/attestation gated | Network, Market, Orchard |
| /chain/precompiles-zkp | precompiles/{verify,inference,attestation}.rs | Q16.16, Halo2-KZG, TEE; public summary only (X internals) | Network |
| /chain/rpc | core/api/{eth_rpc,server}.rs | REAL method names (corr. 1) | Network |
| /chain/cli | cli/ | account/model/contract/network/governance/wizard/init/advanced; `--rpc`; faucet=HTTP | Node |
| /chain/sequencer | core/sequencer/ | parent selection, mempool, OODA (no military metaphor) | Network, Node |
| /chain/storage | core/storage/ | flat KV + SHA3-256 root (corr. 3) | Network, Node |
| /chain/genesis | config/, node/config/ | 40204 testnet, mainnet id=1 pre-launch; no keys | Network |
| /chain/economics | core/economics/ | SALT 1T/18dp, fee splits, block reward 10/halving; settles work | Network |
| /chain/network | core/network/ | P2P/gossip/bootstrap; link OPERATIONS.md | Node |
| /chain/bridge | core/bridge/ | pre-alpha public stub; internals gated | Network |

## Smart Contracts  (S5)  , all at citrate-chain/contracts/src (paths per corr. 2), addresses from DEPLOYED_ADDRESSES.md

| slug | contracts | canon/issues | names |
|---|---|---|---|
| /contracts/edu | ClassroomRegistry, edu/{ClassroomClusterV1,BudgetAllocation,CashoutRequest,InstitutionalVault}, MentorMatcher, TestnetFarmingAccounting | RBAC, vault multisig non-operational, V1 supersedes registry | Schools, Keyring |
| /contracts/compute | ComputeMarketplace, ComputePool(Training), ComputeVerifier, BulkComputeGateway, ComputePricingOracle | marketplace primitives | Market, Node |
| /contracts/models | ModelRegistry, ModelMarketplace, LoRAFactory, ModelAccessControl, InferenceRouter | LoRA provenance tied to learning rounds | Orchard, Market |
| /contracts/economics | WrappedSALT, LiquidStakingPool, IPFSIncentives(V2), ContributionAccounting, StablecoinTreasury, MarketMakerAllocation | SALT settles work, not hodl | Network, Orchard |
| /contracts/governance | TreasuryGovernor, DisputeResolution, AgentDecisionRegistry, SpecRegistry | agent-safety + formal-methods registries | Network |
| /contracts/security | KYCRegistry, TEEAttestationRegistry, NematocystSlashing | KYC/TEE gated; slashing academic | Network |
| /contracts/x402 | X402Facilitator, X402Paywall | per-request payment | Market |
| /contracts/reference | DEPLOYED_ADDRESSES.md, @CitrateNetwork/contracts-abi | verify against eth_getCode | Network |

## SDKs + Account Abstraction & Identity  (S6)

| slug | source | canon/issues | names |
|---|---|---|---|
| /sdks/js | citrate-sdk-js src/{client,aa,crypto,react} | citrate-js v0.2.0 (corr. 4) | Network, Keyring, Market |
| /sdks/python | citrate-sdk-python | non-canonical; CLI broken (corr. 7) | Network |
| /sdks/marketplace | citrate-sdk-marketplace src/{client,x402,wallet,contracts} | x402 protocol | Market, Keyring |
| /sdks/inference-gateway | citrate-inference-gateway gateway/src, crates/x402-axum | stubs (corr. 9) | Network, Market |
| /sdks/bundler | citrate-bundler gate/src | citrate_getUserAddress missing (corr. 8); `/rpc` | Keyring, Network |
| /sdks/tutorials/* | sdk-js / marketplace / python | real names, 40204 | fictional RPC | per-page |
| /aa/passkeys | sdk-js/src/aa, contracts/src/aa, identity | WebAuthn-P256 + EOA, Kernel v3, counterfactual; pre-audit | Keyring |
| /aa/identity | citrate-identity src/{server,kyc-pg,aa} | OIDC claims; KYC status via CLEAR (no PII); entitlement Specified | Keyring |
| /aa/guardians | identity src/aa/{guardians,guardian-routes} | nomination/recovery; Citrate never a guardian | Keyring |
| /aa/contracts | contracts/src/aa | validators/factory/paymaster/guardian; Forwarder in edu/ | Keyring |
| /aa/paymaster | contracts/src/aa, citrate-bundler | per-user caps; bundler topology | Keyring, Network |

## Compute & Inference + Node Operators  (S7)  , lead with substrate/on-prem/KYC-CLEAR

| slug | source | canon/issues | names |
|---|---|---|---|
| /compute/node-agent | citrate-node-agent/crates | no signing keys; compute.json; SELL-S1 done, S2 experimental | Node, Market |
| /compute/pool | citrate-compute-pool | coordinator + worker | Orchard, Market |
| /compute/gateway | citrate-inference-gateway | operator angle; modes; X402 | Market, Node |
| /compute/agent-runtime | citrate-agent-runtime | doctor; Recorder/ApprovalQueue; safety | Node |
| /operators/run-a-node | chain README, docs/OPERATIONS.md | runbook is OPERATIONS.md (corr. 6) | Node |
| /operators/sell-compute | node-agent README | signer relationship; SELL status | Node, Market |
| /operators/rewards | core/economics, node-agent | rewards/reputation/slashing; settles work | Node, Network |
| /operators/tutorials/become-a-seller | node-agent, ComputeMarketplace | KYC, bid, execute, claim; 40204 | Node, Market |

## Apps & dApps  (S8)

| slug | repo | canon/issues | names |
|---|---|---|---|
| /apps/explorer | citrate-explorer | CitrateScan, DAG-native, agentic, MCP; "agentic" not "AI-native" | Network |
| /apps/chatbot | citrate-chatbot | gasless AA + inference | Network, Keyring, Orchard |
| /apps/dashboard | citrate-dashboard | learning observability | Orchard |
| /apps/buyer | citrate-buyer-webapp | marketplace buyer; x402 | Market |
| /apps/district-registration | citrate-district-registration | KYC onboarding via CLEAR | Schools, Keyring |
| /apps/learning-center | citrate-learning-center | school product; no student PII on network | Schools |
| /apps/memories | citrate-memories | memory DAG + MCP (Memrizz) | Orchard, Network |
| /apps/landing | citrate-landing | marketing; enforce voice hard | , |
| /apps/native | citrate-native | native wallet + DAG explorer (Slint) | Keyring, Network |
| /apps/wallet-extension | citrate-wallet-extension | MV3 extension | Keyring |
| /apps/studio | citrate-studio | agent control UI; public stub (X internals) | Node |
| /apps/defense_prime | citrate-defense_prime-shell | customer shell; public stub (X) | Ground |
| /apps/comms | citrate-comms | E2E workspace + MCP | , |
| /apps/nist-agent | nist-agent | air-gapped sidecar; on-prem isolation; no military jargon | Ground, Node |
| /apps/tutorials/* | per-app | real 40204 | per-page |

## Research / Citrate Orchard  (S9)  , academic tier

| slug | source | canon/issues | names |
|---|---|---|---|
| /research/learning | core/learning, learning-daemon | OODA cycle; learning_root independent of state_root; crate Implemented, on-chain Specified | Orchard, Network |
| /research/mentorship | gradient_papers_v3 No.3 (linked) | mentor matching + LoRA distillation | Orchard |
| /research/paraconsistent | core/learning/src/belnap.rs | Belnap 4-valued; disagreement as information; Q16/Halo2 Specified | Network, Orchard |
| /research/verifiable-inference | precompiles/{verify,inference} + papers | Q16.16, Halo2-KZG, TEE; public summary (X internals); no SRS seed | Network, Orchard |
| /research/atis | gradient_papers_v3 No.5 (linked) | Theoretical, no code anchor | , |
| /research/gradient-papers | gradient_papers_v3/ (linked) | index of 10 papers | , |
| /research/tla | citrate-agentile-archive/formal + per-repo specs | TLA+ corpus; run convention | , |
| /research/bdd | per-repo specs/gherkin | Gherkin acceptance library | , |
| /research/tutorials/reproduce-a-learning-round | core/learning, contracts/edu, sdk-js | end-to-end round; real names | Orchard, Network |

## Enterprise & Compliance  (S10)  , public pages + gated bodies in confidential-store.ts

| slug | source | canon/issues | names |
|---|---|---|---|
| /enterprise/k12 | public-goods/learning-center/PRIVACY_SECURITY_AND_COMPLIANCE.md | FERPA/COPPA/CIPA; no student PII on network; honest gaps | Schools |
| /enterprise/procurement | citrate-commercial | MSA/SOW/order forms | , |
| /enterprise/compliance | citrate-compliance (sanitized) | floors by deployment context; honest status | Network, Ground, Schools |
| /enterprise/compliance-full (X) | citrate-compliance/ | gated, embargoed, post-auth | Ground |
| /enterprise/dpa (X) | citrate-compliance | gated | , |
| /enterprise/questionnaires (X) | citrate-compliance | gated (SIG/CAIQ) | , |
| /enterprise/federal (X) | citrate-compliance, nist-agent | gated; on-prem isolation | Ground, Node |
| internal/* (X, server-only) | citrate-security/audits, ops/, funding/, compliance/registers | DEMO stand-ins; access-logged; never in bundle | , |

## Per-page rewrite checklist

Title not repeated in body; lede 1-2 sentences; sections per template; no em-dashes; no forbidden words;
vocabulary substitutions applied; specific facts + real code paths at a cited SHA; a 4-tier status label;
canon embedded where relevant; product-surface names used; tier accurate; gated pages carry no real
internals; examples use real chain 40204 + real RPC names + real addresses; passes `content-lint`.
