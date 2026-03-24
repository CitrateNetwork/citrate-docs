# GPU Clustering Design — Multi-Provider Compute Pools

**Question:** Alice and Bob each bring 10 GPUs. Can we route 20 GPUs to a customer?
**Answer:** Yes, with workload-dependent scaling characteristics.

---

## Three Clustering Modes

### Mode 1: Inference Pool (Linear Scaling)

```
Customer: "I need 1,000 inference queries/second"

ComputePool {
  providers: [Alice(10 GPUs), Bob(10 GPUs)]
  mode: "inference_pool"
  total_capacity: 20 GPUs
  routing: round_robin | least_loaded | geo_nearest
}

Scaling: ~linear
  10 GPUs = ~500 qps
  20 GPUs = ~1,000 qps
  100 GPUs = ~5,000 qps
```

Each GPU handles requests independently. No inter-GPU communication needed. The marketplace routes each request to the least-loaded GPU. This is the same pattern CDNs use.

**Already supported by:** InferenceRouter.sol provider scoring + routing

**What needs to be built:**
- `ComputePool.sol` — groups providers into named pools
- Pool-level load balancing (currently per-provider)
- Pool SLA: guaranteed throughput with slashing if not met

### Mode 2: Data-Parallel Training (Sub-Linear Scaling)

```
Customer: "Train my 7B model on 100GB of data"

ComputePool {
  providers: [Alice(10 GPUs), Bob(10 GPUs)]
  mode: "data_parallel"
  total_capacity: 20 GPUs
  aggregation: federated_gradient_averaging
}

Scaling: sub-linear (communication overhead)
  10 GPUs = 8x speedup (80% efficiency)
  20 GPUs = 14x speedup (70% efficiency)
  100 GPUs = 50x speedup (50% efficiency)
```

Each GPU has a full copy of the model. Each trains on a different data shard. At checkpoint boundaries, gradients are aggregated (this is exactly what our OODA learning cycle does).

**The bottleneck:** Gradient synchronization. After each training step, all GPUs exchange gradient updates. With 20 GPUs across the internet, this is ~100MB per sync at ~20ms latency. Gradient compression (top-K sparsification) reduces this to ~1-10MB.

**Already supported by:**
- LearningGossip P2P messages (embedding exchange at checkpoints)
- Paraconsensus aggregation (Byzantine-tolerant gradient averaging)
- LoRA adapter composition (low-rank gradient updates, 90-99% compression)

**What needs to be built:**
- `TrainingPool.sol` — coordinates multi-provider training jobs
- Gradient aggregation service (extend orchestration.rs)
- Checkpoint synchronization across providers
- Payment per gradient contribution (extend ContributionAccounting)

### Mode 3: Model-Parallel Inference (Constrained Scaling)

```
Customer: "I need to serve a 70B model that doesn't fit on one GPU"

ComputePool {
  providers: [Alice(4× A100 80GB), Bob(4× A100 80GB)]
  mode: "pipeline_parallel"
  total_capac OODA learning cycle does. Scales well to
  ~32-64 GPUs with gradient compression.

  What's Hard (The Real Challenge)
ity: 8 GPUs (pipeline stages)
  topology: Alice handles layers 0-39, Bob handles layers 40-79
}

Scaling: constrained by inter-provider latency
  Same datacenter: ~1.5x overhead vs single server
  Same region: ~3x overhead
  Cross-region: ~10x overhead (often unviable)
```

The model is split across GPUs. Layer 0-39 runs on Alice's GPUs, layer 40-79 on Bob's. Each inference request flows through the pipeline sequentially.

**The hard truth:** This only works when providers are geographically close. Cross-continent pipeline parallelism for interactive inference is not viable with current internet latency.

**What we CAN do:**
- Match providers by geographic zone (already in ProviderRegistry design)
- Create "locality-aware pools" that only group providers within the same region
- Offer pipeline parallelism as a premium tier (providers must demonstrate <5ms inter-node latency)

**What needs to be built:**
- `PipelinePool.sol` — coordinates model sharding across providers
- Latency attestation (providers prove inter-node latency)
- Pipeline orchestration (which provider handles which layers)
- KV cache routing (session affinity for multi-turn conversations)

---

## The Contract: ComputePool.sol

```solidity
contract ComputePool {
    enum PoolMode { InferencePool, DataParallel, PipelineParallel }

    struct Pool {
        uint256 id;
        string name;
        PoolMode mode;
        address[] providers;        // participating provider addresses
        uint256 totalGPUs;          // sum of all provider GPUs
        uint256 minProviders;       // minimum to maintain pool
        uint256 guaranteedThroughput; // qps for inference, steps/s for training
        uint256 pricePerUnit;       // SALT per query (inference) or per epoch (training)
        bool active;
    }

    // Provider joins a pool with their GPU allocation
    function joinPool(uint256 poolId, uint256 gpuCount) external;

    // Provider leaves (with cooldown to prevent disruption)
    function leavePool(uint256 poolId) external;

    // Customer requests compute from a pool
    function requestCompute(
        uint256 poolId,
        bytes calldata jobSpec,     // model hash, input data, config
        uint256 maxPrice
    ) external payable returns (uint256 jobId);

    // Pool-level SLA: if throughput drops below guarantee, providers slashed
    function reportSLAViolation(uint256 poolId, uint256 actualThroughput) external;
}
```

---

## Scaling Math

### Inference Pools (the sweet spot)

| Providers | GPUs | Queries/sec | Efficiency | Cost vs Centralized |
|-----------|------|-------------|------------|-------------------|
| 1 (Alice) | 10 | ~500 | 100% | ~60% cheaper |
| 2 (Alice+Bob) | 20 | ~1,000 | 100% | ~65% cheaper |
| 5 | 50 | ~2,500 | 100% | ~70% cheaper |
| 10 | 100 | ~5,000 | 100% | ~75% cheaper |
| 50 | 500 | ~25,000 | 100% | ~80% cheaper |

Linear scaling. Each GPU is independent. More providers = more throughput = lower cost per query (providers compete on price).

### Data-Parallel Training

| Providers | GPUs | Training Speedup | Efficiency | Communication |
|-----------|------|-----------------|------------|---------------|
| 1 | 10 | 10x | 100% | NVLink (local) |
| 2 | 20 | 16x | 80% | Internet + gradient compression |
| 5 | 50 | 30x | 60% | Internet + gradient compression |
| 10 | 100 | 45x | 45% | Communication dominates |

Sub-linear but still valuable. A 7B model that takes 24 hours on 10 GPUs takes ~1.5 hours on 100 GPUs (45x speedup, 45% efficiency). The customer pays for 100 GPU-hours but gets 45 GPU-hours of useful work — still cheaper than renting a centralized 100-GPU cluster at $3/GPU/hr.

### Pipeline-Parallel Inference

| Setup | Latency per Query | Throughput | Viable? |
|-------|------------------|------------|---------|
| Same server (NVLink) | 50ms | High | Yes (centralized) |
| Same datacenter | 75ms | Good | Yes |
| Same region (<5ms) | 120ms | OK | Yes for batch |
| Cross-region (>20ms) | 500ms+ | Low | No for interactive |

Pipeline parallelism only works within low-latency boundaries. Our architecture should enforce this with latency attestation.

---

## How It Composes With Existing Infrastructure

```
Existing:                          New:
┌─────────────────────┐           ┌──────────────────────┐
│ InferenceRouter     │──extends──│ ComputePool          │
│ (single-provider)   │           │ (multi-provider)     │
├─────────────────────┤           ├──────────────────────┤
│ ModelRegistry       │──uses─────│ Pool model sharding  │
├─────────────────────┤           ├──────────────────────┤
│ LearningCycleManager│──routes───│ Training pools       │
├─────────────────────┤           │ (data-parallel)      │
│ NematocystSlashing  │──enforces─│ Pool SLA violations  │
├─────────────────────┤           ├──────────────────────┤
│ ContributionAcctng  │──records──│ Per-GPU contributions│
├─────────────────────┤           ├──────────────────────┤
│ LiquidStakingPool   │──secures──│ Pool-level staking   │
└─────────────────────┘           └──────────────────────┘
```

The ComputePool contract EXTENDS the existing infrastructure:
- Uses InferenceRouter's provider scoring for intra-pool routing
- Uses ModelRegistry for model metadata and access control
- Routes LearningCycleManager's compute through pools
- Slashes via NematocystSlashing on SLA violations
- Records contributions per-GPU through ContributionAccounting
- Requires staking through LiquidStakingPool for pool membership

No existing code is replaced. ComputePool is an ADDITIONAL contract that composes with everything we've already built and verified.

---

## TLA+ Spec Needed

`ComputePoolLifecycle.tla` — models:
- Pool creation with minimum provider count
- Provider join/leave with cooldown
- Job routing within pool (inference: round-robin, training: shard assignment)
- SLA monitoring and violation slashing
- Pool dissolution when providers < minimum

Invariants:
- PoolSolvent: total staked in pool >= guaranteed throughput × penalty rate
- ProviderCooldown: can't leave during active job
- SLAEnforced: actual throughput < guarantee → providers slashed proportionally
- MinProvidersMaintained: active pool has >= minProviders
- GPUCountAccurate: totalGPUs = sum of all provider GPU allocations

---

## The Honest Scaling Limits

1. **Inference pools scale linearly and are the primary product.** This is where we compete with Akash and Render. We win on verification (they have none).

2. **Data-parallel training scales to ~50-100 GPUs efficiently** with gradient compression. Beyond that, communication overhead dominates. This is competitive with Gensyn but we add verification + learning integration.

3. **Pipeline-parallel inference across providers is limited by physics** (speed of light × distance). We should offer it as a premium tier with latency requirements, not as the default.

4. **The real scaling advantage is the marketplace itself.** When 1,000 providers each contribute 4 GPUs, the network has 4,000 GPUs available. No single provider needs to be large. The long tail of idle compute (schools, home users, small businesses) is the supply moat that centralized providers can't match.
