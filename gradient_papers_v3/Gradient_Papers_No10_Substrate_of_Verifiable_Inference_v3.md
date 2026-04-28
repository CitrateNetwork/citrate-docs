---
title: "The Substrate of Verifiable Inference: Halo2-KZG, Q16 Compute, and Attestation Gates (v3)"
version: v3
created: 2026-04-28T04:35:00Z
branch: main
author: Larry Klosowski + Saul Loveman + Claude Opus 4.7
status: active
maturity: Implemented — every primitive in this paper is on testnet 40204
new_in_v3: yes (no v2 antecedent)
---

# Paper X — The Substrate of Verifiable Inference (v3, new)

## Abstract

Papers I–IX describe **what** Citrate does. Paper X describes
**how the on-chain verification of off-chain AI work is actually
mechanized**. This paper is new in v3 because the substrate
itself is new — the RM-M1 / RM-M1b / RM-M2 / RM-M3 sprint
families landed between v2 and v3, and shipping in v0.5.0
(2026-04-26).

The substrate has four layers:

1. **Q16.16 fixed-point arithmetic** — bit-deterministic numeric
   primitives, identical across every CPU. (RM-M2)
2. **Tensor canonical wire format** — a single byte-layout for
   tensors that crosses the contract / precompile boundary.
3. **Halo2-KZG ZK verifier substrate** — a proving system whose
   SRS is the public Powers-of-Tau k=18 ceremony. (RM-M1b)
4. **TEE attestation gates** — for non-deterministic operations
   (e.g., LLM inference), an attestation contract that gates
   precompile dispatch on signed evidence from a TEE worker.
   (RM-M3, target deployment CM-08)

Together these make on-chain certification of off-chain AI
**possible without trusted custodians**. v3 is the first time
the substrate is documented end-to-end at the paper level.

## 1. Q16.16 fixed-point arithmetic [Implemented]

### 1.1 Why fixed-point

Floats are non-deterministic across CPUs. ARM and x86 differ in
rounding modes, fused-multiply-add semantics, and extended-
precision register widths. For a ZK system to be sound, the
result computed off-chain (by the prover, on real hardware) must
be **bit-identical** to the result encoded as a witness in the
ZK circuit (which lives over a finite field).

Q16.16 — one i32 = sign + 15 integer bits + 16 fractional bits —
gives us:

- **Bit-deterministic** arithmetic (integer-only, saturating).
- **5-decimal-digit dynamic range**, enough for forward
  inference of small networks.
- **Single-cycle add/subtract** on every modern CPU.
- **Two-cycle multiply** with 32-bit intermediate, no precision
  loss.

CI tripwire `scripts/ci/check_m2_no_float_in_q16.py` blocks any
commit that introduces `f32` / `f64` / `to_f64` in
`precompiles/q16/`.

### 1.2 The exp function

The hardest deterministic operation is `exp(x)`. v3 ships
`q16_exp` via 7-term Taylor with range reduction by `ln(2)`,
using Q48 (i128) intermediates to preserve precision:

```
q16_exp(x) =
    1. Decompose x = k · ln(2) + r,  |r| ≤ ln(2)/2
    2. Compute exp(r) via 7-term Taylor: 1 + r + r²/2! + ... + r⁷/7!
    3. Multiply by 2^k via integer shift
    4. Saturate result to Q16 range
```

Worst-case error: ≤ 32 ULP across the entire Q16 range. For
softmax this is sub-percent error after normalization, comfortably
inside the precision required for inference.

Source: `precompiles/q16/exp.rs`. Spec:
`specs/tla/compute/Q16ArithmeticDeterminism.tla` (verified, 265
states).

### 1.3 Six compute precompiles

The Q16 substrate exposes six precompiles at `0x010A–0x010F`:

| Precompile | Operation | Cap |
|-----------|-----------|-----|
| `0x010A` Q16_MATMUL | `C = A · B` | `m·n·p ≤ 2²⁰` |
| `0x010B` Q16_DOT | dot product | `len ≤ 2¹⁶` |
| `0x010C` Q16_SOFTMAX | numerically-stable softmax | `len ≤ 1024` |
| `0x010D` Q16_RELU | `max(0, x)` elementwise | `len ≤ 2²⁰` |
| `0x010E` Q16_LINEAR | `y = Wx + b` | `out × in ≤ 2¹⁸` |
| `0x010F` Q16_TRANSPOSE | matrix transpose | `m·n ≤ 2¹⁸` |

Each validates dtype = Q16_16 and rejects with revert on
mismatch. Each performs **validate-before-allocate** — caps
checked from the parsed header before any large allocation.

Source: `precompiles/compute.rs`. Detailed wire format:
`PRECOMPILES.md`.

## 2. Tensor canonical wire format [Implemented]

A precompile and a Solidity contract have to agree on byte
layout before they can hash, verify, or compute. The format:

```
header (8 bytes):
  byte 0:    magic = 0x54 ('T')
  byte 1:    version = 0x01
  byte 2:    dtype (0x01 = Q16_16)
  byte 3:    rank (≤ 4)
  byte 4–7:  reserved (zero)

shape (rank × 4 bytes):
  uint32-LE per dimension

data:
  shape.product() × dtype.byte_width() bytes
```

`tensor_format.rs::TensorView::parse` returns
`OversizeTensor` **before** allocation if the declared shape
exceeds the per-precompile cap. This bounds memory consumption
to the cap regardless of caller intent.

The format is **ABI-friendly** — Solidity `bytes calldata`
holding canonical-format tensor bytes can be `keccak256`'d for
direct comparison, or `abi.encodePacked`'d for transmission. A
contract writing a tensor to storage stores a single hash, not
the tensor itself.

## 3. Halo2-KZG verifier substrate [Implemented]

### 3.1 Why Halo2-KZG (not Groth16)

The legacy substrate (RM-M0) used Groth16 with a per-circuit
trusted setup. v3 substrate (RM-M1b) uses Halo2-KZG with the
public Powers-of-Tau k=18 ceremony. The migration motivations:

| Concern | Groth16 | Halo2-KZG |
|---------|---------|-----------|
| Trusted setup | Per-circuit | Universal (PPoT k=18, hundreds of contributors) |
| Recursion | No native | Yes (folding + accumulation) |
| Proof size | ~200 bytes | ~10 KB |
| Verification gas | ~250K | ~1M (single SHPLONK pairing) |
| Circuit changes | New trusted setup required | Just regenerate VK |

The trade-off is **verification gas**: Halo2-KZG is ~4× more
expensive on-chain. For Citrate this is acceptable because (a)
inference proofs are submitted by sophisticated counterparties
(model serving providers), (b) the *transparency* benefit of
universal SRS outweighs gas cost for a public chain.

The legacy Groth16 substrate (`zkp/inference_proof.rs`, 1005
lines) was **fully deleted** in commit `781a8b03` (RM-M1b WP-M1b.4)
once the Halo2 path was confirmed working.

Source decision: `.agentile/planset/adr/ADR-RM-M1b-1-halo2-kzg-substrate.md`.

### 3.2 The InferenceCircuit v1

```
Public inputs (3 slots, single Instance column):
  PI[0] = Poseidon(x[0..in_dim])      input commitment
  PI[1] = Poseidon(W flat ‖ b)         model commitment
  PI[2] = Poseidon(y[0..out_dim])     output commitment

Private witness:
  W: out_dim × in_dim Q16 weights
  x: in_dim Q16 inputs
  b: out_dim Q16 biases

Constraints:
  y = LinearChip(W, x, b)              (gate-enforced)
  Poseidon(x cells)         = PI[0]    (cell-bound via copy constraints)
  Poseidon(W cells ‖ b cells) = PI[1]
  Poseidon(y cells)         = PI[2]
```

The cell-bindings (via `PoseidonChip::hash_n_from_cells`) prevent
a malicious prover from feeding different values to the hash than
to the linear layer. The chip is composed in
`core/execution/src/zkp/halo2/circuits.rs` from
`PoseidonChip` + `LinearChip` (in `chips.rs`).

v1 dimensions: `out_dim=1, in_dim=2`. Larger sizes are
**configuration-only changes** — the witness vectors and the
keygen `k` parameter need updating, the circuit logic itself is
already general.

### 3.3 Sketch of soundness

The InferenceCircuit reduces "I ran the linear layer correctly"
to a SHPLONK pairing check. Soundness inherits from:

1. **Halo2-KZG soundness**: knowledge soundness under the
   discrete-log assumption + power-of-tau setup secrecy.
2. **PoseidonChip correctness**: `hash_n_from_cells` matches the
   off-chain Poseidon implementation byte-for-byte (verified by
   round-trip tests in `chips.rs::tests`).
3. **LinearChip correctness**: gate equations enforce
   `y[i] = ((Σⱼ W[i,j] · x[j]) >> 16) + b[i]` over Fr field
   arithmetic, matching Q16 overflow semantics.

A formal soundness proof is beyond the scope of this paper —
it's tracked in `specs/tla/zk/Halo2VerifierVersionMonotonic.tla`
(state-machine-level), with the cryptographic argument deferred
to the underlying Halo2 / KZG papers.

### 3.4 Saturation status (v1 limitation)

The LinearChip does **not** enforce Q16 saturation in-circuit.
The off-chain witness contract is that inputs stay in safe range.
This is the v1 limitation; **RM-M2b** adds lookup-table range
checks for full saturation soundness (target: 6-month follow-up).

For v1 deployment, the application layer (e.g.,
`InferenceRouter`) must enforce input ranges before submitting
proofs. Documented in `ZK_VERIFICATION.md` §2.

## 4. SRS (Powers-of-Tau) source resolution [Implemented]

The SRS is loaded from a `.ptau` file specified by the
`CITRATE_PTAU_PATH` environment variable. The loader
(`zkp/halo2/ptau.rs`) **hash-verifies** the file against the
embedded constant `srs::EXPECTED_PTAU_SHA256_K18` before
parsing. A tampered or wrong file is rejected fail-closed.

If `CITRATE_PTAU_PATH` is unset, the verifier falls back to
`ParamsKZG::setup` with a hardcoded seed `[0x4D; 32]`. This is
**INSECURE** (toxic waste reproducible) but DETERMINISTIC across
nodes. Dev/test only. Production runbook
`runbooks/RM_M1B_SOAK.md` covers acquisition + hash verification.

## 5. TEE attestation gates [Implemented + Specified deployment]

### 5.1 The non-determinism problem

Some operations cannot be ZK-verified: a 70B-parameter LLM
inference would take exponential proving time. For these the
substrate offers a **TEE-based shortcut**:

- A worker runs the inference inside a Confidential VM
  (Azure DCsv5 with NVIDIA H100 GPUs supported under the v3
  target).
- The TEE produces an **attestation token** (Microsoft Azure
  Attestation MAA JWT + NVIDIA NRAS evidence).
- The attestation contract `TEEAttestationRegistry`
  (`0x26333384a517c50d8B116979490b4AD1506F1F9a`) verifies the
  token against pinned trust roots.
- Precompile dispatch for non-deterministic ops gates on
  successful attestation lookup.

### 5.2 The AttestationGate trait

The substrate exposes an `AttestationGate` trait with a default
`AlwaysReject` implementation (Phase 1) and a planned
`MaaPlusNras` implementation (Phase 2 / CM-08). Source:
`core/execution/src/precompiles/attestation/`.

This means: today, non-deterministic precompiles (`0x0101`,
`0x0102`) **always reject** in production builds via
strict-mode enforcement. CI tripwire
`scripts/ci/check_m3_attestation_gate_required.py` ensures any
new non-deterministic op declares its attestation requirement.

### 5.3 Why pre-deploy the gate before the implementation

The gate is **pre-deployed** so that when the MAA+NRAS impl ships,
it's a **swap-in**, not an architectural change. Contracts that
already use the gate-checked precompiles continue working; the
gate just stops always-rejecting.

This matters operationally: the chain stays running while
attestation is upgraded; no contract needs to be redeployed.

## 6. End-to-end verifiable inference flow

The substrate composes for a complete verifiable inference:

```
1. Off-chain: provider runs inference inside a TEE.
2. TEE produces (input, output) + MAA+NRAS attestation token.
3. On-chain: provider posts (input, output) to InferenceRouter.
4. InferenceRouter calls TEEAttestationRegistry.verify(token).
   On success, the (input, output) tuple is settled and paid.
5. (Optional) Provider also generates a Halo2-KZG proof
   that the output matches the inference circuit on the
   committed weights. Contract calls 0x0108 to verify.
6. (Optional) Solidity contract calls 0x010A–0x010F Q16
   compute precompiles for arbitrary Q16 post-processing.
```

Step 4 requires CM-08 (TEE attestation deployment, target
2026-Q3). Steps 1–3 and 5–6 are **live today** on testnet 40204.

## 7. Implementation reality check

| Component | Status | Citation |
|-----------|--------|----------|
| Q16 substrate | **Implemented** | `precompiles/q16/{ops,exp}.rs` |
| 6 Q16 compute precompiles (0x010A–0x010F) | **Implemented + Live** | RM-M2 |
| Tensor canonical wire format | **Implemented** | `tensor_format.rs` |
| Halo2-KZG verifier (0x0108) | **Implemented + Live** | RM-M1b WP-M1b.4 |
| InferenceCircuit v1 (out_dim=1, in_dim=2) | **Implemented** | `circuits.rs` |
| PPoT k=18 SRS loader | **Implemented** | `ptau.rs` |
| AttestationGate trait + AlwaysReject | **Implemented** | RM-M3 |
| MAA+NRAS attestation impl | Specified | CM-08 (target Q3 2026) |
| RM-M2b saturation lookup tables | Specified | future sprint |
| TLA+ specs (verifier monotonic, Q16 determinism, dispatch injective, attestation) | **Verified** | `specs/tla/{zk,compute}/` |

## 8. Why this paper exists

The Gradient Papers I–IX describe the **what** and the **why**.
This paper documents the **how** at the deepest mechanical layer.
A reader who reads only Papers I–IX could leave thinking
"Citrate has verifiable inference" without knowing what the
verification actually consists of.

The substrate is the mechanical foundation that all the
higher-level promises rest on. If the substrate fails, the
promises fail.

## 9. References

- Bowe, S. et al. (2020). *Halo2: Recursive proof composition
  without a trusted setup*. Electric Coin Co.
- Hermez / Polygon Powers-of-Tau ceremony (2021–2022).
- Boneh, D. et al. (2018). *Verifiable Delay Functions*. Crypto.
- Microsoft Azure Attestation documentation.
- NVIDIA NRAS (Confidential Computing) — H100 attestation.
- Citrate Papers I, II, III — the surface this substrate
  supports.
- `PRECOMPILES.md`, `ZK_VERIFICATION.md` — developer-side
  reference for using these primitives.
- `.agentile/planset/adr/ADR-RM-M1b-1` and `ADR-RM-M2-1` —
  decision records.
