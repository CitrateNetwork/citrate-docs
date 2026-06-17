---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S1
---

# Codex Surface Registry — the single source of truth

> The master checklist of **every surface in the federation** to be documented, with its access **tier**,
> its **home in the code** (auditable), how Codex **sources** it, its target **slug**, and **status**.
> Schema + authoring rules: `00_SCHEMA_AND_AUTHORING.md`. Doc agents update `status` and correct
> `code_path`/`tier` as they verify against code (and append a corrections note at the bottom).
> Tiers: `P` public · `C` commercial · `Ck` commercial.kyc · `A` academic · `X` confidential.

## 0. Start Here  (authored overviews + methodology primer)

| id | surface | type | code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| START-what-is-citrate | What Citrate is (AI-native L1 BlockDAG) | primitive | citrate-docs/content/start/what-is-citrate.md | P | authored | /start/what-is-citrate | draft |
| START-primer | Mental models (blue score, finality, merge parents, gasless AA, SALT) | primitive | citrate-docs/content/start/primer.md | P | authored | /start/primer | draft |
| START-agentile | Agentile methodology primer (13 rules in brief) | sop | AGENTILE.md | P | linked | /start/agentile | draft |
| START-first-10min | Tutorial: your first 10 minutes | primitive | citrate-docs/content/start/tutorials/your-first-10-minutes.md | P | authored | /start/tutorials/your-first-10-minutes | draft |

## 1. Chain Core — Consensus / Execution / Precompiles  (repo: citrate-chain)

| id | surface | type | code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| CHAIN-consensus-ghostdag | GhostDAG consensus | primitive | core/consensus/ | P→A | transcluded | /chain/consensus | draft |
| CHAIN-consensus-ecvrf | ECVRF proposer election (RFC 9381) | primitive | core/consensus/ (ECVRF) | A | transcluded | /chain/consensus#ecvrf | draft |
| CHAIN-consensus-finality | BFT checkpoint finality | primitive | core/consensus/ (checkpoints) | A | transcluded | /chain/consensus#finality | draft |
| CHAIN-lvm-revm | LVM / REVM EVM adapter + opcodes | primitive | core/execution/src/revm_adapter.rs | P | transcluded | /chain/lvm | draft |
| CHAIN-lvm-mvcc | MVCC + parallel executor | primitive | core/execution/src/{mvcc,parallel}/ | A | transcluded | /chain/lvm#parallel | draft |
| CHAIN-pre-tensor | Tensor precompiles | precompile/opcode | core/execution/src/tensor/ | A | transcluded | /chain/precompiles#tensor | draft |
| CHAIN-pre-zkp | ZKP verify (halo2/poseidon/merkle) | precompile/opcode | core/execution/src/zkp/, precompiles/verify.rs | X | gated | /chain/precompiles-zkp | draft |
| CHAIN-pre-inference | Inference proof gate | precompile/opcode | core/execution/src/inference/, precompiles/inference.rs | X | gated | /chain/precompiles-zkp#inference | draft |
| CHAIN-pre-attestation | TEE attestation gate | precompile/opcode | core/execution/src/precompiles/attestation/ | X | gated | /chain/precompiles-zkp#attestation | draft |
| CHAIN-pre-x402 | x402 dispute precompile | precompile/opcode | core/execution/src/precompiles/x402.rs | C | transcluded | /chain/precompiles#x402 | draft |
| CHAIN-pre-q16 | Belnap-q16 lattice aggregation | precompile/opcode | core/execution/src/precompiles/q16/ | A | transcluded | /chain/precompiles#q16 | draft |
| CHAIN-rpc-eth | Standard eth_*/net_*/web3_* + chain_*/state_*/mempool_* RPC | rpc | core/api/src/{eth_rpc.rs,server.rs} | P | transcluded | /chain/rpc | draft |
| CHAIN-rpc-citrate | citrate_* DAG/chain RPC (getDagStats; chain_getTips/getHeight/getBlock) | rpc | core/api/src/{eth_rpc.rs,server.rs} | P | transcluded | /chain/rpc#citrate | draft |
| CHAIN-rpc-ai | citrate_* AI RPC (getModels/chatCompletion/getTextEmbedding/requestInference) — NOT ai_* | rpc | core/api/src/{ai_rpc.rs,server.rs} | P | transcluded | /chain/rpc#ai | draft |
| CHAIN-rpc-econ | citrate_* economics RPC (gasPrice/getEconomicState/getVotingPower/getToken) — NOT economics_* | rpc | core/api/src/economics_rpc.rs | C | transcluded | /chain/rpc#economics | draft |
| CHAIN-cli-citrate | citrate-cli (account/model/contract/network/governance/wizard) | cli | cli/ | P | transcluded | /chain/cli | draft |
| CHAIN-cli-advanced | citrate-cli advanced (DAG/consensus/mempool) | cli | cli/ (advanced) | A | transcluded | /chain/cli#advanced | draft |
| CHAIN-cli-wallet | citrate-wallet CLI | cli | wallet/ | P | transcluded | /chain/cli#wallet | draft |
| CHAIN-cli-faucet | citrate-faucet | cli | faucet/ | P | transcluded | /chain/cli#faucet | draft |
| CHAIN-net-p2p | P2P / bootstrap / gossip | primitive | core/network/ | P | transcluded | /chain/network | draft |
| CHAIN-seq-mempool | Sequencer / mempool / bundle / parent-selection | primitive | core/sequencer/ | P→A | transcluded | /chain/sequencer | draft |
| CHAIN-storage | Storage (MPT/RocksDB/pruning/pinning) | primitive | core/storage/ | P→A | transcluded | /chain/storage | draft |
| CHAIN-econ | Economics (fees/tokenomics/rewards/slashing) | primitive | core/economics/ | P→X | transcluded | /chain/economics | draft |
| CHAIN-bridge | Cross-chain bridge | primitive | core/bridge/ | X | gated | /chain/bridge | draft |
| CHAIN-genesis | Chain params / genesis / chain-spec | spec | config/, node/config/ | P | transcluded | /chain/genesis | draft |

## 2. Smart Contracts  (repo: citrate-chain/contracts/src)

| id | surface | type | code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| SC-edu-classroomRegistry | ClassroomRegistry | contract | contracts/src/ClassroomRegistry.sol | P | transcluded | /contracts/edu | draft |
| SC-edu-classroomClusterV1 | ClassroomClusterV1 | contract | contracts/src/edu/ClassroomClusterV1.sol | P | transcluded | /contracts/edu | draft |
| SC-edu-budget | BudgetAllocation | contract | contracts/src/edu/BudgetAllocation.sol | P | transcluded | /contracts/edu | draft |
| SC-edu-cashout | CashoutRequest | contract | contracts/src/edu/CashoutRequest.sol | P | transcluded | /contracts/edu | draft |
| SC-edu-mentor | MentorMatcher | contract | contracts/src/MentorMatcher.sol | P | transcluded | /contracts/edu | draft |
| SC-edu-vault | InstitutionalVault | contract | contracts/src/edu/InstitutionalVault.sol | C | transcluded | /contracts/edu | draft |
| SC-edu-testnetFarming | TestnetFarmingAccounting | contract | contracts/src/TestnetFarmingAccounting.sol | P | transcluded | /contracts/edu | draft |
| SC-compute-marketplace | ComputeMarketplace | contract | contracts/src/ComputeMarketplace.sol | C | transcluded | /contracts/compute | draft |
| SC-compute-pool | ComputePool / ComputePoolTraining | contract | contracts/src/ComputePool.sol + ComputePoolTraining.sol | C | transcluded | /contracts/compute | draft |
| SC-compute-oracle | ComputePricingOracle | contract | contracts/src/ComputePricingOracle.sol | C | transcluded | /contracts/compute | draft |
| SC-compute-bulk | BulkComputeGateway | contract | contracts/src/BulkComputeGateway.sol | C | transcluded | /contracts/compute | draft |
| SC-compute-verifier | ComputeVerifier | contract | contracts/src/ComputeVerifier.sol | A | transcluded | /contracts/compute | draft |
| SC-model-registry | ModelRegistry / AIModelRegistryPortable | contract | contracts/src/ModelRegistry.sol | P | transcluded | /contracts/models | draft |
| SC-model-marketplace | ModelMarketplace | contract | contracts/src/ModelMarketplace.sol | C | transcluded | /contracts/models | draft |
| SC-model-lora | LoRAFactory | contract | contracts/src/LoRAFactory.sol | C | transcluded | /contracts/models | draft |
| SC-model-access | ModelAccessControl | contract | contracts/src/ModelAccessControl.sol | C | transcluded | /contracts/models | draft |
| SC-model-inferenceRouter | InferenceRouter | contract | contracts/src/InferenceRouter.sol | P | transcluded | /contracts/models | draft |
| SC-econ-wrappedSALT | WrappedSALT | contract | contracts/src/WrappedSALT.sol | P | transcluded | /contracts/economics | draft |
| SC-econ-staking | LiquidStakingPool | contract | contracts/src/LiquidStakingPool.sol | P | transcluded | /contracts/economics | draft |
| SC-econ-ipfs | IPFSIncentives / V2 | contract | contracts/src/IPFSIncentives*.sol | P | transcluded | /contracts/economics | draft |
| SC-econ-contrib | ContributionAccounting | contract | contracts/src/ContributionAccounting.sol | P | transcluded | /contracts/economics | draft |
| SC-econ-stable | StablecoinTreasury | contract | contracts/src/StablecoinTreasury.sol | C | transcluded | /contracts/economics | draft |
| SC-econ-mm | MarketMakerAllocation | contract | contracts/src/MarketMakerAllocation.sol | C | transcluded | /contracts/economics | draft |
| SC-gov-treasury | TreasuryGovernor | contract | contracts/src/TreasuryGovernor.sol | C | transcluded | /contracts/governance | draft |
| SC-gov-dispute | DisputeResolution | contract | contracts/src/DisputeResolution.sol | C | transcluded | /contracts/governance | draft |
| SC-gov-agentDecision | AgentDecisionRegistry | contract | contracts/src/AgentDecisionRegistry.sol | C | transcluded | /contracts/governance | draft |
| SC-gov-spec | SpecRegistry | contract | contracts/src/SpecRegistry.sol | A | transcluded | /contracts/governance | draft |
| SC-aa-forwarder | Forwarder (EIP-2771) | contract | contracts/src/edu/Forwarder.sol | C | transcluded | /aa/contracts | draft |
| SC-aa-factory | CitrateWalletFactory | contract | contracts/src/aa/ | C | transcluded | /aa/contracts | draft |
| SC-aa-paymaster | CitratePaymaster | contract | contracts/src/aa/ | C | transcluded | /aa/contracts | draft |
| SC-aa-validators | CitrateECDSAValidator / WebAuthnP256Validator | contract | contracts/src/aa/ | C | transcluded | /aa/contracts | draft |
| SC-aa-guardian | GuardianRecoveryModule | contract | contracts/src/aa/ | C | transcluded | /aa/contracts | draft |
| SC-x402-facilitator | X402Facilitator | contract | contracts/src/X402Facilitator.sol | C | transcluded | /contracts/x402 | draft |
| SC-x402-paywall | X402Paywall | contract | contracts/src/X402Paywall.sol | C | transcluded | /contracts/x402 | draft |
| SC-sec-kyc | KYCRegistry | contract | contracts/src/KYCRegistry.sol | X | gated | /contracts/security | draft |
| SC-sec-tee | TEEAttestationRegistry | contract | contracts/src/TEEAttestationRegistry.sol | X | gated | /contracts/security | draft |
| SC-sec-slashing | NematocystSlashing | contract | contracts/src/NematocystSlashing.sol | A | transcluded | /contracts/security | draft |
| SC-abi | Deployed addresses + ABI bundle | spec | contracts/DEPLOYED_ADDRESSES.md, @CitrateNetwork/contracts-abi | P | transcluded | /contracts/reference | draft |

## 3. SDKs & APIs

| id | surface | type | repo / code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| SDK-JS-CitrateClient | CitrateClient / WebSocketClient | sdk | citrate-sdk-js · src/index.ts | P | transcluded | /sdks/js | draft |
| SDK-JS-aa | AA module (userop/webauthn/kernel/recovery/bundler) | sdk | citrate-sdk-js · src/aa/ | P | transcluded | /sdks/js#aa | draft |
| SDK-JS-crypto | Crypto/KeyManager + Shamir | sdk | citrate-sdk-js · src/ (crypto) | P | transcluded | /sdks/js#crypto | draft |
| SDK-JS-react | React hooks (useCitrateClient) | sdk | citrate-sdk-js · dist/react/hooks | P | transcluded | /sdks/js#react | draft |
| SDK-PY-client | CitrateClient (deploy/inference/balance/nonce) | sdk | citrate-sdk-python · citrate_sdk/client.py | P | transcluded | /sdks/python | draft |
| SDK-PY-managers | Learning/Staking/Classroom/Compute/Treasury/Farming managers | sdk | citrate-sdk-python · citrate_sdk/ | P | transcluded | /sdks/python#managers | draft |
| SDK-PY-cli | `citrate` CLI (python) | cli | citrate-sdk-python · citrate_sdk/cli.py | P | transcluded | /sdks/python#cli | draft |
| SDK-MKT-client | MarketplaceClient | sdk | citrate-sdk-marketplace · src/client.ts | C | transcluded | /sdks/marketplace | draft |
| SDK-MKT-x402 | X402Client (challenge/settle/headers) | sdk | citrate-sdk-marketplace · src/x402.ts | C | transcluded | /sdks/marketplace#x402 | draft |
| SDK-MKT-wallet | CitrateWallet (keystore/injected) | sdk | citrate-sdk-marketplace · src/wallet/ | C | transcluded | /sdks/marketplace#wallet | draft |
| SDK-MKT-abi | ABI + calldata builders | sdk | citrate-sdk-marketplace · src/contracts.ts | C | transcluded | /sdks/marketplace#abi | draft |
| API-GW-rest | Inference gateway REST (/v1/chat/completions,/batch,/usage,/models) | api | citrate-inference-gateway · gateway/src/ | P | transcluded | /sdks/inference-gateway | draft |
| API-GW-x402 | Gateway x402 auth | api | citrate-inference-gateway · x402-axum | C | transcluded | /sdks/inference-gateway#x402 | draft |
| API-BUNDLER | ERC-4337 bundler JSON-RPC (+ citrate_getUserAddress) | api | citrate-bundler | C | transcluded | /sdks/bundler | draft |

## 4. Account Abstraction & Identity

| id | surface | type | repo / code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| ID-oidc | OIDC issuer + claim shapes (sub/wallet_address/email) | api | citrate-identity · src/server.ts | P | transcluded | /aa/identity | draft |
| ID-kyc | KYC status model (CLEAR/Sumsub) | api | citrate-identity · src/kyc-pg.ts | X | gated | /aa/identity#kyc | draft |
| ID-guardians | Guardian nomination / recovery | api | citrate-identity · src/aa/guardians.ts | C | transcluded | /aa/guardians | draft |
| ID-entitlement | The `entitlement` claim (Codex tiers) | spec | citrate-identity (S2, new) | A | authored | /aa/identity#entitlement | draft |
| AA-passkeys | Passkeys / WebAuthn / Kernel UserOps | primitive | citrate-sdk-js src/aa/ + contracts/src/aa/ | P | authored | /aa/passkeys | draft |
| AA-paymaster | Paymaster policy / bundler topology | primitive | contracts/src/aa/ + citrate-bundler | C | authored | /aa/paymaster | draft |

## 5. Compute & Inference  (operator-facing)

| id | surface | type | repo / code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| OPS-node-agent | node-agent (register/bid/heartbeat/execute/claim, supervision HTTP, compute.json) | cli | citrate-node-agent · crates/ | Ck | transcluded | /compute/node-agent | draft |
| OPS-compute-pool | pool-coordinator + training-worker | cli | citrate-compute-pool · | C | transcluded | /compute/pool | draft |
| OPS-gateway | Inference gateway operation (marketplace/local-proxy/DGX) | api | citrate-inference-gateway | C | transcluded | /compute/gateway | draft |
| OPS-agent-runtime | agent-runtime CLI (doctor) + RecorderClient/ApprovalQueue | cli | citrate-agent-runtime | A | transcluded | /compute/agent-runtime | draft |

## 6. Apps & dApps — Web

| id | surface | type | repo | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| APP-explorer | CitrateScan explorer | app-web | citrate-explorer | P | transcluded | /apps/explorer | draft |
| APP-dashboard | FL monitoring dashboard | app-web | citrate-dashboard | C | transcluded | /apps/dashboard | draft |
| APP-buyer | Marketplace buyer webapp | app-web | citrate-buyer-webapp | C | transcluded | /apps/buyer | draft |
| APP-chatbot | Gasless AI chatbot dApp | app-web | citrate-chatbot | P | transcluded | /apps/chatbot | draft |
| APP-landing | Marketing/landing site | app-web | citrate-landing | P | transcluded | /apps/landing | draft |
| APP-district | District registration (KYC onboarding) | app-web | citrate-district-registration | Ck | transcluded | /apps/district-registration | draft |
| APP-memories | Memrizz (memory DAG webapp + MCP) | app-web | citrate-memories | C | transcluded | /apps/memories | draft |

## 7. Apps & dApps — Native / Desktop / Extension

| id | surface | type | repo | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| APP-native | Citrate native wallet + DAG explorer (Slint) | app-native | citrate-native | P | transcluded | /apps/native | draft |
| APP-learning | Learning Center desktop (Slint) | app-native | citrate-learning-center | A | transcluded | /apps/learning-center | draft |
| APP-studio | Citrate Studio (agent-runtime control UI) | app-native | citrate-studio | X | gated | /apps/studio | draft |
| APP-boeing | Boeing shell (customer) | app-native | citrate-boeing-shell | X | gated | /apps/boeing | draft |
| APP-comms | citrate-comms (E2E team workspace) | app-native | citrate-comms | C | transcluded | /apps/comms | draft |
| APP-wallet-ext | Browser wallet extension (MV3) | app-web | citrate-wallet-extension | P | transcluded | /apps/wallet-extension | draft |
| APP-nist | nist-agent (air-gapped sidecar) | app-native | nist-agent | P→X | transcluded | /apps/nist-agent | draft |

## 8. Federated Learning & Research  (academic)

| id | surface | type | repo / code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| RES-learning | Learning cycles / orchestration | primitive | citrate-chain core/learning* | A | transcluded | /research/learning | draft |
| RES-mentorship | Mentorship Protocol | paper | gradient_papers_v3/ (No.3) | A | linked | /research/mentorship | draft |
| RES-paraconsistent | Paraconsistent consensus (Belnap) | paper | gradient_papers_v3/ (No.2) | A | linked | /research/paraconsistent | draft |
| RES-verifiable | Verifiable inference (Q16/Halo2-KZG/TEE) | paper | gradient_papers_v3/ (No.10) | A | linked | /research/verifiable-inference | draft |
| RES-atis | ATIS | paper | gradient_papers_v3/ | A | linked | /research/atis | draft |
| RES-papers | Gradient Papers v3 (10) | paper | citrate-docs/gradient_papers_v3/ | A | linked | /research/gradient-papers | draft |
| RES-tla | TLA+ corpus (200+) | spec | citrate-agentile-archive/formal/ + per-repo specs/ | A | linked | /research/tla | draft |
| RES-bdd | Gherkin BDD library | spec | per-repo specs/gherkin/ + features/ | A | linked | /research/bdd | draft |

## 9. Node Operators / Enterprise / Methodology / Internal

| id | surface | type | repo / code_path | tier | source_kind | codex_slug | status |
|---|---|---|---|---|---|---|---|
| NODE-run | Run a node (devnet/testnet/docker) | sop | citrate-chain README + docs/PRIVATE_NETWORK.md | P | transcluded | /operators/run-a-node | draft |
| NODE-sell | Sell compute end-to-end | sop | citrate-node-agent README | Ck | transcluded | /operators/sell-compute | draft |
| NODE-rewards | Rewards / reputation / slashing-protection | sop | core/economics + node-agent | C | transcluded | /operators/rewards | draft |
| ENT-procurement | Procurement (MSA/SOW/order forms) | sop | citrate-commercial | C | authored | /enterprise/procurement | draft |
| ENT-dpa | DPA / SLA / subprocessors | sop | citrate-compliance | C | gated | /enterprise/dpa | draft |
| ENT-compliance-pub | Compliance posture (sanitized public) | sop | citrate-compliance (sanitized) | P | authored | /enterprise/compliance | draft |
| ENT-compliance-full | Compliance posture (full) | sop | citrate-compliance/ | X | gated | /enterprise/compliance-full | draft |
| ENT-questionnaires | Security questionnaires (SIG/CAIQ) | sop | citrate-compliance | C | gated | /enterprise/questionnaires | draft |
| ENT-k12 | K-12 / FERPA-COPPA-CIPA | sop | citrate-docs/public-goods/learning-center/ | P/Ck | transcluded | /enterprise/k12 | draft |
| ENT-federal | Federal/defense (CMMC/FedRAMP/ITAR) | sop | citrate-compliance + nist-agent | X | gated | /enterprise/federal | draft |
| ENT-org-<id> | Per-company private spaces | sop | private:<org> | C/X | gated | /enterprise/<org> | registry |
| METH-rules | Agentile 13 rules | sop | docs/AGENTILE_RULES.md | P | linked | /methodology/rules | draft |
| METH-workflow | Sprint lifecycle / workflow | sop | docs/AGENTILE_WORKFLOW.md | P | linked | /methodology/workflow | draft |
| METH-sops-pub | Customer/dev/operator SOPs | sop | various READMEs | P/C | authored | /methodology/sops | draft |
| METH-sops-int | Internal SOPs (incident/access-review/etc.) | sop | ops/04_SOP_STANDARD.md | X | gated | /internal/sops | draft |
| INT-audit | Audit reports & findings | sop | citrate-security/audits/ | X | gated | /internal/audit | draft |
| INT-ops | Ops pack | sop | ops/ | X | gated | /internal/ops | draft |
| INT-funding | Funding / data room | sop | funding/docs/ | X | gated | /internal/funding | draft |
| INT-registers | Compliance registers (roles/privileges, readiness) | sop | citrate-compliance/registers/ | X | gated | /internal/registers | draft |
| INT-incident | Incident response | sop | ops/ + security | X | gated | /internal/incident | draft |

## Corrections log (doc agents append here)

> Format: `YYYY-MM-DD · id · field · old → new · reason (with code_path/SHA)`.

- 2026-06-14 · START-what-is-citrate, START-primer, START-agentile, START-first-10min · (new rows) · — → added · Section 0 "Start Here" was enumerated in `06_INFORMATION_ARCHITECTURE.md` §0 but had no registry rows; added so authored Start Here pages map to surfaces (coverage gate §6). All `P`; authored except START-agentile (linked → AGENTILE.md). SHA cd729ed.
- 2026-06-14 · METH-rules · status · registry → draft · authored `/methodology/rules` (linked → docs/AGENTILE_RULES.md). SHA cd729ed.
- 2026-06-14 · METH-workflow · status · registry → draft · authored `/methodology/workflow` (linked → docs/AGENTILE_WORKFLOW.md). SHA cd729ed.
- 2026-06-14 · METH-sops-pub · status · registry → draft · authored `/methodology/sops` (index; internal SOPs noted as gated, not transcribed). SHA cd729ed.

2026-06-14 · SDK-JS-react · code_path · `dist/react/hooks` → `src/react/hooks.ts` (source of truth; `dist/` is build output) · the hooks live in source at `src/react/hooks.ts`; the documented *import path* remains `citrate-js/dist/react/hooks` because the root index.ts does not re-export react (optional peer dep). (citrate-sdk-js@bc5a830)
2026-06-14 · SDK-JS-crypto · code_path · `src/ (crypto)` → `src/crypto/{CryptoManager,KeyManager,FiniteField}.ts` (precise paths; Shamir lives in FiniteField.ts). (citrate-sdk-js@bc5a830)
2026-06-14 · SDK-JS-CitrateClient · code_path · `src/index.ts` → `src/client/CitrateClient.ts` + `src/client/WebSocketClient.ts` (re-exported via src/index.ts; truth is the client/ files). (citrate-sdk-js@bc5a830)
2026-06-14 · SDK-JS-* · note · add: package name is `citrate-js` (package.json#name), version `0.2.0`. README's `@citratenetwork/sdk` is NOT the published name — install is `npm install citrate-js`. (citrate-sdk-js@bc5a830)
2026-06-14 · SDK-JS-* · note · BUG to flag (not a registry field): exported `VERSION` constant in `src/index.ts` is `0.1.1`, stale vs `package.json` `0.2.0`. (citrate-sdk-js@bc5a830)
2026-06-14 · ID-entitlement · status/notes · (row unchanged) · VERIFIED NOT YET IN CODE — no `entitlement` scope/claim in `citrate-identity/src/config.ts`@4aa869c (scopes: openid/profile/wallet/kyc/offline_access). Documented conceptually only on /aa/identity#entitlement, marked "planned". Row already says `code_path: citrate-identity (S2, new)` + `source_kind: authored`, which correctly reflects this. No edit; flagged for accuracy.
2026-06-14 · ID-guardians · code_path · `src/aa/guardians.ts` → note: HTTP surface (`POST /auth/guardians`, `GET /aa/guardians`) lives in `src/aa/guardian-routes.ts`; `guardians.ts` is the pure nomination logic. (citrate-identity@4aa869c) (note only)
2026-06-14 · ID-kyc · code_path · `src/kyc-pg.ts` is accurate for the claim-record store (NO PII: status+dates+opaque vendor_ref, ADR-2026-06-03); the gated vendor wiring (CLEAR/Sumsub) + webhook live in `src/kyc.ts` / `src/kyc-routes.ts`. Internals correctly kept gated. (citrate-identity@4aa869c) (note only)
2026-06-14 · AA-passkeys/AA-paymaster · note · published package name is `citrate-js` (NOT `@citrate/sdk`); AA helpers are re-exported via the root `citrate-js` index from `src/aa/`. AA docs use `citrate-js`. (citrate-sdk-js@bc5a830)
2026-06-14 · API-BUNDLER · note · bundler README §"Public endpoints" shows `POST https://bundler.citrate.ai/` but the SDK `BundlerClient` (src/aa/bundler.ts) + `citrate_getUserAddress` doc both use `/rpc`. Caddyfile routes `/` to the gate→bundler. Likely README drift; AA docs use the SDK default `/rpc`. (citrate-bundler@a3287de / citrate-sdk-js@bc5a830)
2026-06-14 · SDK-PY-cli · notes · BROKEN ENTRY POINT — `citrate_sdk/cli.py` does NOT exist @0b5c642; `pyproject.toml [project.scripts] citrate = "citrate_sdk.cli:main"` resolves to a missing module (ModuleNotFoundError on `citrate`). Documented honestly on /sdks/python#cli; recommend implementing or removing the entry point. (citrate-sdk-python@0b5c642)
2026-06-14 · SDK-PY-* · note · published PyPI name is `citrate-ai-sdk` (import `citrate_sdk`), self-marked non-canonical/Pre-Alpha (canonical SDK = citrate-js). (citrate-sdk-python@0b5c642)
2026-06-14 · API-BUNDLER · notes · `citrate_getUserAddress` is declared in README but NOT implemented @a3287de (gate only prechecks `eth_sendUserOperation` then proxies to eth-infinitism; no citrate_* handler). code_path precision: `gate/src/server.ts` + `gate/src/precheck.ts`. (citrate-bundler@a3287de)
2026-06-14 · API-GW-x402 · code_path · `x402-axum` → `crates/x402-axum/`. Also API-GW-rest: live chain queries in `gateway/src/queries.rs` are stubbed (ChainUnavailable) @a2ad401 — mark pre-audit/WP-03.2 pending; add read routes GET /v1/batch/{id} and /v1/batch/{id}/output. (citrate-inference-gateway@a2ad401)
2026-06-14 · NODE-run · code_path · `citrate-chain README + docs/PRIVATE_NETWORK.md` → `citrate-chain README + docs/OPERATIONS.md` (PRIVATE_NETWORK.md does not exist @03d7851; OPERATIONS.md is the real operator runbook). (citrate-chain@03d7851)
2026-06-14 · CHAIN-cli-citrate · note · surface description omits `init` and `advanced` subcommands (both exist in clap @03d7851). CHAIN-cli-faucet is typed `cli` but is an env-configured HTTP server (routes / /faucet /status /health), no subcommands. citrate-wallet flag is `--rpc` (README drift shows `--rpc-url`). (citrate-chain@03d7851)
2026-06-14 · STATUS · the SDK/CLI/app/AA/compute rows authored this wave are now `draft` (pages staged under citrate-docs/content/, audited_against_sha recorded). Remaining `registry` rows (chain core, contracts, research, internal) await later waves.
2026-06-14 · SECURITY · two committed-credential findings surfaced by doc agents were routed to the architect + citrate-security OUT-OF-BAND (not recorded here — recording repo+path of a live secret in a docs repo would aid an attacker). No secrets were transcribed into any content page (verified by scan).
2026-06-14 · CHAIN-storage · note · surface label "Storage (MPT/RocksDB/...)" is conceptual, NOT literal: state is a FLAT KV model over RocksDB column families with a COMPUTED state root (SHA3-256 over sorted accounts||storage||AI roots, `StateManager::calculate_state_root` in core/storage/src/state_manager.rs) — there is no Merkle Patricia Trie. Page documents the actual mechanism. (citrate-chain@03d7851) (note only)
2026-06-14 · CHAIN-econ · note · verified PUBLIC tokenomics: SALT, TOTAL_SUPPLY 1_000_000_000, DECIMALS 18 (core/economics/src/lib.rs + token.rs); default fee split creators30/validators23/infra15/stakers15/treasury12/facilitators5 + 10% MM gas skim (revenue_sharing.rs); block_reward 10 SALT, halving 2.1M blocks, 90/10 validator/treasury (rewards.rs). Slashing params + genesis account ADDRESSES kept confidential per tier (NOT enumerated). No private keys/mnemonics in repo — public addresses only, key material out-of-band. (citrate-chain@03d7851) (note only)
2026-06-14 · CHAIN-genesis · note · chainId 40204 confirmed for testnet-beta/team/devnet (node/config/*.toml + genesis.rs); mainnet config has chain_id=1 but is PRE-LAUNCH (empty bootstrap_nodes placeholder, fail-closed production_mode). Consensus constants: GhostDAG k=18, max_parents 10, checkpoint interval 50, committee 100 (testnet)/10 (team), quorum 2/3+1; block_time 1s(testnet)/2s(dev,team)/5s(mainnet). Deterministic genesis enforced + TLA+-checked. NO genesis keys authored; genesis addresses not enumerated in public page. (citrate-chain@03d7851) (note only)
2026-06-14 · CHAIN-bridge · source_kind · `gated` → page authored as PUBLIC stub `authored` (codex_slug /chain/bridge), while the CONFIDENTIAL internals (core/bridge/, incl. SECURITY.md) remain X/gated and are NOT documented. The registry row's `gated` correctly describes the confidential surface; the public stub page is a separate public-safe overview. Status verified pre-alpha, mainnet ceremony pending audit. No internals/mechanism/thresholds transcribed. (citrate-chain@03d7851) (note only)
2026-06-14 · SC-* · code_path · MAJOR: contract source layout is FLAT (`contracts/src/<Name>.sol`), NOT the nested `edu/classroom/`, `compute/`, `models/`, `governance/`, `x402/`, `economics/` subdirs the registry assumed. Exceptions that ARE nested: `contracts/src/edu/{ClassroomClusterV1,BudgetAllocation,CashoutRequest,InstitutionalVault,Forwarder}.sol`, `contracts/src/aa/*` (factory/paymaster/validators/guardian). NOTE `core/economics/` is an unrelated Rust crate, not contracts. (citrate-chain@03d7851)
2026-06-14 · SC-aa-forwarder · code_path · `contracts/src/edu/Forwarder.sol` → `contracts/src/edu/Forwarder.sol` (the only EIP-2771 Forwarder; consider regrouping under edu/AA). (citrate-chain@03d7851)
2026-06-14 · SC-sec-* · code_path · KYCRegistry/TEEAttestationRegistry/NematocystSlashing are at `contracts/src/<Name>.sol` (flat), not governance/security/consensus subdirs. (citrate-chain@03d7851)
2026-06-14 · CHAIN-rpc-* · MAJOR · the registry+fixtures RPC names are FICTIONAL. Real @03d7851: DAG = `chain_getTips`/`chain_getHeight`/`chain_getBlock` + `citrate_getDagStats` (NOT citrate_blockDAG/blueScore/selectedParent/tipSet). AI methods use `citrate_*` prefix (citrate_requestInference/getModels/getTextEmbedding/semanticSearch/chatCompletion), NOT ai_*. Economics use `citrate_*` (citrate_gasPrice/getEconomicState/getVotingPower/getToken), NOT economics_*. eth_* registration is in core/api/src/{eth_rpc.rs,server.rs} (methods/ holds backing structs). ACTION: fix prototype/fixtures/content.ts + sandboxes.ts to use real method names. (citrate-chain@03d7851)
2026-06-14 · CHAIN-pre-zkp/inference · code_path · normalize to `core/execution/src/precompiles/{verify,inference}.rs`; inference precompile addresses are 0x0100-0x0106 (7 slots). (citrate-chain@03d7851)
2026-06-14 · STATUS · chain-core + contracts wave authored ~24 pages under content/{chain,contracts,aa}/ (all audited_against_sha 03d7851) → status draft. CHAIN-storage "MPT" is conceptual (impl is flat-KV + computed SHA3-256 root).

2026-06-15 · RECONCILED · applied in-place: CHAIN-rpc-* rows -> real method names (citrate_getDagStats, chain_getTips/getHeight/getBlock, citrate_* AI/econ); all SC-* code_path flattened to contracts/src/*.sol (edu nested set + aa kept); fixtures (content.ts/sandboxes.ts) + DESIGN_BRIEF sandbox table -> real RPC names + package citrate-js.

2026-06-15 · RES-* · status · `registry` → `draft` · RES-{learning,mentorship,paraconsistent,verifiable,atis} authored under content/research/ + tutorial reproduce-a-learning-round.md. (citrate-chain@03d7851)
2026-06-15 · RES-learning · note · `core/learning/ARCHITECTURE.md` (dated 2026-03-01) is STALE vs the crate @03d7851: its "CRITICAL/HIGH" gaps GAP-1 (φ classification), GAP-2 (dual-output aggregation), GAP-3 (router takes state vector), GAP-5 (macro-phase split) are now IMPLEMENTED in src/{belnap.rs::classify_belnap, aggregation.rs::ParaconsistentAggregator, routing.rs (route takes state_vector), phases.rs::MacroPhaseManager}. Crate README reports 272 tests. The remaining frontier is node-binary/consensus-struct wiring (learning fields not yet in core/consensus types) + live testnet rounds. Page documents this honestly (crate=implemented, on-chain round=specified/partial). (citrate-chain@03d7851)
2026-06-15 · RES-atis · note · VERIFIED no code anchor — ATIS (Paper V) is theoretical hardware research; no citrate-chain code path exists. Row's `gradient_papers_v3/` source is correct; page marked aspirational. (citrate-chain@03d7851) (note only)
2026-06-15 · RES-verifiable · note · paper-level academic page is PUBLIC-safe summary; the precompile implementation internals (CHAIN-pre-zkp/inference/attestation) remain X/gated and are NOT documented on /research/verifiable-inference. Dev-only insecure SRS fallback seed from the paper deliberately NOT transcribed. (citrate-chain@03d7851) (note only)
2026-06-16 · S6 COVERAGE · filled holes /compute/gateway + /operators/rewards (content); added /internal/{registers,incident,sops} to the Confidential gateway store + nav (gated, served via /api/content). Reconciled statuses: 132 rows → draft (authored content page OR gateway-served), 1 remaining `registry` = ENT-org-<id> (per-company runtime template, tracked stub by design). Coverage gate (PLANSET/01 §6) satisfied. Tier-1 artifacts added: SECURITY.md, audits/, .github/workflows/ci.yml (build+typecheck+verify:bundle+sbom), RELEASE.md, npm run sbom (CycloneDX). Pending (off-sandbox): branch protection, cosign keyless-OIDC signing, named-auditor attestation for v1.0.0.
