---
title: Precompile addresses
codex_slug: /chain/precompile-addresses
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/execution/src/precompiles/mod.rs
surfaces: [CHAIN-precompile-addresses]
audited_against_sha: 5d2219dc
status: Implemented
created: 2026-10-04T00:00:00Z
author: Citrate team
nav_order: 6
---

This is the canonical list of Citrate precompile addresses on chain 40204 (Citrate Network). It is generated
from the chain source at commit `5d2219dc`: the bridged sets `PURE_PRECOMPILE_ADDRESSES` and
`AGENT_FORK_PRECOMPILE_ADDRESSES` in `core/execution/src/precompiles/mod.rs`, the release pin in
`core/execution/src/agent_fork.rs`, and the `precompiles` block of the address book
(`contracts/addresses/40204.json`). Only the one-line descriptions are written by hand. Precompiles are fixed
addresses and do not move across re-rolls.

The 4 agent precompiles are not activated on 40204 at this chain ref (release pin `AGENT_PRECOMPILES_PINS` is `None`); until they are, a contract call to them does not reach the precompile.

"From contracts" says whether contract code can call the address. The hosted inference family is served by the
node and is not bridged into the EVM, so a contract call to it does not reach the model runtime. The standard
Ethereum precompiles at `0x01` to `0x09` are unchanged and not listed. For how to call these, see
[precompiles](/chain/precompiles).

| Address | Padded address | Name | Family | What it does | From contracts | Activation on 40204 |
|---|---|---|---|---|---|---|
| `0x0100` | `0x0000000000000000000000000000000000000100` | `MODEL_DEPLOY` | Hosted inference | Model deployment and registration. | no, not bridged into the EVM | node-hosted only |
| `0x0101` | `0x0000000000000000000000000000000000000101` | `MODEL_INFERENCE` | Hosted inference | Model inference execution; returns a signed, attestation-gated receipt, not a proof of correctness. | no, not bridged into the EVM | node-hosted only |
| `0x0102` | `0x0000000000000000000000000000000000000102` | `BATCH_INFERENCE` | Hosted inference | Batch inference over several inputs in one call. | no, not bridged into the EVM | node-hosted only |
| `0x0103` | `0x0000000000000000000000000000000000000103` | `MODEL_METADATA` | Hosted inference | Model metadata query. | no, not bridged into the EVM | node-hosted only |
| `0x0105` | `0x0000000000000000000000000000000000000105` | `MODEL_BENCHMARK` | Hosted inference | Model performance benchmarking. | no, not bridged into the EVM | node-hosted only |
| `0x0106` | `0x0000000000000000000000000000000000000106` | `MODEL_ENCRYPTION` | Hosted inference | Model encryption operations. | no, not bridged into the EVM | node-hosted only |
| `0x0107` | `0x0000000000000000000000000000000000000107` | `TENSOR_COMMIT` | Verification | Poseidon commitment over a canonical-format tensor; returns a 32-byte field element. | yes | bridged at every height |
| `0x0108` | `0x0000000000000000000000000000000000000108` | `INFERENCE_PROOF_VERIFY` | Verification | Halo2-KZG verification of an inference proof; live where the node build carries the verifier. | yes | bridged at every height |
| `0x0109` | `0x0000000000000000000000000000000000000109` | `MERKLE_VERIFY_TENSOR` | Verification | Merkle inclusion check over a Poseidon-committed tensor. | yes | bridged at every height |
| `0x010A` | `0x000000000000000000000000000000000000010a` | `TENSOR_MATMUL_Q16` | Q16.16 compute | Fixed-point matrix multiply. | yes | bridged at every height |
| `0x010B` | `0x000000000000000000000000000000000000010b` | `TENSOR_DOT_Q16` | Q16.16 compute | Fixed-point dot product. | yes | bridged at every height |
| `0x010C` | `0x000000000000000000000000000000000000010c` | `TENSOR_SOFTMAX_Q16` | Q16.16 compute | Fixed-point softmax. | yes | bridged at every height |
| `0x010D` | `0x000000000000000000000000000000000000010d` | `TENSOR_RELU_Q16` | Q16.16 compute | Fixed-point ReLU. | yes | bridged at every height |
| `0x010E` | `0x000000000000000000000000000000000000010e` | `TENSOR_LINEAR_Q16` | Q16.16 compute | Fixed-point linear layer. | yes | bridged at every height |
| `0x010F` | `0x000000000000000000000000000000000000010f` | `TENSOR_TRANSPOSE_Q16` | Q16.16 compute | Fixed-point transpose. | yes | bridged at every height |
| `0x0110` | `0x0000000000000000000000000000000000000110` | `BELNAP_AGGREGATE` | Learning | Belnap-q16 aggregation of per-validator contributions into a Q16 value and a Belnap state per dimension. | yes | bridged at every height |
| `0x0111` | `0x0000000000000000000000000000000000000111` | `ROUTING_INFERENCE` | Learning | Routing-model inference: a fixed Q16 MLP that maps a query embedding to a mentor, an adapter and a confidence. | yes | bridged at every height |
| `0x0112` | `0x0000000000000000000000000000000000000112` | `LORA_APPLY` | Agent | Applies one LoRA adapter to one Q16.16 weight tile: W + (alpha / r) (B . A). | no, fork not activated | not activated (pin is None) |
| `0x0113` | `0x0000000000000000000000000000000000000113` | `LORA_MERGE` | Agent | Merges up to 16 LoRA adapters on one Q16.16 tile, for spot checks of a federated-learning aggregate. | no, fork not activated | not activated (pin is None) |
| `0x0120` | `0x0000000000000000000000000000000000000120` | `ED25519_VERIFY` | Signature verification | Ed25519 (RFC 8032) signature verification with strict acceptance. | yes | bridged at every height |
| `0x0121` | `0x0000000000000000000000000000000000000121` | `MEMORY_ANCHOR_VERIFY` | Agent | Checks a nightly decision-anchor inclusion proof and returns the day commitment to look up in AnchorRegistry. | no, fork not activated | not activated (pin is None) |
| `0x0122` | `0x0000000000000000000000000000000000000122` | `AGENT_OPS` | Agent | Checks member DeviceLink and DeviceRevocation signatures, matching the mesh's own rules. | no, fork not activated | not activated (pin is None) |
| `0x0130` | `0x0000000000000000000000000000000000000130` | `FOLD_COMMD_VERIFY` | Recursive-fold verification | Recursive-fold CommD proof verifier; feature-gated, so the default build returns a feature-absent error. | yes | bridged at every height |
| `0x0200` | `0x0000000000000000000000000000000000000200` | `EIP712_VERIFY` | x402 payments | Recovers the signer of an EIP-712 typed-data signature. | yes | bridged at every height |
| `0x0201` | `0x0000000000000000000000000000000000000201` | `TRANSFER_AUTH_VERIFY` | x402 payments | Verifies an EIP-3009 transferWithAuthorization signature and checks signer equals from. | yes | bridged at every height |
| `0x0202` | `0x0000000000000000000000000000000000000202` | `BATCH_PAYMENT_VERIFY` | x402 payments | Verifies several transferWithAuthorization signatures in one call. | yes | bridged at every height |
