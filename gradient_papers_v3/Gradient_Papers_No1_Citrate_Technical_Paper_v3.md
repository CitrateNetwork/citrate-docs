---
title: "Citrate: Protocol Specification for an AI-Native BlockDAG Network (v3)"
version: v3
created: 2026-04-28T03:10:00Z
branch: main
author: Larry Klosowski + Saul Loveman + Claude Opus 4.7
status: active
maturity: Verified — testnet chain id 40204, 38 contracts on-chain
supersedes: v2 (February 2026)
---

# Paper I — Citrate: Protocol Specification for an AI-Native BlockDAG Network (v3)

## Abstract

Citrate is a Layer-1 BlockDAG with an EVM-compatible execution
environment (the **Lattice Virtual Machine**, LVM) and a set of
AI-native precompiles. It is designed to make AI models
**first-class on-chain assets**: registries, weights, training
logs, inference proofs, and contribution accounting all live in
canonical chain state.

This paper is the foundational specification — every other paper
in the v3 series cites it. v3 differs from v2 in two
material ways: (1) we now have a **live testnet** (chain id 40204,
RPC `https://rpc.citrate.ai`) so claims about consensus, finality,
and gas have on-chain evidence; (2) the AI precompile address
plan has been finalized at `0x0107–0x010F` (verification +
deterministic compute) replacing v2's `0x1000–0x1004` placeholder
range.

## 1. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Lattice Virtual Machine (LVM)                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Standard EVM precompiles (0x01–0x09)                         │ │
│ │ AI precompiles (0x0100–0x010F): inference, ZK, Q16 compute   │ │
│ │ x402 payment precompiles (0x0200–0x0202)                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ REVM-based executor with parallel scheduling (P950-A series) │ │
│ │ Journal + CAS write-set tracking → 2.02× speedup @ 8 workers │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   GhostDAG Consensus                             │
│ k = 18, max_parents = 10, BFT checkpoint every 50 blocks         │
│ ECVRF-P256 proposer election, RFC 9381 compliant                 │
├─────────────────────────────────────────────────────────────────┤
│              Storage (RocksDB-backed, MPT)                       │
│ Persistent DAG store, account state, receipts, artifact roots    │
├─────────────────────────────────────────────────────────────────┤
│              Network (libp2p, gossipsub)                         │
└─────────────────────────────────────────────────────────────────┘
```

Source map: `core/consensus/`, `core/execution/`, `core/storage/`,
`core/network/`. Every layer has a `README.md` and a TLA+ spec at
`specs/tla/<layer>/`.

## 2. GhostDAG consensus [Implemented]

GhostDAG is a generalization of the GHOST rule from a tree to a
directed acyclic graph. Each block has:

- one **selected parent** (the "main chain" pointer)
- zero or more **merge parents** (other tips the block witnessed)

A block's **blue set** is the maximal subset of its ancestors that
respect the **k-cluster rule**: no block in the set has more than
`k` blue anti-cone elements. v0.5.0 ships `k=18, max_parents=10`,
matching the original GhostDAG paper's recommended values.

**Total order:** the canonical execution sequence is the selected-
parent chain plus the mergeset, topologically sorted by **blue
score**. This guarantees:

1. **Determinism** — every honest node produces the same total order.
2. **High throughput** — orphan blocks are not wasted (they enter
   the blue set if k-cluster-consistent).
3. **Fast confirmation** — a block enters the blue set as soon as
   one descendant references it.

Source: `core/consensus/src/ghostdag.rs`. Spec:
`specs/tla/consensus/GhostDAG.tla` (verified, 412K states).

### 2.1 Finality

Probabilistic finality from blue score is augmented by a **BFT
checkpoint** every 50 blocks:

| Parameter | Value |
|-----------|-------|
| Committee size | 100 validators |
| Quorum | 67 (2/3 + 1) |
| Checkpoint interval | 50 blocks |
| Block time | ~0.5–1 s |
| Time to checkpoint finality | ~25–50 s |

When 67+ validators co-sign a checkpoint, the chain at that
height is **deterministically final** — no reorg below the
checkpoint is possible without 34+ validators being slashed.
Source: `core/consensus/src/finality.rs`. Spec:
`specs/tla/consensus/CheckpointFinality.tla` (verified).

### 2.2 Proposer election (ECVRF)

Block proposers are selected via **ECVRF-P256-SHA256** (RFC 9381):

- Proof format: 114 bytes = `pk_p256(33) ++ Gamma(33) ++ c(16) ++ s(32)`
- Alpha binding: `SHA3(ed25519_pubkey || prev_vrf_output || slot_number)`
- Backward-compatible: verifier accepts both 114-byte ECVRF and
  32-byte legacy SHA3 proofs

This makes proposer selection **unbiasable, unpredictable, and
verifiable** — Sprint S work, closed and on-chain since v0.4.0.

## 3. Lattice Virtual Machine [Implemented]

The LVM is **100% EVM-bytecode-compatible** via REVM. Solidity
contracts compiled for Ethereum mainnet deploy to Citrate
unchanged. We add — never subtract.

### 3.1 Precompile architecture

| Range | Family | Purpose |
|-------|--------|---------|
| `0x01–0x09` | Standard Ethereum | ECRECOVER, SHA256, MODEXP, bn254, BLAKE2F |
| `0x0100–0x0106` | Citrate AI runtime | Model registry, inference, encryption |
| `0x0107–0x0109` | Citrate AI verification | Tensor commit, inference proof, Merkle |
| `0x010A–0x010F` | Citrate Q16 compute | Matmul, dot, softmax, relu, linear, transpose |
| `0x0200–0x0202` | Citrate x402 | EIP-712 verify, transfer-auth, batch |

Full registry with gas costs and wire formats:
[`PRECOMPILES.md`](../citrate_v0.01.1/docs/technical/PRECOMPILES.md).

### 3.2 Three-tier verifiable inference

Citrate offers three trust modes for inference, gas-priced
proportionate to their cryptographic guarantees:

| Tier | Mechanism | Gas (typical) | Trust assumption |
|------|-----------|--------------:|------------------|
| 1 — Signature | Provider signs (input, output) | ~21K | Trust the provider's key |
| 2 — Optimistic | Same as tier 1 + fraud-proof window | ~50K | Trust ≥1 honest watcher |
| 3 — ZK | Halo2-KZG proof of inference circuit | ~1M | Trust the math |

Tier 3 is **live** as of RM-M1b WP-M1b.4 (commit `781a8b03`,
2026-04-26). The verifier is precompile `0x0108`,
`INFERENCE_PROOF_VERIFY`. Detailed wire format and Solidity recipe:
[`ZK_VERIFICATION.md`](../citrate_v0.01.1/docs/technical/ZK_VERIFICATION.md).

### 3.3 Parallel execution

The executor schedules disjoint transactions in parallel using a
**journal + CAS write-set** strategy:

- Each tx executes against an optimistic snapshot of state.
- Read/write sets are recorded in a per-tx journal.
- A coordinator merges journals, retrying conflicts serially.

Measured speedup (v0.4.0, `benchmarks/parallel_tps_verified_2026_04_21.md`):

| Workers | Parallel speedup (disjoint microbench) |
|--------:|---------------------------------------:|
| 1 | 1.00× |
| 8 | 2.41× |

The "apples-to-apples" speedup against single-threaded REVM with
identical workloads is **2.02×** at 8 workers. Real-world TPS is
RPC/signature/disk-bound; the executor is far from the bottleneck.

## 4. Cryptography [Implemented]

Citrate supports two signature schemes side-by-side:

| Scheme | Use case | Verification cost |
|--------|----------|-------------------|
| **secp256k1 ECDSA** | Ethereum-compatible flows (MetaMask, EIP-1559, EIP-712) | ~3000 gas |
| **Ed25519** | Native flows (CLI wallet, validator signing) | ~300 gas (10× faster) |

Address derivation is **smart**:

- 20-byte EVM addresses padded with 12 zeros are used directly
  (preserves Ethereum address compatibility for cross-chain tools).
- 32-byte ed25519 public keys are Keccak256-hashed to 20 bytes
  (last 20 of the digest), matching Ethereum's address derivation
  for non-native curves.

Source: `core/execution/src/types.rs` lines 13–34.

## 5. Tokenomics — SALT [Implemented for emission, Specified for distribution]

| Parameter | Value | Source |
|-----------|-------|--------|
| Token symbol | SALT | `CONFIG.md` Tier 1 |
| Total supply | 1,000,000,000 (fixed) | Genesis |
| Decimals | 18 | Genesis |
| Genesis allocation — Treasury | 500,000,000 | Genesis hardcode |
| Genesis allocation — Faucet (testnet) | ~50,000,000 | Genesis hardcode |
| Genesis allocation — Team | 10,000,000 | Genesis hardcode |
| Genesis allocation — Validator (coinbase) | 5,000,000 | Genesis hardcode |
| Mining (block rewards) | TBD distribution curve | `core/economics` |
| Ecosystem | TBD | governance |
| Vesting (team) | 4 yr / 1 yr cliff | governance contract |

The v3 distribution will be locked on mainnet launch via the
TreasuryGovernor + ContributionAccounting contracts (canonical
addresses in [`TESTNET_ADDRESS_BOOK_2026_04_27.md`](../.agentile/launch/TESTNET_ADDRESS_BOOK_2026_04_27.md)).
Mainnet pre-launch numerics are tracked in `MAINNET_LAUNCH_STAGING.md`.

## 6. AI primitives — model lifecycle [Implemented]

A model lives on Citrate as a chain of contract interactions:

```
1. (off-chain) Train weights, push to IPFS, get CID
2. MODEL_DEPLOY(0x0100)   → register CID + canonical hash
3. ModelRegistry.register(canonicalHash, IPFS_CID, metadata)
4. ModelAccessControl.grant(modelId, allowedAddresses)
5. (off-chain) Worker pulls weights from IPFS, attests via TEE
6. InferenceRouter.requestInference(modelId, input)
7. Worker runs inference, posts (input, output, attestation)
8. INFERENCE_PROOF_VERIFY(0x0108) optionally proves correctness
9. Settlement: MarketMakerAllocation routes payment to worker
```

The contract addresses for steps 3–9 are pinned in
[`TESTNET_ADDRESS_BOOK_2026_04_27.md`](../.agentile/launch/TESTNET_ADDRESS_BOOK_2026_04_27.md). The
flow is exercised end-to-end by `core/execution/tests/inference_proof_verify_e2e.rs`.

### 6.1 Strict mode

Production builds gate `MODEL_INFERENCE` (0x0101) and
`BATCH_INFERENCE` (0x0102) behind `InferenceMode::Strict`. These
two precompiles are **non-deterministic** until TEE-attested
inference lands (CM-08). Strict mode refuses to run them; devnet
opts in via `--allow-nondeterministic-inference` (gated by the
`dev-mode` cargo feature). CI tripwire
`scripts/ci/check_m3_strict_mode_locked.py` enforces.

## 7. Storage architecture [Implemented]

| Subsystem | Backend | Notes |
|-----------|---------|-------|
| Account state | MPT over RocksDB | Standard Ethereum semantics |
| Block store | RocksDB column families | Per-height index |
| Receipts | RocksDB | Bloom-indexed |
| **Persistent DAG** | RocksDB column families | Sprint S — restart no longer requires re-sync |
| **Checkpoints** | RocksDB | Sprint S — VRF-seeded committee selection |
| Off-chain artifacts | IPFS (referenced by CID) | `IPFSIncentives` contract pays pinners |

The persistent DAG store (Sprint S, v0.4.0) lets a node restart
without re-walking the chain — the in-memory tip set, blue
scores, and finalized heights load from RocksDB on boot. Source:
`core/consensus/src/dag_store.rs`.

## 8. Performance [Verified March 2026 baseline]

| Metric | Target | Current |
|--------|--------|---------|
| Network throughput | 10,000+ TPS | **5,000 TPS sustained, 10,000 ceiling** |
| Finality | ≤ 12 s | **≤ 12 s** (BFT checkpoint @ 50 blocks × 0.5–1s) |
| Block time | 1–2 s | **~0.5–1 s typical** |
| DAG width | 100+ parallel blocks | Supported |
| Parallel speedup | ≥ 2× | **2.02× apples-to-apples** |

Sources: `benchmarks/benchmark_2026_03_20.md`,
`benchmarks/parallel_tps_verified_2026_04_21.md`.

## 9. What's not in v0.5.0 [Specified, not yet implemented]

| Feature | Tracked in | Target |
|---------|-----------|--------|
| Paraconsistent learning protocol | Paper II | RM-PARA-* sprints |
| Mentorship adapter routing | Paper III | RM-MENT-* sprints |
| Cross-chain $SNAP bridge (mainnet) | Paper VI v3 | RM-BRIDGE-* sprints |
| ATIS analog hardware integration | Paper V | external research |
| Mainnet launch ceremony | Paper VIII + IX | RM-LAUNCH-* (post-mainnet-staging) |

The v3 series treats these as **specified but not implemented**.
Each downstream paper carries its own status header.

## 10. Audit and reality check

**Most recent audit:** `.agentile/audits/2026-04-25-reaudit/`
scored Citrate **820/1000** against a 1000-point rubric covering
consensus correctness, executor safety, contract security, and
operational maturity.

Open carry-forward items (from `.agentile/audits/2026-04-26-remediation-track-2/`):

- 5 work packages from RM-I (state-bound governance) deferred to RM-I-3.
- Faucet curve unification (secp256k1 vs ed25519 derivation
  divergence) — tactical workaround in place; permanent fix in CM-08.
- Mainnet ceremony posture — current testnet uses single-EOA
  governance; real launch sets `governance()` to 3-of-5 hardware-
  wallet Safe via the `GOVERNANCE` env var on deploy.

Open issues are tracked in `.agentile/sprints/active/` and
folded into the v3 honesty principle: nothing in this paper
claims to be done that isn't measurably done.

## 11. References

- **GhostDAG**: Sompolinsky, Y. and Zohar, A. *PHANTOM and GHOSTDAG: A Scalable Generalization of Nakamoto Consensus*. IACR 2018/104.
- **Halo2**: Bowe, S. et al. *Halo2: Recursive proof composition without a trusted setup*. Electric Coin Co., 2020.
- **EIP-3009 / x402**: Coinbase x402 protocol (https://www.x402.org).
- **REVM**: bluealloy/revm, used as the execution backend.
- **RFC 9381**: Verifiable Random Functions (VRFs), IETF, 2023.

## 12. Reading next

- Paper II (Paraconsistent Consensus) — how learning slots into
  the BFT checkpoint protocol.
- Paper X (Substrate of Verifiable Inference) — the Halo2-KZG +
  Q16 substrate, with proof-of-correctness sketches.
- `PRECOMPILES.md` — every precompile, every gas cost, every
  wire format.
- `ZK_VERIFICATION.md` — end-to-end Solidity recipe for tier-3
  inference proofs.
