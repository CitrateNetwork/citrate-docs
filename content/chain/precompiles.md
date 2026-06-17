---
title: Precompiles, tensor, x402, Belnap-q16
codex_slug: /chain/precompiles
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/execution/src/precompiles/
surfaces: [CHAIN-pre-tensor, CHAIN-pre-x402, CHAIN-pre-q16]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context) + Saul Loveman
---

# Precompiles, tensor, x402, Belnap-q16

> The non-confidential Citrate precompiles: deterministic tensor primitives,
> x402 payment verification, and Belnap-q16 lattice aggregation. Addresses,
> inputs, and outputs are audited against code. For contract authors.

> **Note on tiering.** This page mixes academic (`tensor`, `q16`) and
> commercial (`x402`) surfaces and is staged at the higher of those tiers.
> The confidential ZKP / inference / attestation precompiles are documented
> separately, see [Confidential precompiles overview](/chain/precompiles-zkp).

## Overview

Citrate extends the standard 9 Ethereum precompiles (`0x01`–`0x09`) with three
address pages routed by `PrecompileExecutor` in
`core/execution/src/precompiles/mod.rs`:

| Page | Range | Purpose |
|---|---|---|
| AI / verification / compute | `0x0100`–`0x010F` | inference runtime, ZKP verify, deterministic compute |
| Learning | `0x0110`–`0x011F` | Belnap-q16 aggregation, routing inference |
| x402 payments | `0x0200`–`0x0209` | EIP-712 / EIP-3009 payment verification |

`is_precompile()` recognizes an address by matching its high-17 zero bytes plus
the page bytes; `execute()` dispatches by the same prefix. This page documents
the **tensor**, **x402**, and **q16** surfaces. (The `0x0100`–`0x0109` ZKP /
inference / attestation surfaces are confidential, see the overview page.)

## Reference

### {#tensor} Tensor primitives (academic)

Code: `core/execution/src/tensor/` and the canonical wire format in
`core/execution/src/precompiles/tensor_format.rs`.

- **In-VM tensor engine** (`tensor/engine.rs`, `TensorEngine`): allocates
  `Tensor` values (`ArrayD<f32>` + `TensorShape`, optional grad) keyed by a
  `U256` id, with a configurable memory cap. `tensor/ops.rs` provides
  `TensorOps`.
- **Canonical binary tensor format v1** (`tensor_format.rs`), **FROZEN**, is what every AI precompile that accepts/returns tensor data uses on the
  wire:

  ```text
  [ 1 byte rank ]                       # 0..=4; rank >= 5 rejected
  [ rank x 4 bytes shape (u32 BE) ]     # each dim >= 1, row-major
  [ 1 byte dtype ]                      # selector; unknown -> UnknownDtype
  [ data bytes ]                        # element_count x dtype.byte_size, BE
  ```

  Format stability is what makes `0x0107 TENSOR_COMMIT` commitments stable
  across versions; an incompatible change requires a new dtype byte or a new
  precompile address.

> The deterministic Q16.16 tensor *compute* precompiles
> (`0x010A`–`0x010F`, RM-M2) are reserved in the dispatcher and route to
> `compute::execute`. Treat the tensor-engine API as the documented surface
> here; the compute precompile ABIs land with RM-M2.

### {#x402} x402 payment precompiles (commercial)

Code: `core/execution/src/precompiles/x402.rs`. Addresses `0x0200`–`0x0202`.
These accelerate Coinbase x402 payment verification at the precompile level
(~9× cheaper than equivalent Solidity per the source). Each is deterministic
(ecrecover + keccak).

| Address | Name | Input | Output | Gas |
|---|---|---|---|---|
| `0x0200` | `EIP712_VERIFY` | EIP-712 typed-data digest material + signature (r,s,v) | 32 bytes: 12 zero bytes + 20-byte recovered address (zero-address on failure, mirrors ECRECOVER) | 3 450 |
| `0x0201` | `TRANSFER_AUTH_VERIFY` | EIP-3009 `TransferWithAuthorization` fields + signature | 32 bytes: bytes 12–31 = recovered signer address; verifies signer == `from` | 4 200 |
| `0x0202` | `BATCH_PAYMENT_VERIFY` | count + repeated `TransferWithAuthorization` records | per-record recovered addresses | `BATCH_BASE` 2 000 + `BATCH_PER_PAYMENT` 3 800 × n |

The EIP-3009 type hash is
`keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")`.
Constants live in `x402::addresses` and `x402::gas_costs`. (See the source for
the exact byte offsets of each field, the layout is the authoritative ABI.)

> A Level-3 upgrade path (validator-embedded facilitator, implicit header
> payments, cross-shard settlement) is described in the source header and
> ADR-005; it is **not** yet implemented.

### {#q16} Belnap-q16 lattice aggregation (academic)

Code: `core/execution/src/precompiles/q16/`. Address `0x0110`
(`BELNAP_AGGREGATE`, byte17=1 byte18=1 byte19=0x10). A second learning slot
`0x0111` (`ROUTING_INFERENCE`) is wired but is RM-FL-2 / future.

- **Substrate:** a hand-rolled, integer-only, saturating **Q16.16
  fixed-point** library (`q16/mod.rs`, type `Q16(i32)`; value = `inner / 2^16`).
  Every op uses only `i32`/`i64` math, no floats, no `unsafe`, so results are
  **bit-identical on any CPU**. Overflow saturates to `Q16::MAX`/`MIN`; division
  by zero returns `MAX`/`MIN` by numerator sign (never panics). `f64`
  conversions exist only behind `#[cfg(test)]`.
- **`0x0110 BELNAP_AGGREGATE`** (`q16/belnap.rs`): aggregates per-validator
  embedding contributions into (a) a Q16 weighted-mean value per dimension and
  (b) a Belnap-FOUR state per dimension ∈ {Neither, True, Both, False}. Output
  is bit-deterministic. Gas = `2000 + 50 * dim`.
  - Input (per the `execute` entry point / dispatch tests): a header giving
    `dim` and `n` (participant count), then for each (participant, dim) a Q16
    embedding, Q16 confidence, and Q16 weight, plus a Q16 positive threshold.
  - Output: for each dim, 4 bytes Q16 aggregated value + 1 byte Belnap state
    (i.e. `dim * 5` bytes).
  - The off-chain f32 reference is `core/learning/src/belnap.rs`; the precompile
    matches it at the **semantic** level (sign + confidence regime), not byte
    equality (reference uses f32).

## Examples

Call a precompile like any EVM precompile, `staticcall` to the address with
ABI-packed input. For example, x402 EIP-712 verify is a `staticcall` to
`0x0000…0200`; the 32-byte return contains the recovered address in its low 20
bytes. See `x402.rs` test vectors for exact encodings.

## Tutorials

See [Chain tutorials](/chain/tutorials) for a worked x402 verification example.

## Security & access

This page is staged **commercial** because it documents competitive
implementation depth (precompile ABIs and gas economics) that any contracted /
KYC'd builder should have but that we don't want anonymously vacuumed up; the
tensor and q16 surfaces are academic (research provenance, TLA+ /
formal-methods adjacent). **No secrets here**, only addresses, public ABIs,
gas constants, and type hashes that are observable on-chain anyway. The
genuinely sensitive precompiles (ZKP / inference / attestation internals) are
**not** on this page, see [Confidential precompiles overview](/chain/precompiles-zkp).

## Source & verification

- Source repo: `citrate-chain`
- Paths: `core/execution/src/tensor/`,
  `core/execution/src/precompiles/{x402.rs,tensor_format.rs,q16/}`,
  `core/execution/src/precompiles/mod.rs`
- Audited against SHA: `03d7851`
