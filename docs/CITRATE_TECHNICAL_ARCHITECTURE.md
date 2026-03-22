# Citrate Technical Architecture Reference

**Version:** 0.3.0 | **Date:** March 2026 | **Audience:** Core engineers, protocol developers, SREs, auditors

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Consensus: GhostDAG Protocol](#2-consensus-ghostdag-protocol)
3. [Execution Engine: LVM (REVM)](#3-execution-engine-lvm-revm)
4. [Precompile System](#4-precompile-system)
5. [Transaction Pipeline](#5-transaction-pipeline)
6. [Sequencer & Mempool](#6-sequencer--mempool)
7. [Storage Layer](#7-storage-layer)
8. [Network & P2P](#8-network--p2p)
9. [API Layer](#9-api-layer)
10. [MCP: Model Context Protocol](#10-mcp-model-context-protocol)
11. [Economics & Tokenomics](#11-economics--tokenomics)
12. [Smart Contracts](#12-smart-contracts)
13. [Node Binary & Block Producer](#13-node-binary--block-producer)
14. [GUI Architecture (Tauri)](#14-gui-architecture-tauri)
15. [SDKs](#15-sdks)
16. [CLI & Wallet](#16-cli--wallet)
17. [Cryptography](#17-cryptography)
18. [Observability](#18-observability)
19. [CI/CD & Infrastructure](#19-cicd--infrastructure)
20. [Security Considerations](#20-security-considerations)
21. [Known Limitations & Technical Debt](#21-known-limitations--technical-debt)

---

## 1. System Overview

### Workspace Structure

Citrate is a Rust workspace (`citrate_v0.01.1/`) with 15 core crates, 4 application crates, and polyglot client tooling:

```
Cargo.toml (workspace root)
├── core/
│   ├── consensus/       citrate-consensus
│   ├── execution/       citrate-execution
│   ├── storage/         citrate-storage
│   ├── sequencer/       citrate-sequencer
│   ├── api/             citrate-api
│   ├── network/         citrate-network
│   ├── mcp/             citrate-mcp
│   ├── economics/       citrate-economics
│   ├── marketplace/     citrate-marketplace
│   ├── bridge/          citrate-bridge
│   ├── learning/        citrate-learning
│   ├── genesis/         citrate-genesis
│   └── primitives/      citrate-primitives
├── node/                citrate-node (main binary)
├── wallet/              citrate-wallet
├── cli/                 citrate-cli
├── faucet/              citrate-faucet
├── gui/citrate_gui_v2/  Tauri desktop app
├── contracts/           Foundry/Solidity
├── sdk/javascript/      @citrate/sdk (npm)
├── sdks/
│   ├── javascript/      citrate-js (alternative)
│   └── python/          citrate-sdk (PyPI)
└── developer-tools/     Studio, Dashboard, VS Code ext
```

### Dependency Graph (Crate-Level)

```
citrate-node
  ├── citrate-api
  │   ├── citrate-consensus
  │   ├── citrate-execution
  │   │   └── citrate-consensus
  │   ├── citrate-storage
  │   ├── citrate-sequencer
  │   │   └── citrate-consensus
  │   ├── citrate-network
  │   │   └── citrate-consensus
  │   ├── citrate-mcp
  │   │   ├── citrate-execution
  │   │   └── citrate-storage
  │   └── citrate-economics
  ├── citrate-storage (direct)
  ├── citrate-sequencer (direct)
  └── citrate-network (direct)
```

### Key External Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `revm` | 10 | EVM execution (Foundry/Anvil's engine) |
| `revm-primitives` | 5 | EVM primitive types |
| `tokio` | 1.40 | Async runtime |
| `rocksdb` | 0.22 | Persistent key-value storage |
| `ed25519-dalek` | 2.1 | Native signature scheme |
| `k256` | 0.13 | ECDSA (secp256k1) for EVM compat |
| `secp256k1` | 0.27 | ECDSA recovery (API layer) |
| `jsonrpc-core/http/ws` | 18.0 | JSON-RPC server |
| `axum` | 0.7 | REST API framework |
| `sha3` | 0.10 | Keccak256 hashing |
| `ark-groth16` | 0.4 | ZK proof system (experimental) |
| `ark-bn254` | 0.4 | BN254 curve for EVM precompiles |
| `ndarray` | 0.15 | Tensor operations |
| `prometheus` | 0.13 | Metrics export |
| `libp2p` | 0.54 | P2P networking |
| `sled` | 0.34 | Embedded DB (secondary) |

---

## 2. Consensus: GhostDAG Protocol

### 2.1 Algorithm Overview

GhostDAG (Greedy Heaviest-Observed Sub-Tree on a DAG) extends the GHOST protocol to DAG structures. Instead of discarding concurrent blocks (as in Bitcoin/Ethereum), GhostDAG includes them all and classifies them as either **blue** (honest) or **red** (potentially adversarial).

### 2.2 Parameters

```rust
pub struct GhostDagParams {
    pub k: u32,                   // 18   — k-cluster safety parameter
    pub max_parents: usize,       // 10   — max merge parents per block
    pub max_blue_score_diff: u64, // 1000 — max blue score differential
    pub pruning_window: u64,      // 100,000 — blocks before pruning
    pub finality_depth: u64,      // 100  — blocks deep for finality
}
```

**k=18:** Controls the maximum allowed "width" of the DAG. A block is blue if its anticone (blocks neither in its past nor future) contains at most k blue blocks. Higher k = more parallelism but slower finality.

### 2.3 Core Data Structures

```rust
pub struct BlockHeader {
    pub version: u32,
    pub block_hash: Hash,             // SHA3-256 of all fields
    pub selected_parent_hash: Hash,   // Primary parent (highest blue score)
    pub merge_parent_hashes: Vec<Hash>, // Additional parents (up to max_parents)
    pub timestamp: u64,
    pub height: u64,
    pub blue_score: u64,              // Cumulative blue ancestry
    pub blue_work: u128,              // Cumulative difficulty
    pub pruning_point: Hash,
    pub proposer_pubkey: PublicKey,
    pub vrf_reveal: VrfProof,
    pub base_fee_per_gas: u64,        // EIP-1559
    pub gas_used: u64,
    pub gas_limit: u64,               // Default: 30M
}

pub struct Block {
    pub header: BlockHeader,
    pub state_root: Hash,
    pub tx_root: Hash,
    pub receipt_root: Hash,
    pub artifact_root: Hash,
    pub ghostdag_params: GhostDagParams,
    pub transactions: Vec<Transaction>,
    pub signature: Signature,
    pub embedded_models: Vec<EmbeddedModel>,  // Genesis only
    pub required_pins: Vec<RequiredModel>,    // Genesis only
}
```

### 2.4 Blue Set Calculation

```
Algorithm: calculate_blue_set(block B)
  Input: Block B with selected_parent S and merge_parents M[]
  Output: BlueSet (set of hashes + score)

  1. If B is genesis:
       return BlueSet { blocks: {B}, score: 1 }

  2. result = blue_set(S)          // Start with selected parent's blue set

  3. For each merge_parent P in M:
       anticone_count = |anticone(P) ∩ result|
       if anticone_count <= k:
           result = result ∪ blue_set(P)   // P is blue, merge its set
       else:
           // P is red, skip

  4. result.add(B)                 // Add self
  5. result.score = |result|
  6. Cache result for future queries
  7. Return result
```

### 2.5 Tip Selection

```rust
pub enum SelectionStrategy {
    HighestBlueScore,                // Simple: max(blue_score)
    HighestBlueScoreWithTieBreak,    // Deterministic: ties broken by hash
    WeightedRandom,                  // Random weighted by blue scores
}

// select_parents(max_parents) returns top-N tips by blue score
```

### 2.6 Total Ordering

Converts the DAG into a linear sequence for transaction execution:

```
Algorithm: total_order(genesis, tip)
  1. Walk selected-parent chain from genesis to tip
  2. For each chain block C (oldest first):
     a. Yield C
     b. For each block M in mergeset(C):    // Blocks only reachable via merge parents
        Yield M (sorted by blue_score DESC, hash ASC)
  3. Result: deterministic linear order for all nodes
```

### 2.7 Finality

```rust
pub struct FinalityConfig {
    pub confirmation_depth: u64,     // 100 blocks (10 for tests)
    pub emit_events: bool,
    pub max_finalize_batch: usize,   // 1000
}

pub struct FinalityEvent {
    pub block_hash: Hash,
    pub height: u64,
    pub finalized_tip: Hash,
    pub total_finalized: u64,
}
```

A block is finalized when it has at least `confirmation_depth` descendants on the selected-parent chain. The `FinalityTracker` subscribes to new blocks and emits `FinalityEvent` via tokio broadcast channel.

### 2.8 Chain Selection & Reorgs

```rust
pub struct ChainState {
    pub tip: Hash,
    pub height: u64,
    pub blue_score: u64,
    pub blue_work: u128,
    pub selected_chain: Vec<Hash>,
}

pub struct ReorgEvent {
    pub old_tip: Hash,
    pub new_tip: Hash,
    pub depth: u64,
    pub reason: String,
}
```

Reorgs are bounded by finality depth. The `ChainSelector` compares blue_work (cumulative difficulty) to determine the canonical chain.

### 2.9 VRF Proposer Selection

```rust
pub struct VrfProposerSelector {
    validators: HashMap<PublicKey, Validator>,
    total_stake: u128,
    difficulty_adjustment: f64,
}

// VRF output binding (WP-H.6 security fix):
// output = SHA3(proof || SHA3(pubkey || prev_vrf || slot))
// Prevents: key substitution, slot replay, chain replay
```

### 2.10 DAG Store

```rust
pub struct DagStore {
    blocks: HashMap<Hash, Block>,
    blocks_by_height: HashMap<u64, Vec<Hash>>,
    children: HashMap<Hash, Vec<Hash>>,
    tips: HashSet<Hash>,                    // Blocks with no children
    finalized: HashSet<Hash>,
    pruning_point: Hash,
}
```

All fields are `Arc<RwLock<_>>` for concurrent access.

---

## 3. Execution Engine: LVM (REVM)

### 3.1 Architecture

The Lattice Virtual Machine (LVM) wraps REVM v10 (the EVM implementation used by Foundry and Anvil) with custom extensions for AI operations.

```rust
pub struct Executor {
    state_db: Arc<StateDB>,
    state_store: Option<Arc<dyn StateStoreTrait>>,
    gas_schedule: GasSchedule,
    inference_service: Option<Arc<dyn InferenceService>>,
    artifact_service: Option<Arc<dyn ArtifactService>>,
    ai_storage: Option<Arc<dyn AIModelStorage>>,
    model_registry: Option<Arc<dyn ModelRegistryAdapter>>,
    precompile_executor: Option<Arc<RwLock<PrecompileExecutor>>>,
    chain_id: u64,                  // Default: 1337
}
```

### 3.2 StateDB

```rust
pub struct StateDB {
    accounts: DashMap<Address, AccountState>,
    code: DashMap<Hash, Vec<u8>>,
    storage: DashMap<(Address, H256), H256>,
}

pub struct AccountState {
    pub nonce: u64,
    pub balance: U256,
    pub code_hash: Hash,
    pub storage_root: Hash,
}
```

The StateDB is in-memory with persistence to RocksDB via the StateStore. State transitions are applied atomically after block execution.

### 3.3 REVM Integration

```rust
// REVM features enabled:
revm = { version = "10", features = ["std", "serde"] }

// Required execution flags:
optional_balance_check   // Allow tx even if balance insufficient (for gas estimation)
optional_eip3607        // Allow tx from contract addresses
optional_no_base_fee    // Skip base fee validation in devnet
```

### 3.4 Parallel Execution (Experimental)

```rust
pub struct ParallelExecutor {
    executor: Arc<Executor>,
    conflict_graph: Arc<RwLock<ConflictGraph>>,
}
// Analyzes transaction access sets for conflicts
// Executes independent transactions in parallel
// Falls back to sequential on conflict
```

---

## 4. Precompile System

### 4.1 Standard Ethereum Precompiles (0x01-0x09)

| Address | Name | Gas Formula | Implementation |
|---------|------|-------------|----------------|
| `0x01` | ECRECOVER | 3,000 flat | `secp256k1` crate recovery |
| `0x02` | SHA256 | `60 + ceil(len/32) * 12` | `sha2` crate |
| `0x03` | RIPEMD160 | `600 + ceil(len/32) * 120` | `ripemd` crate |
| `0x04` | IDENTITY | `15 + ceil(len/32) * 3` | Passthrough |
| `0x05` | MODEXP | `(mult_complexity * max(iter, 1)) / 3` | `num-bigint` crate |
| `0x06` | ECADD | 150 flat | `ark-bn254` G1 addition |
| `0x07` | ECMUL | 6,000 flat | `ark-bn254` scalar mult |
| `0x08` | ECPAIRING | `45,000 + 34,000 * k` | `ark-bn254` pairing |
| `0x09` | BLAKE2F | `rounds` (input param) | `blake2` compression |

### 4.2 AI Precompiles (0x0100-0x0106)

| Address | Name | Gas Cost | Input Format | Output Format |
|---------|------|----------|-------------|---------------|
| `0x0100` | MODEL_DEPLOY | `1000 + 100/KB` | ABI-encoded (model_id, owner, metadata, weights) | ABI-encoded (model_id, status) |
| `0x0101` | MODEL_INFERENCE | `5000 + 10/input + 10/output` | ABI-encoded (model_id, input_tensor) | ABI-encoded (output_tensor, gas_used) |
| `0x0102` | BATCH_INFERENCE | `(inference_cost * count) * 0.8` | ABI-encoded (model_id, inputs[]) | ABI-encoded (outputs[]) |
| `0x0103` | MODEL_METADATA | 500 flat | ABI-encoded (model_id) | ABI-encoded (metadata JSON) |
| `0x0104` | PROOF_VERIFY | 3,000 flat | ABI-encoded (proof, public_inputs) | ABI-encoded (bool valid) |
| `0x0105` | MODEL_BENCHMARK | 20,000 flat | ABI-encoded (model_id, test_input) | ABI-encoded (latency, throughput) |
| `0x0106` | MODEL_ENCRYPTION | 1,000+ flat | ABI-encoded (model_id, operation) | ABI-encoded (result) |

### 4.3 Metal Runtime (macOS GPU)

```rust
pub struct MetalRuntime {
    device: Arc<metal::Device>,
    command_queue: Arc<metal::CommandQueue>,
}

pub struct MetalModel {
    model_id: H256,
    format: MetalModelFormat,  // GGUF, CoreML, ONNX, SafeTensors
    weights: Vec<u8>,
    config: ModelConfig,
}
```

The inference precompile dispatches to `MetalRuntime` on macOS for GPU-accelerated inference using Apple's Metal framework.

---

## 5. Transaction Pipeline

### 5.1 Transaction Structure

```rust
pub struct Transaction {
    pub hash: Hash,
    pub nonce: u64,
    pub from: PublicKey,              // 32-byte sender pubkey
    pub to: Option<PublicKey>,        // None = contract creation
    pub value: u128,
    pub gas_limit: u64,
    pub gas_price: u64,
    pub data: Vec<u8>,
    pub signature: Signature,         // 64-byte ed25519 sig
    pub tx_type: Option<TransactionType>,
    pub eth_tx_type: u8,              // 0=legacy, 1=EIP-2930, 2=EIP-1559
    pub max_fee_per_gas: Option<u64>,
    pub max_priority_fee_per_gas: Option<u64>,
    pub access_list: Option<Vec<(Vec<u8>, Vec<Vec<u8>>)>>,
    pub chain_id: Option<u64>,
    pub ecdsa_verified: bool,         // C-01 security flag
}

pub enum TransactionType {
    Standard = 0,       // Priority weight: 1
    ModelDeploy = 1,    // Priority weight: 100
    ModelUpdate = 2,    // Priority weight: 80
    InferenceRequest = 3, // Priority weight: 60
    TrainingJob = 4,    // Priority weight: 90
    LoraAdapter = 5,    // Priority weight: 70
}
```

### 5.2 End-to-End Flow (CLI Wallet Path)

```
wallet/src/transaction.rs     →  Sign with ed25519
    ↓
wallet/src/rpc_client.rs      →  eth_sendRawTransaction (bincode)
    ↓
core/api/src/eth_tx_decoder.rs →  Decode: try RLP first, then bincode
    ↓                             Detect type byte: 0x02 (EIP-1559), 0x01 (EIP-2930), legacy
    ↓                             Recover sender from ECDSA signature (if applicable)
    ↓                             Validate chain_id matches configured chain_id
    ↓
core/sequencer/src/mempool.rs  →  Validate: chain_id, nonce, gas_price, signature, sender limit
    ↓                             Classify: TxClass (System/ModelUpdate/Compute/etc.)
    ↓                             Insert into priority queue
    ↓
node/src/producer.rs           →  Select top-N transactions by priority
    ↓                             Execute via Executor (REVM)
    ↓                             Calculate state root, tx root, receipt root
    ↓                             Build block, sign, broadcast
    ↓
core/storage/                  →  Store block, transactions, receipts to RocksDB
```

### 5.3 End-to-End Flow (GUI Embedded Node Path)

```
gui/../wallet_manager.rs       →  Create & sign transaction
    ↓
gui/../lib.rs:195              →  Add directly to embedded mempool (no RPC hop)
    ↓
gui/../block_producer.rs:140   →  Execute transactions via Executor
    ↓
gui/../block_producer.rs:374   →  Commit state changes (CRITICAL: recent fix)
    ↓
gui/../block_producer.rs:204   →  Store receipts for RPC visibility
```

### 5.4 Transaction Decoding Order (CRITICAL)

```rust
// eth_tx_decoder.rs — decode order matters!
1. Check first byte for type prefix:
   0x02 → EIP-1559: RLP decode [chain_id, nonce, max_priority_fee, max_fee, gas, to, value, data, access_list, yParity, r, s]
   0x01 → EIP-2930: RLP decode [chain_id, nonce, gas_price, gas, to, value, data, access_list, v, r, s]

2. Try legacy RLP: [nonce, gas_price, gas, to, value, data, v, r, s]

3. Fallback: bincode::deserialize (native Citrate format)

// IMPORTANT: RLP MUST be tried before bincode.
// Reason: Valid RLP bytes can pass bincode::deserialize, producing a mangled transaction
// that bypasses chain_id validation.
```

### 5.5 Address Derivation

```rust
pub fn from_public_key(pubkey: &PublicKey) -> Address {
    let bytes = pubkey.0;  // [u8; 32]

    // Check if this is an embedded EVM address (20 bytes + 12 zero bytes)
    let is_evm = bytes[20..].iter().all(|&b| b == 0)
              && !bytes[..20].iter().all(|&b| b == 0);

    if is_evm {
        Address(bytes[..20])        // Use first 20 bytes directly
    } else {
        let hash = Keccak256(bytes); // Hash full 32 bytes
        Address(hash[12..32])       // Take last 20 bytes
    }
}
```

This dual-path approach allows both:
- **MetaMask/EVM wallets**: Send 20-byte address padded to 32 bytes → recovered directly
- **Native ed25519 wallets**: Full 32-byte pubkey → Keccak hashed to 20-byte address

---

## 6. Sequencer & Mempool

### 6.1 Mempool Configuration

```rust
pub struct MempoolConfig {
    pub max_size: usize,               // 10,000 transactions
    pub max_per_sender: usize,         // 100 per sender
    pub min_gas_price: u64,            // 1 gwei
    pub tx_expiry_secs: u64,           // 3,600 (1 hour)
    pub allow_replacement: bool,       // true (10% gas bump)
    pub replacement_factor: u64,       // 110 (1.1x required)
    pub require_valid_signature: bool, // true (false in devnet)
    pub chain_id: u64,                 // 1337
}
```

### 6.2 Priority System

```rust
pub enum TxClass {
    System,        // 1000x — governance, emergency
    ModelUpdate,   // 100x  — model weight updates
    Compute,       // 80x   — AI compute operations
    Training,      // 50x   — training jobs
    Inference,     // 20x   — inference requests
    Storage,       // 10x   — storage operations
    Standard,      // 1x    — plain transfers
}

// Effective priority = gas_price * class_multiplier
// If ai_priority > 0, use ai_priority directly
// Ties broken by timestamp (older = higher priority)
```

### 6.3 Block Builder

```rust
pub struct BlockBuilderConfig {
    pub max_block_size: usize,        // 1 MB
    pub max_gas_per_block: u64,       // 30,000,000
    pub min_transactions: usize,      // 1
    pub max_transactions: usize,      // 5,000
    pub block_time_target: u64,       // 2 seconds
    pub enable_bundling: bool,        // true
    pub bundle_size: usize,           // 10
}
```

Block building requires an executor (no empty execution). All transactions are executed, receipts computed, and state roots calculated before block finalization.

### 6.4 Transaction Validation

```rust
pub struct ValidationRules {
    pub min_gas_price: u64,           // 1 gwei
    pub max_gas_limit: u64,           // 10,000,000
    pub max_data_size: usize,         // 128 KB
    pub tx_expiry_secs: u64,          // 3,600
    pub verify_signatures: bool,
    pub check_balance: bool,
    pub check_nonce: bool,
    pub rate_limit: u32,              // 100 txs/min per sender
}
```

---

## 7. Storage Layer

### 7.1 Architecture

```
┌─────────────────────────────────────┐
│          StorageManager             │
├──────────┬──────────┬───────────────┤
│ BlockStore│ TxStore  │  StateStore   │
│   (CF)   │   (CF)   │    (CF)       │
├──────────┴──────────┴───────────────┤
│              RocksDB                │
│  Write Buffer: 128MB               │
│  Block Size: 64MB                  │
│  Compression: LZ4                  │
│  Parallelism: num_cpus             │
├─────────────────────────────────────┤
│     LRU Cache (block + state)      │
├─────────────────────────────────────┤
│     Optional: Encrypted Storage    │
│     (AES-256-GCM + Argon2)         │
└─────────────────────────────────────┘
```

### 7.2 Column Families

| Column Family | Key | Value | Purpose |
|--------------|-----|-------|---------|
| `CF_BLOCKS` | block_hash | Block (bincode) | Full block storage |
| `CF_HEADERS` | block_hash | BlockHeader (bincode) | Header-only queries |
| `CF_METADATA` | height (u64 BE) | block_hash | Height-to-hash index |
| `CF_DAG_RELATIONS` | parent_hash | Vec<child_hash> | Parent-child graph |
| `CF_BLUE_SET` | blue_score (u64 BE) | block_hash | Blue score index |
| `CF_ACCOUNTS` | address (20 bytes) | AccountState (bincode) | Account state |
| `CF_CODE` | code_hash | bytecode | Contract code |
| `CF_STORAGE` | address + key | value (32 bytes) | Contract storage |
| `CF_TRANSACTIONS` | tx_hash | Transaction (bincode) | Transaction lookup |
| `CF_RECEIPTS` | tx_hash | Receipt (bincode) | Receipt lookup |

### 7.3 Pruning

```rust
pub struct PruningConfig {
    pub keep_blocks: u64,     // 100,000 blocks retained
    pub keep_states: u64,     // 10,000 state snapshots
    pub interval: Duration,   // 1 hour
    pub batch_size: usize,    // 1,000 per batch
    pub auto_prune: bool,
}
```

Background task runs every `interval`, deleting blocks and states older than retention window.

### 7.4 IPFS Integration

```rust
pub struct IPFSService {
    api_endpoint: String,      // Default: http://localhost:5001
    daemon: Option<DaemonHandle>,
}

// Operations:
// add(data) → CID
// pin(cid) → ()
// cat(cid) → bytes
// stat(cid) → size, type
```

Model weights and large artifacts are stored on IPFS. The node probes for IPFS availability on startup (non-blocking) and re-probes periodically.

### 7.5 Encryption (Optional)

```rust
pub struct DatabaseEncryptionConfig {
    algorithm: "AES-256-GCM",
    key_derivation: "Argon2id",
    node_id: String,
    // Quantum-safe ready (post-quantum KDF available)
}
```

---

## 8. Network & P2P

### 8.1 Protocol Stack

```
Application:  Block/Transaction/Inference messages
Transport:    TCP + QUIC (via quinn)
Security:     Noise protocol encryption
Discovery:    Kademlia DHT + static bootstrap nodes
Identity:     PeerId derived from ed25519 keypair
Library:      libp2p 0.54
```

### 8.2 Message Types

| Type | Direction | Payload |
|------|-----------|---------|
| `NewBlock` | Broadcast | Full block (header + txs) |
| `NewTransaction` | Broadcast | Raw transaction |
| `GetBlocks` | Request/Response | Hash range → blocks |
| `GetHeaders` | Request/Response | Hash range → headers |
| `InferenceRequest` | P2P (targeted) | Model ID + input |
| `InferenceResult` | P2P (targeted) | Output + proof |
| `PeerStatus` | Periodic | Chain tip, height, version |

### 8.3 Peer Management

```rust
pub struct PeerInfo {
    pub id: PeerId,
    pub addr: SocketAddr,
    pub reputation: i64,      // Score-based reputation
    pub last_seen: u64,
    pub chain_tip: Option<Hash>,
    pub version: ProtocolVersion,
}
```

Maximum peers: 50. Peers are scored by responsiveness and chain tip accuracy.

### 8.4 Block Propagation

1. Producer creates block
2. Validate: signatures, DAG consistency, parent existence
3. Store locally
4. Broadcast to all connected peers (exclude sender)
5. Peers validate and re-broadcast

### 8.5 Transaction Gossip

```rust
pub struct TxGossipConfig {
    pub max_peers_to_forward: usize,   // Fan-out limit
    pub tx_propagation_delay_ms: u64,  // Rate limiting
    pub batch_size: usize,             // Batch multiple txs
}
```

---

## 9. API Layer

### 9.1 Server Architecture

```rust
pub struct RpcServer {
    config: RpcConfig,
    storage: Arc<StorageManager>,
    mempool: Arc<Mempool>,
    peer_manager: Arc<PeerManager>,
    executor: Arc<Executor>,
    chain_id: u64,
}

// Protocols:
// HTTP JSON-RPC  → port 8545 (jsonrpc-http-server)
// WebSocket      → port 8546 (jsonrpc-ws-server)
// REST (MCP)     → port 3000 (axum)
```

### 9.2 Standard Ethereum RPC Methods

**Chain:**
`web3_clientVersion`, `eth_chainId`, `net_version`, `eth_blockNumber`, `eth_gasPrice`, `eth_syncing`

**Account:**
`eth_getBalance`, `eth_getTransactionCount`, `eth_getCode`, `eth_getStorageAt`, `eth_accounts`

**Transaction:**
`eth_sendRawTransaction`, `eth_sendTransaction`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_estimateGas`, `eth_call`

**Block:**
`eth_getBlockByHash`, `eth_getBlockByNumber`, `eth_getBlockTransactionCountByHash`

**Filter:**
`eth_newFilter`, `eth_getFilterLogs`, `eth_uninstallFilter`

### 9.3 Citrate Custom RPC Methods

| Method | Params | Returns |
|--------|--------|---------|
| `citrate_deployModel` | `{model_id, owner, name, version, framework, metadata, model_data?}` | `{id, owner, name, cid}` |
| `citrate_getModel` | `model_id: string` | Model metadata object |
| `citrate_listModels` | `[owner?: string, limit?: number]` (positional) | `{models: [{id, owner, name}]}` |
| `citrate_updateModel` | `{model_id, name?, version?, metadata?}` | `{success: bool}` |
| `citrate_runInference` | `{model_id, input, max_gas?}` | `{output, gas_used, provider}` |
| `citrate_getDagTips` | none | `string[]` (block hashes) |
| `citrate_getBlueSet` | `block_hash: string` | `string[]` (blue block hashes) |
| `citrate_getDagStats` | none | `{tips, height, blue_score, ...}` |
| `citrate_getMempoolSnapshot` | none | Mempool transaction list |
| `citrate_pinArtifact` | `{cid, replicas?}` | `{status, message?}` |
| `citrate_getArtifactStatus` | `cid: string` | `[{provider, status}]` |
| `citrate_listModelArtifacts` | `model_id: string` | `string[]` (CIDs) |
| `citrate_getProof` | `execution_id: string` | Proof object |
| `citrate_verifyProof` | `{proof, expected_output?}` | `bool` |
| `citrate_emergencyPause` | none | Pause block production |

### 9.4 Pending Nonce Support

```rust
// eth_getTransactionCount with "pending" tag
fn get_nonce(address: &Address, tag: "pending") -> u64 {
    let mempool_nonce = mempool.scan_sender_max_nonce(address);
    let base_nonce = state_db.get_nonce(address);
    max(mempool_nonce + 1, base_nonce)
}
```

### 9.5 Rate Limiting

```rust
// Per-method limits (DashMap-based):
eth_sendRawTransaction:  10 req/sec
eth_call, estimateGas:  100 req/sec
citrate_runInference:     5 req/sec
```

### 9.6 Error Codes

| Code | Meaning |
|------|---------|
| -32600 | Invalid Request (malformed JSON) |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32000 | Server error (gas too low, nonce mismatch, etc.) |

---

## 10. MCP: Model Context Protocol

### 10.1 Service Architecture

```rust
pub struct MCPService {
    pub model_registry: Arc<ModelRegistry>,
    pub provider_registry: Arc<ProviderRegistry>,
    pub executor: Arc<ModelExecutor>,
    pub verifier: Arc<ExecutionVerifier>,
}

pub struct ModelRegistry {
    storage: Arc<StorageManager>,
    models: HashMap<ModelId, ModelRecord>,
    providers: HashMap<ModelId, Vec<Address>>,
    requests: HashMap<RequestId, ExecutionRequest>,
}

pub struct ModelRecord {
    pub metadata: ModelMetadata,
    pub providers: Vec<Address>,
    pub created_at: u64,
    pub total_executions: u64,
    pub average_latency: u64,
    pub success_rate: f64,
    pub weight_cid: Option<String>,
}
```

### 10.2 Model Metadata

```rust
pub struct ModelMetadata {
    pub id: ModelId,                    // 32-byte hash
    pub owner: Address,
    pub name: String,
    pub version: String,
    pub hash: Hash,                     // Content hash of weights
    pub size: u64,
    pub architecture: Vec<u8>,
    pub compute_requirements: ComputeRequirements,
    pub pricing: PricingModel,
}

pub struct ComputeRequirements {
    pub min_memory: u64,
    pub min_compute: u64,
    pub gpu_required: bool,
    pub supported_hardware: Vec<HardwareType>, // CPU, GPU("A100"), TPU, Custom
}
```

### 10.3 Model ID Generation

```rust
// Model ID = SHA3(model_bytes + name + version)
// This ensures different versions of the same model get different IDs
// while the same model with same name/version always gets the same ID
```

### 10.4 REST API (OpenAI/Anthropic Compatible)

```
POST /v1/chat/completions       OpenAI-compatible chat
POST /v1/embeddings             Embedding generation
POST /v1/messages               Anthropic-compatible chat
GET  /v1/models                 List available models
POST /v1/jobs                   Submit async job
GET  /v1/jobs/:id               Check job status
```

### 10.5 ZK Verification

```rust
#[cfg(feature = "zkp_production")]
// Production: Groth16 verification on BLS12-381 curve
// Precompile at 0x0104 handles on-chain verification

#[cfg(not(feature = "zkp_production"))]
// Development: Placeholder circuits for testing
```

---

## 11. Economics & Tokenomics

### 11.1 Token Constants

```rust
pub const TOKEN_SYMBOL: &str = "SALT";
pub const TOKEN_NAME: &str = "Citrate";
pub const TOTAL_SUPPLY: u128 = 1_000_000_000;  // 1 billion
pub const DECIMALS: u32 = 18;
```

### 11.2 Reward Structure

```rust
pub struct RewardConfig {
    pub block_reward: U256,
    pub staking_yield: u64,      // Percentage
    pub slash_percentage: u64,   // Slashing for misbehavior
}
```

### 11.3 Dynamic Fee Pricing

```rust
pub struct DynamicPricingConfig {
    pub base_fee: U256,
    pub max_fee: U256,
    pub adjustment_factor: f64,
}
// Fee adjusts based on mempool utilization and network load
```

### 11.4 Model Marketplace Fee

On-chain `ModelMarketplace` contract charges **2.5%** on model access purchases.

---

## 12. Smart Contracts

### 12.1 Contract Suite

All contracts use Solidity ^0.8.24, compiled via Foundry with `via_ir` optimization (200 runs). OpenZeppelin `AccessControl` and `ReentrancyGuard` are used throughout.

#### ModelRegistry.sol — Core Model Registration

```solidity
// State: mapping(bytes32 => Model), mapping(address => bytes32[]) ownerModels
// Fee: REGISTRATION_FEE = 0.1 ether
// Precompiles: MODEL_PRECOMPILE = 0x1000, ARTIFACT_PRECOMPILE = 0x1002

registerModel(name, framework, version, ipfsCID, sizeBytes, inferencePrice, metadata) → bytes32
requestInference(modelHash, inputData) payable → bytes
updateModel(modelHash, newVersion, newIpfsCID)
setInferencePrice(modelHash, newPrice)
grantPermission(modelHash, user) / revokePermission(modelHash, user)
activateModel(modelHash) / deactivateModel(modelHash)
getModel(modelHash) / getModelsByOwner(owner) / getAllModelHashes()
withdrawFees()  // Admin only
```

#### ModelMarketplace.sol — Marketplace & Discovery

```solidity
// Fee: MARKETPLACE_FEE_BASIS_POINTS = 250 (2.5%)
// Price bounds: MIN_PRICE = 0.001 ether, MAX_PRICE = 1000 ether
// Featured listing fee: 1 ether

listModel(modelId, basePrice, discountPrice, minimumBulkSize, category, metadataURI)
purchaseAccess(modelId, quantity) payable  // Bulk discount support
updatePricing(modelId, newBasePrice, newDiscountPrice, newMinimumBulkSize)
featureModel(modelId) payable / unfeatureModel(modelId)
addReview(modelId, rating, comment)  // Verified: requires purchase history
getModelsByCategory(category) / getFeaturedModels() / getTopRatedModels(limit)
getMarketplaceStats() → (totalListings, totalSales, totalVolume)
```

#### InferenceRouter.sol — Load-Balanced Routing & Caching

```solidity
// Provider stake: minProviderStake = 100 ether
// Platform fee: 2.5% (adjustable, max 10%)
// Cache reward: 1% for cache hits
// Provider scoring: 40% price + 30% load + 30% success rate

registerProvider(endpoint, minPrice, supportedModels[]) payable
requestInference(modelHash, inputData, maxPrice) payable → uint256  // Cache-first
completeInference(requestId, outputData)  // Provider fills request
cancelRequest(requestId)  // Refund if pending
addStake() payable / withdrawStake(amount)
setCaching(modelHash, enabled)
```

#### ModelAccessControl.sol — Fine-Grained Permissions

```solidity
// Access levels: NONE(0), INFERENCE(1), FULL(2), ADMIN(3)
// Precompiles: MODEL_DEPLOY=0x0100, MODEL_INFERENCE=0x0101, MODEL_ENCRYPTION=0x0106

registerModel(modelId, ipfsCid, isEncrypted, accessPrice)
grantAccess(modelId, user, level, expiresAt, usageLimit)
revokeAccess(modelId, user)
requestAccess(modelId, level, reason) payable → uint256
approveAccessRequest(requestId, expiresAt, usageLimit)
executeInference(modelId, inputData) payable
executeEncryptedInference(modelId, encryptedInput, proofCommitment) payable
stakeForAccess(modelId) payable / unstake(modelId, amount)
```

#### LoRAFactory.sol — Fine-Tuning Factory

```solidity
// Training fee: 0.01 ether per epoch
// Merge fee: 0.05 ether
// Merge types: Linear(0), SVD(1), Task-Arithmetic(2)
// Precompile: LORA_PRECOMPILE = 0x1001

// Creates, trains, merges LoRA adapters with configurable:
// rank, alpha, dropout, epochs, batchSize, learningRate, datasetCID
```

#### Compute Marketplace Contracts (NEW — Sprint COMPUTE-1)

```solidity
// ComputeMarketplace.sol — Job listing, matching, escrow
createJob(modelId, inputCID, maxPrice, deadline) payable → uint256
acceptJob(jobId) → bool
completeJob(jobId, outputCID, proofHash)
cancelJob(jobId)

// ComputeVerifier.sol — Challenge-response verification
submitResult(jobId, outputHash, proof)
challengeResult(jobId) payable
resolveChallenge(jobId, evidence)

// ComputePool.sol — Pooled compute with worker management
createPool(name, minStake, maxWorkers)
joinPool(poolId) payable
leavePool(poolId)
submitWork(poolId, jobId, result)

// HeartbeatMonitor.sol — Provider liveness
registerProvider(endpoint, stake) payable
sendHeartbeat()
checkLiveness(provider) → bool
slashInactive(provider)  // Auto-slash after missed heartbeats

// DisputeResolution.sol — On-chain arbitration
openDispute(jobId, reason) payable
submitEvidence(disputeId, evidence)
resolveDispute(disputeId, ruling)
```

#### Learning Center Contracts (NEW — Sprint LEARN-1)

```solidity
// LearningPool.sol — Paraconsistent learning pools (Belnap lattice)
createPool(name, config) → uint256
contribute(poolId, data, belnapValue)  // T, F, Both, Neither
aggregate(poolId) → AggregationResult

// LearningCycleManager.sol — OODA-based learning cycles
startCycle(poolId) → uint256
observe(cycleId, data)
orient(cycleId, analysis)
decide(cycleId, decision)
act(cycleId, action)
completeCycle(cycleId)

// ClassroomRegistry.sol — Classroom management
createClassroom(name, curriculum, maxStudents)
enroll(classroomId) payable
assignMentor(classroomId, mentor)
graduate(classroomId, student)

// ContributionAccounting.sol — Contribution tracking
recordContribution(poolId, contributor, amount, quality)
claimRewards(poolId)
getContributions(poolId, contributor) → ContributionDetail[]

// NematocystSlashing.sol — Biologically-inspired slashing
reportViolation(validator, evidence)
slash(validator, amount, reason)
appeal(slashId) payable
```

#### Staking & Infrastructure Contracts

```solidity
// LiquidStakingPool.sol — Liquid staking with stSALT
stake() payable → uint256 stSALT
unstake(amount)
claimRewards()

// WrappedSALT.sol — ERC-20 wrapped SALT
wrap() payable
unwrap(amount)
```

#### Supporting Contracts

| Contract | Purpose |
|----------|---------|
| **IPFSIncentives** | Reward IPFS storage providers for hosting model weights |
| **ColorCirclesNFT** | ERC721 NFTs for model ownership and achievement badges |
| **AgentDecisionRegistry** | On-chain audit trail for agent decisions |
| **SpecRegistry** | Specification registration and versioning |
| **X402Paywall** / **X402Facilitator** | HTTP 402 paywall for model access |
| **Counter** | Simple demo/test contract |

### 12.2 Foundry Configuration

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
via_ir = true
optimizer_runs = 200
evm_version = "cancun"
gas_reports = ["*"]

[rpc_endpoints]
lattice = "http://localhost:8545"

[profile.citrate]
via_ir = true
optimizer_runs = 10000
```

### 12.3 Deployment

```bash
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key $PRIVATE_KEY
```

### 12.4 Precompile Address Map (Contracts ↔ Node)

| Solidity Constant | Address | Node-Side Handler |
|-------------------|---------|-------------------|
| `MODEL_PRECOMPILE` | `0x1000` | Model registration |
| `LORA_PRECOMPILE` | `0x1001` | LoRA operations |
| `ARTIFACT_PRECOMPILE` | `0x1002` | IPFS artifact mgmt |
| `MODEL_DEPLOY` | `0x0100` | Model deploy precompile |
| `MODEL_INFERENCE` | `0x0101` | Inference execution |
| `MODEL_ENCRYPTION` | `0x0106` | Encryption ops |

---

## 13. Node Binary & Block Producer

### 13.1 Startup Sequence

```
1. Parse CLI args / config TOML
2. Initialize RocksDB storage
3. Create or load genesis block
   - Genesis timestamp: 2026-01-01T00:00:00Z (1767225600)
   - Pre-fund accounts
   - Optional: embed BGE-M3 model (feature-gated)
4. Initialize GhostDAG engine
5. Initialize EVM executor
6. Initialize mempool
7. Start P2P network
8. Start RPC server (HTTP + WS)
9. Start block producer loop
10. Probe IPFS (non-blocking)
11. Start metrics server (/metrics)
```

### 13.2 Block Production Loop

```rust
loop {
    sleep(block_time_target);  // 2 seconds

    // 1. Select tip
    let tip = ghostdag.select_tip().await;

    // 2. Select parents (up to max_parents)
    let parents = tip_selector.select_parents(max_parents);

    // 3. Pull transactions from mempool
    let txs = mempool.get_pending_transactions(max_transactions);

    // 4. Execute transactions
    let (receipts, state_root) = executor.execute_batch(txs);

    // 5. Build block
    let block = Block {
        selected_parent: parents[0],
        merge_parents: parents[1..],
        transactions: txs,
        state_root,
        // ... compute hashes
    };

    // 6. Calculate blue score
    let blue_set = ghostdag.calculate_blue_set(&block);
    block.header.blue_score = blue_set.score;

    // 7. Sign block
    block.signature = ed25519_sign(block.compute_hash());

    // 8. Store
    dag_store.store_block(block);
    storage.put_block(&block);
    for (tx_hash, receipt) in receipts {
        storage.put_receipt(&tx_hash, &receipt);
    }

    // 9. Broadcast
    network.broadcast_block(&block);

    // 10. Distribute rewards
    reward_coinbase(block.header.proposer_pubkey, block_reward);
}
```

### 13.3 Genesis Block

```rust
// Canonical genesis timestamp
const GENESIS_TIMESTAMP: u64 = 1_767_225_600; // 2026-01-01T00:00:00Z

// Pre-funded accounts (devnet):
// 0x1111...1111  → 1 ETH worth of SALT
// 0xf39F...2266  → 10,000 ETH (Forge default)
// 0xfcad...377c  → 10,000 ETH
```

### 13.4 Key Generation

```bash
citrate keygen              # Default: secp256k1 (MetaMask-compatible)
citrate keygen --ed25519    # Native ed25519 keypair
```

---

## 14. GUI Architecture (Tauri)

### 14.1 Stack

```
Frontend:  React 19 + TypeScript 5.8 + Vite 5.4
Desktop:   Tauri v2 (Rust backend, WebView frontend)
Styling:   CSS custom properties + inline style objects (no Tailwind)
Icons:     lucide-react
Editor:    Monaco (@monaco-editor/react)
Terminal:  xterm.js (@xterm/xterm)
Graph:     react-force-graph-2d/3d
Charts:    recharts
Auth:      @privy-io/react-auth (optional social login)
```

### 14.2 IPC Command Flow

```
React Component
  → Service (walletService.ts, agentService.ts, etc.)
    → ipcInvoke<T>(command, args)  // Typed Tauri invoke
      → Tauri Command Handler (Rust)
        → AppState / AgentState
          → Core Subsystem (node, wallet, agent, etc.)
```

### 14.3 State Management

```
React Context Providers:
  ThemeProvider      → Dark/light theme, CSS variables
  WalletContext      → Accounts, balances, sessions
  ChatContext        → Agent messages, tool approvals
  EnvironmentContext → Network switching state machine
  OnboardingContext  → 12-step flow state

Backend State:
  AppState → WalletManager, NodeManager, NodeControl, ModelManager, DAGManager, IPFSManager
  AgentState → LLM sessions, tool registrations, conversation history
```

### 14.4 Embedded Node Details

The GUI embeds a full `citrate-node` equivalent:
- GhostDAG consensus engine
- EVM executor with all precompiles
- RocksDB storage
- Mempool + block builder
- JSON-RPC server
- P2P network (peer management)
- Block producer (2-second intervals)
- Reward distribution to wallet accounts

### 14.5 Agent System

```
LLM Providers: Local Qwen 2.5 7B (~4.7GB) | OpenAI | Anthropic
Architecture:  ReAct Loop (Reason + Action)
Tools:
  - blockchain: send_transaction, query_blocks
  - wallet: create_account, get_balance
  - contracts: compile, deploy, call
  - models: deploy_model, run_inference
  - file_ops: read, write, create, delete
  - terminal: execute_command
  - storage: get, set, delete
Security: High-risk tools require explicit user approval
```

---

## 15. SDKs

### 15.1 TypeScript SDK (`@citrate/sdk` v0.3.0)

```typescript
// Core classes:
class CitrateSDK {
    models: ModelRegistry;
    contracts: ContractManager;
    accounts: AccountManager;
    learning: LearningManager;     // NEW: Learning Center
    staking: StakingManager;       // NEW: Liquid staking
    classrooms: ClassroomManager;  // NEW: Classroom registry
    compute: ComputeManager;       // NEW: Compute marketplace

    deployModel(data, metadata): Promise<string>;
    runInference(modelId, input, opts?): Promise<InferenceResult>;
    getBlock(numberOrTag): Promise<BlockInfo>;
    getDagStats(): Promise<DagStats>;
    subscribeToBlocks(callback): () => void;
    waitForTransaction(hash, confirmations?): Promise<Receipt>;
    pinArtifact(cid, replicas?): Promise<ArtifactPinResult>;
}

class AccountManager {
    createAccount(): { address, privateKey };
    importAccount(privateKey): string;
    importFromMnemonic(mnemonic, path?): string;  // BIP-44
    getBalance(address?): Promise<bigint>;
    sendTransaction(tx): Promise<string>;
    signMessage(message): Promise<string>;
}

class ContractManager {
    deploy(bytecode, abi?, args?, value?): Promise<string>;
    call(address, abi, method, args?, value?): Promise<{ receipt, logs }>;
    read(address, abi, method, args?): Promise<any>;
    createInstance(address, abi): ContractInstance;
}
```

### 15.2 Python SDK (`citrate-sdk` v0.1.0)

```python
class CitrateClient:
    def deploy_model(self, model_path, config: ModelConfig) -> ModelDeployment
    def inference(self, model_id, input_data, encrypted=False) -> InferenceResult
    def get_model_info(self, model_id) -> ModelInfo
    def list_models(self, owner=None, limit=100) -> List[ModelInfo]
    def get_balance(self, address) -> int
    def get_nonce(self, address) -> int
```

### 15.3 Alternative JS SDK (`citrate-js` v0.1.3)

Additional features over official SDK:
- WebSocket streaming for inference
- React hooks (`useCitrateClient`, `useModelDeployment`, `useInference`)
- Shamir secret sharing (threshold key management)
- Model encryption (AES-256-GCM)

---

## 16. CLI & Wallet

### 16.1 CLI (`citrate-cli`)

```bash
citrate account create|list|balance|import|export
citrate model deploy|inference|list|info|update
citrate contract deploy|call|read|verify
citrate network status|block|transaction|gas-price|peers|dag-stats
citrate governance get-params|propose-change|vote
citrate advanced monitor-dag|peer-info|transaction-pool|debug-block
citrate wizard setup-node|deploy-model-interactive
citrate init [--force]
```

### 16.2 Wallet (`citrate-wallet`)

```rust
pub struct Wallet {
    config: WalletConfig,
    keystore: KeyStore,          // Argon2 + AES-256-GCM encrypted
    rpc_client: RpcClient,
    accounts: Vec<Account>,
}

pub struct WalletConfig {
    keystore_path: PathBuf,      // ~/.citrate/keystore.json
    rpc_url: String,             // http://localhost:8545
    chain_id: u64,               // 1337
    default_gas_price: u64,      // 1 gwei
    default_gas_limit: u64,      // 21,000
}
```

---

## 17. Cryptography

### 17.1 Signature Schemes

| Scheme | Usage | Library |
|--------|-------|---------|
| **ed25519** | Native Citrate transactions, block signing | `ed25519-dalek 2.1` |
| **ECDSA (secp256k1)** | EVM compatibility (MetaMask, ethers.js) | `k256 0.13`, `secp256k1 0.27` |

### 17.2 Hash Functions

| Function | Usage | Library |
|----------|-------|---------|
| **SHA3-256 (Keccak)** | Block hashes, address derivation, transaction hashes | `sha3 0.10` |
| **SHA-256** | Model content hashing, IPFS CID | `sha2 0.10` |
| **BLAKE2b** | Precompile (EIP-152) | `blake2 0.10` |
| **RIPEMD-160** | Precompile (Bitcoin address compat) | `ripemd 0.1` |

### 17.3 Encryption

| Purpose | Algorithm | Library |
|---------|-----------|---------|
| Keystore encryption | AES-256-GCM | `aes-gcm 0.10` |
| Key derivation | Argon2id | `argon2 0.5` |
| Model encryption | AES-256-GCM + HKDF-SHA256 | `aes-gcm` + `hmac` |
| Quantum-safe (experimental) | Post-quantum KDF | `argon2` |

### 17.4 VRF Security (WP-H.6 Fix)

```rust
// VRF output = SHA3(proof || SHA3(pubkey || prev_vrf || slot))
// Binds proof to: specific proposer, specific slot, specific chain state
// Prevents: key substitution attacks, slot replay, chain replay
```

### 17.5 ECDSA Verification Guard (C-01 Fix)

```rust
// Transaction.ecdsa_verified must be true for ECDSA-signed transactions
// Prevents bypass of signature verification when address "looks valid"
// The flag is only set by the cryptographic verification path
```

---

## 18. Observability

### 18.1 Structured Logging

```bash
LOG_FORMAT=json          # json, pretty, compact
RUST_LOG=info,citrate_api=debug
LOG_FILE=/var/log/citrate/node.log

# Trace ID format: {timestamp_hex}-{counter_hex}-{random_hex}
# Example: 18c3f2a-1-a3b4
```

### 18.2 Prometheus Metrics (Port 9090)

| Metric | Type | Description |
|--------|------|-------------|
| `citrate_node_uptime_seconds` | Gauge | Node uptime |
| `citrate_peer_count` | Gauge | Connected peers |
| `citrate_block_height` | Gauge | Current block height |
| `citrate_mempool_size` | Gauge | Pending transactions |
| `citrate_dag_tips_count` | Gauge | Current DAG tips |
| `citrate_rpc_requests_total` | Counter | RPC requests by method |
| `citrate_rpc_latency_seconds` | Histogram | RPC latency |
| `citrate_ai_requests_total` | Counter | AI inference requests |
| `citrate_ipfs_uploads_total` | Counter | IPFS uploads |

### 18.3 GUI Error System

```typescript
// Error categories with codes:
NETWORK_OFFLINE, NETWORK_TIMEOUT
RPC_UNAVAILABLE, TX_REJECTED
WALLET_LOCKED, INSUFFICIENT_FUNDS
CONTRACT_REVERTED, CONTRACT_NOT_FOUND
IPFS_UNAVAILABLE, IPFS_UPLOAD_FAILED
MODEL_NOT_FOUND, INFERENCE_FAILED
INVALID_INPUT, MISSING_REQUIRED
```

Toast notifications (auto-dismiss 8s) for transient errors, modal dialogs for critical.

---

## 19. CI/CD & Infrastructure

### 19.1 GitHub Actions Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push main/develop, PR | Rust tests, clippy, fmt, SDK JS tests |
| `test.yml` | Push, PR | Foundry contract build + test |
| `build-binaries.yml` | Push main, tags, manual | Cross-platform binary builds |
| `release.yml` | Tag push (v*) | Full release: binaries, installers, Docker, npm |
| `publish-sdks.yml` | Tag (sdk-v*), manual | npm + PyPI publishing |
| `comprehensive-ci.yml` | Manual | Full validation across all components |
| `security-gate.yml` | PR, push | Security checks |

### 19.2 Build Targets

| Target | OS | Arch | Artifact |
|--------|-----|------|----------|
| x86_64-unknown-linux-gnu | Linux | x86_64 | Binary, .deb, .AppImage |
| aarch64-unknown-linux-gnu | Linux | ARM64 | Binary |
| x86_64-apple-darwin | macOS | Intel | Binary, .dmg |
| aarch64-apple-darwin | macOS | Apple Silicon | Binary, .dmg |
| x86_64-pc-windows-msvc | Windows | x86_64 | Binary, .msi, .exe |

### 19.3 Docker Compose Profiles

| Profile | Services | Purpose |
|---------|----------|---------|
| `devnet` | citrate-node-devnet | Single local node |
| `testnet` | citrate-node-testnet | Public testnet |
| `explorer` | explorer-web, explorer-indexer, explorer-db | Block explorer |
| `monitoring` | prometheus, grafana | Metrics & dashboards |
| `cluster` | citrate-node-{1..5} | 5-node cluster |

### 19.4 Key Ports

| Port | Service | Protocol |
|------|---------|----------|
| 8545 | JSON-RPC (HTTP) | HTTP |
| 8546 | JSON-RPC (WS) | WebSocket |
| 3000 | MCP REST API / Explorer | HTTP |
| 3001 | Faucet / Grafana | HTTP |
| 3457 | GUI Dev Server | HTTP |
| 9090 | Prometheus | HTTP |
| 9100 | Node Metrics | HTTP |
| 30303 | P2P Network | TCP/QUIC |
| 5001 | IPFS API | HTTP |

---

## 20. Security Considerations

### 20.1 Resolved Issues

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| C-01 | Critical | ECDSA verification bypass via address shape | `ecdsa_verified` flag required |
| WP-H.6 | High | VRF key substitution attack | Bind proof to pubkey+slot+prev_vrf |
| M-01 | Medium | Missing chain_id validation | Mandatory chain_id in mempool |
| — | Medium | RLP/bincode decode order | RLP tried before bincode |
| — | Medium | GUI producer not executing txs | Fixed at line 374 |
| — | Low | `eth_call` nonce=0 causing REVM failure | Use sender's actual nonce |
| — | Low | 32-byte pubkey in RPC responses | Truncate to 20-byte address |

### 20.2 Security Architecture

- **Transport:** Noise protocol encryption for P2P, HTTPS for RPC
- **Key Storage:** OS keychain + Argon2id + AES-256-GCM
- **Input Validation:** All RPC inputs validated before processing
- **Replay Protection:** EIP-155 chain_id mandatory
- **Nonce Management:** Pending nonce support prevents double-spend
- **Rate Limiting:** Per-IP, per-method rate limits on RPC
- **Audit Logging:** All wallet/agent operations logged with correlation IDs
- **Session Management:** Configurable timeout, explicit unlock required

### 20.3 Feature Gates

```rust
#[cfg(feature = "zkp_production")]   // Production ZK circuits
#[cfg(feature = "embed-genesis-model")] // Embed AI model in genesis
#[cfg(feature = "dev-mode")]         // Dev assertions + mock data
#[cfg(feature = "coreml")]           // macOS CoreML support
#[cfg(feature = "metrics")]          // Prometheus metrics
#[cfg(feature = "ai_zkp")]           // AI ZK proof system
```

---

## 21. Known Limitations & Technical Debt

### 21.1 Consensus

- **Finality:** Depth-based only (no BFT committee checkpoints yet)
- **VRF:** Proposer selection implemented but not enforced in devnet
- **Pruning:** Background task, but not stress-tested at scale
- **Sync:** Iterative sync exists but peer discovery is limited

### 21.2 Execution

- **AI Opcodes:** EVM opcode range 0xF0-0xF4 collides with CREATE/CALL/RETURN — disabled
- **Parallel Execution:** Experimental, conflict detection needs hardening
- **ZK Proofs:** Placeholder circuits only; production Groth16 behind feature gate
- **Metal Runtime:** macOS-only GPU inference

### 21.3 Storage

- **State Trie:** In-memory StateDB with RocksDB persistence (not a full Merkle Patricia Trie)
- **State Roots:** Computed but not a true MPT root (hash of account states)
- **Pruning:** Tested at small scale; retention policy needs tuning

### 21.4 Network

- **Peer Discovery:** Static bootstrap nodes; Kademlia DHT not fully tested
- **Block Sync:** Basic iterative sync; no fast sync or snap sync
- **NAT Traversal:** Not implemented

### 21.5 GUI

- **TypeScript Errors:** Pre-existing TS errors in ModelManager.tsx (build uses `--skip-ts`)
- **GPU Compute:** UI skeleton only, backend incomplete
- **Model Training:** LoRA UI exists, backend integration pending
- **Network Sync:** Basic, needs P2P peer discovery improvements

### 21.6 SDK

- **`grantPermission`/`revokePermission`:** Not implemented in TypeScript SDK
- **Streaming Inference:** WebSocket support in alternative JS SDK only
- **Python SDK:** Less mature than TypeScript SDK

### 21.7 Contracts

- **Audit Status:** Not externally audited
- **Upgradability:** No proxy pattern; contracts are immutable once deployed
- **Gas Optimization:** `via_ir` enabled but not deeply optimized

---

## Appendix A: Configuration Reference

### Node TOML

```toml
chain_id = 1337
coinbase = "0x1111111111111111111111111111111111111111"
ghostdag_k = 18
max_parents = 10
target_block_time_ms = 1000
data_dir = ".citrate-devnet"
rpc_listen_addr = "127.0.0.1:8545"
p2p_listen_addr = "0.0.0.0:30303"
max_peers = 50
enable_mining = true
mining_interval_ms = 500
require_valid_signature = false  # devnet only
```

### Environment Variables

```bash
CITRATE_CHAIN_ID=1337
CITRATE_RPC_URL=http://localhost:8545
CITRATE_METRICS_ADDR=127.0.0.1:9090
CITRATE_DEV_MODE=true
RUST_LOG=info,citrate_api=debug
LOG_FORMAT=json
LOG_FILE=/var/log/citrate/node.log
```

---

## Appendix B: Error Type Hierarchy

```
GhostDagError
  ├── BlockNotFound(Hash)
  ├── InvalidParents
  ├── CycleDetected
  └── KClusterViolation

DagStoreError
  ├── BlockNotFound(Hash)
  ├── BlockExists(Hash)
  ├── InvalidHeight
  └── StorageError(String)

MempoolError
  ├── Full
  ├── DuplicateTransaction(Hash)
  ├── InvalidTransaction(String)
  ├── NonceTooLow { expected, got }
  ├── GasPriceTooLow { min, got }
  ├── SenderLimitExceeded
  └── InvalidSignature

BlockBuilderError
  ├── NoTransactions
  ├── BlockSizeExceeded
  ├── GasLimitExceeded
  ├── InvalidParent
  ├── NotReady
  ├── StateRootError(String)
  ├── ReceiptRootError
  └── ExecutionError(String)

ValidationError
  ├── InvalidSignature
  ├── InsufficientBalance { required, available }
  ├── InvalidNonce { expected, got }
  ├── GasLimitTooHigh { max, got }
  ├── GasPriceTooLow { min, got }
  ├── Expired
  ├── InvalidRecipient
  ├── DataTooLarge { max, got }
  ├── BlacklistedAddress(PublicKey)
  └── RateLimitExceeded

ApiError
  ├── InvalidTransaction(String)
  ├── InsufficientGas
  ├── NonceTooLow
  ├── AddressNotFound
  ├── BlockNotFound
  └── InvalidChainId
```

---

## Appendix C: Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Throughput | 10,000+ TPS | In progress (parallel exec) |
| Finality | ≤12 seconds | 100-block depth (~200s actual) |
| Block Time | 1-2 seconds | 2 seconds implemented |
| DAG Width | 100+ parallel blocks | Supported (k=18) |
| Precompile Latency | <100ms | Met for standard precompiles |
| RPC p50 Latency | <200ms | Met |
| State DB Reads | <1ms | Met (DashMap + LRU cache) |
| Block Storage | <5ms | Met (RocksDB batch writes) |

---

## Appendix D: Test Coverage

| Component | Test Count | Framework | Status |
|-----------|-----------|-----------|--------|
| Consensus (GhostDAG) | 8 (4 unit + 4 proptest) | tokio::test + proptest | Passing |
| Execution (EVM) | ~50 | tokio::test | Passing |
| Storage (RocksDB) | ~30 | tokio::test | Passing |
| Sequencer (Mempool) | ~20 | tokio::test | Passing |
| API (RPC) | ~15 | reqwest integration | Passing |
| SDK (TypeScript) | 248 | Jest integration | 100% passing |
| GUI (React) | 419 | Vitest | Passing |
| Contracts (Solidity) | ~10 | Foundry/forge | Passing |
