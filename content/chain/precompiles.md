---
title: Precompiles, address pages, tensor, x402, q16
codex_slug: /chain/precompiles
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/execution/src/precompiles/
surfaces: [CHAIN-pre-tensor, CHAIN-pre-x402, CHAIN-pre-q16]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Citrate Network keeps the nine standard Ethereum precompiles and adds its own at higher addresses:
deterministic tensor primitives, x402 payment verification, and Belnap-q16 lattice aggregation. This page
is the reference for the address pages and for the tensor, x402, and q16 surfaces, with each item cited to its
code path. It is for contract authors.

## What it is

A precompile is a contract address that runs native code rather than EVM bytecode, so a common operation
runs faster and cheaper than the equivalent Solidity. The Citrate Network keeps the standard nine at `0x01`
to `0x09`, ECRECOVER through BLAKE2F, and adds several address pages above them, routed by
`PrecompileExecutor` in `core/execution/src/precompiles/mod.rs`.

| Page | Range | Purpose |
|---|---|---|
| AI, verification, compute | `0x0100` to `0x010F` | inference runtime, proof verification, deterministic Q16 compute |
| Learning | `0x0110` to `0x011F` | Belnap-q16 aggregation, routing inference |
| Signature verification | `0x0120` to `0x012F` | Ed25519 signature verification |
| Recursive-fold verification | `0x0130` to `0x013F` | CommD proof verification (feature-gated) |
| x402 payments | `0x0200` to `0x0209` | EIP-712 and EIP-3009 payment verification |

`is_precompile()` recognizes an address by matching its leading zero bytes plus the page bytes, and
`execute()` dispatches by the same prefix. This page documents the tensor, x402, and q16 surfaces. The
`0x0100` to `0x0109` inference, verification, and attestation surfaces are summarized
on a separate page, see [inference, verification, and attestation precompiles](/chain/precompiles-zkp).

## How to use it

Call a precompile like any EVM precompile: `staticcall` the address with ABI-packed input and read the
return bytes.

1. Pack the input for the precompile you are calling. The exact byte offsets are defined by the source for
   each one; the layout there is the authoritative ABI.
2. `staticcall` the precompile address. For example, x402 EIP-712 verification is a `staticcall` to
   `0x0000…0200`.
3. Read the return value. For the x402 verifiers the 32-byte return holds the recovered address in its low
   20 bytes, mirroring ECRECOVER, with the zero address on failure.
4. For exact encodings, work from the test vectors in the precompile's source file rather than from prose.

See [chain tutorials](/chain/tutorials/call-citrate-rpc) for a worked x402 verification, and [chain RPC](/chain/rpc) for
connection details.

## Reference

### Tensor primitives

Code: `core/execution/src/tensor/` and the wire format in
`core/execution/src/precompiles/tensor_format.rs`.

The in-VM tensor engine (`tensor/engine.rs`, `TensorEngine`) allocates tensor values, an `ArrayD<f32>` plus
a shape and an optional gradient, keyed by a `U256` id, with a configurable memory cap; `tensor/ops.rs`
provides the operations. Every AI precompile that accepts or returns tensor data does so in the canonical
binary tensor format, version 1, which is frozen:

```text
[ 1 byte rank ]                    # 0 to 4; rank 5 or more is rejected
[ rank x 4 bytes shape (u32 BE) ]  # each dim at least 1, row-major
[ 1 byte dtype ]                   # selector; unknown maps to UnknownDtype
[ data bytes ]                     # element_count x dtype.byte_size, big-endian
```

That the format is frozen is what keeps the `0x0107 TENSOR_COMMIT` commitments stable across versions. An
incompatible change requires a new dtype byte or a new precompile address. The deterministic Q16.16 compute
precompiles (`0x010A` to `0x010F`) are implemented as six fixed-point tensor primitives - matmul, dot,
softmax, relu, linear, and transpose - and dispatched to `compute::execute` (`compute.rs`); treat the
tensor-engine API as the documented surface here.

### x402 payment precompiles

Code: `core/execution/src/precompiles/x402.rs`. Addresses `0x0200` to `0x0202`. These accelerate Coinbase
x402 payment verification at the precompile level, about nine times cheaper than the equivalent Solidity
per the source. Each is deterministic, ecrecover plus keccak.

| Address | Name | Input | Output | Gas |
|---|---|---|---|---|
| `0x0200` | `EIP712_VERIFY` | EIP-712 typed-data digest material and signature (r, s, v) | 32 bytes: 12 zero bytes then the 20-byte recovered address; zero address on failure | 3,450 |
| `0x0201` | `TRANSFER_AUTH_VERIFY` | EIP-3009 `TransferWithAuthorization` fields and signature | 32 bytes: bytes 12 to 31 hold the recovered signer; verifies signer equals `from` | 4,200 |
| `0x0202` | `BATCH_PAYMENT_VERIFY` | count then repeated `TransferWithAuthorization` records | per-record recovered addresses | `BATCH_BASE` 2,000 plus `BATCH_PER_PAYMENT` 3,800 times n |

The EIP-3009 type hash is
`keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")`.
Constants live in `x402::addresses` and `x402::gas_costs`. A Level-3 upgrade path, a validator-embedded
facilitator with implicit header payments and cross-shard settlement, is described in the source header and
ADR-005; it is not yet implemented.

### Belnap-q16 lattice aggregation

Code: `core/execution/src/precompiles/q16/`. Address `0x0110`, `BELNAP_AGGREGATE`. A second learning slot,
`0x0111` (`ROUTING_INFERENCE`), is wired in the dispatcher but is future work (RM-FL-2).

The substrate is a hand-rolled, integer-only, saturating Q16.16 fixed-point library (`q16/mod.rs`, type
`Q16(i64)`, where the real value is `inner / 2^16`). Every operation uses only `i64` math, with an `i128`
intermediate only inside multiply and divide, no floats and no `unsafe`, so results are bit-identical on any CPU. Overflow saturates to `Q16::MAX` or
`Q16::MIN`, division by zero returns `MAX` or `MIN` by the numerator's sign, and nothing panics. `f64`
conversions exist only behind `#[cfg(test)]`.

`0x0110 BELNAP_AGGREGATE` (`q16/belnap.rs`) aggregates per-validator embedding contributions into a Q16
weighted-mean value per dimension and a Belnap-FOUR state per dimension drawn from {Neither, True, Both,
False}. The output is bit-deterministic; gas is `2000 + 50 * dim`.

- Input: a header giving `dim` and `n`, the participant count, then for each participant and dimension a Q16
  embedding, a Q16 confidence, and a Q16 weight, plus a Q16 positive threshold and a Q16 negative threshold.
- Output: per dimension, 8 bytes of Q16 (i64) aggregated value then 1 byte of Belnap state, so `dim * 9`
  bytes in all.
- The off-chain f32 reference is `core/learning/src/belnap.rs`. The precompile matches it at the semantic
  level, sign and confidence regime, not at byte equality, because the reference uses f32.

## Design rationale

These precompiles exist because the operations they perform need to be both cheap and exactly reproducible
on every node. Payment verification is signature recovery, which is far cheaper as native code than as
Solidity, so x402 is a precompile. Aggregation of model contributions has to produce the identical result
on every validator or the chain would fork, and floating-point math does not, so the q16 path is built on
integer fixed-point that saturates rather than panicking and is bit-identical across hardware. The frozen
tensor format follows the same discipline: a stable wire format is what lets a commitment made today still
verify tomorrow.

## Failure modes

- The x402 verifiers fail closed: on a bad signature they return the zero address rather than reverting, so
  a caller that does not check the return treats a failed verification as an unrecognized signer, not a
  success.
- Q16.16 arithmetic never panics; overflow saturates and division by zero returns a signed extreme. The
  cost is that a saturated value is a clamped value, not an error, so contracts that care about the
  difference must check ranges themselves.
- The tensor format rejects rank 5 or higher and unknown dtypes rather than guessing, so malformed tensor
  input does not silently decode into a wrong shape.

## Access and canon

This page is staged commercial. It documents implementation depth, precompile ABIs and gas economics, that
a contracted, identity-verified builder should have but that we would rather not have vacuumed up
anonymously. Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity. Nothing here is secret: addresses, public ABIs,
gas constants, and type hashes are all observable on-chain. The genuinely sensitive precompiles, the
inference, proof-verification, and attestation internals, are not on this page; see
[verification, inference, and attestation precompiles](/chain/precompiles-zkp).

## Source and verification

- Source repo: `citrate-chain`
- Source files: `core/execution/src/precompiles/mod.rs`,
  `core/execution/src/precompiles/{x402.rs,tensor_format.rs}`,
  `core/execution/src/precompiles/q16/{mod.rs,belnap.rs}`, `core/execution/src/precompiles/compute.rs`,
  `core/execution/src/tensor/`, `core/learning/src/belnap.rs`
- Audited against SHA: `9d5959e`
- Status: Implemented (pre-audit). The tensor format, the `0x010A` to `0x010F` Q16 compute primitives, and
  the x402 and q16 precompiles run on testnet 40204. `0x0111 ROUTING_INFERENCE` is wired in the dispatcher
  but is future work (RM-FL-2), and the `0x0130` recursive-fold CommD verifier is feature-gated.
