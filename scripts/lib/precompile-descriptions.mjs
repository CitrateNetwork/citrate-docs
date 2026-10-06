// The one hand-written input to the generated precompile table (scripts/gen-precompiles.mjs).
//
// Keyed by the chain constant name (the last path segment of an element of PURE_PRECOMPILE_ADDRESSES /
// AGENT_FORK_PRECOMPILE_ADDRESSES in citrate-chain core/execution/src/precompiles/mod.rs, or of the
// constant in the module that defines a hosted-inference address). Addresses are NOT kept here: they come
// from the chain arrays and the address book. `book` is the entry's key in the book's `precompiles` block
// (contracts/addresses/40204.json) when the book lists it. `does` is a one-line summary of the chain doc
// comment for that constant (or docs/precompiles/AGENT_PRECOMPILES.md for the agent family); keep it to
// what the source says.
//
// The generator fails if the chain or the book has a precompile this map lacks, or if this map has an
// entry that neither the chain arrays nor the book carry. When the chain adds a precompile, add it here.
export const PRECOMPILE_DESCRIPTIONS = {
  // Hosted inference family (core/execution/src/precompiles/inference.rs, `addresses`). Node-hosted and
  // not bridged into the EVM.
  MODEL_DEPLOY: { book: "ModelDeploy", family: "Hosted inference", does: "Model deployment and registration." },
  MODEL_INFERENCE: { book: "ModelInference", family: "Hosted inference", does: "Model inference execution; returns a signed, attestation-gated receipt, not a proof of correctness." },
  BATCH_INFERENCE: { book: "BatchInference", family: "Hosted inference", does: "Batch inference over several inputs in one call." },
  MODEL_METADATA: { book: "ModelMetadata", family: "Hosted inference", does: "Model metadata query." },
  MODEL_BENCHMARK: { book: "ModelBenchmark", family: "Hosted inference", does: "Model performance benchmarking." },
  MODEL_ENCRYPTION: { book: "ModelEncryption", family: "Hosted inference", does: "Model encryption operations." },

  // Verification (verify.rs).
  TENSOR_COMMIT: { book: "TensorCommit", family: "Verification", does: "Poseidon commitment over a canonical-format tensor; returns a 32-byte field element." },
  INFERENCE_PROOF_VERIFY: { book: "InferenceProofVerify", family: "Verification", does: "Halo2-KZG verification of an inference proof; live where the node build carries the verifier." },
  MERKLE_VERIFY_TENSOR: { book: "MerkleVerifyTensor", family: "Verification", does: "Merkle inclusion check over a Poseidon-committed tensor." },

  // Deterministic Q16.16 compute (compute.rs).
  TENSOR_MATMUL_Q16: { book: "TensorMatmulQ16", family: "Q16.16 compute", does: "Fixed-point matrix multiply." },
  TENSOR_DOT_Q16: { book: "TensorDotQ16", family: "Q16.16 compute", does: "Fixed-point dot product." },
  TENSOR_SOFTMAX_Q16: { book: "TensorSoftmaxQ16", family: "Q16.16 compute", does: "Fixed-point softmax." },
  TENSOR_RELU_Q16: { book: "TensorReluQ16", family: "Q16.16 compute", does: "Fixed-point ReLU." },
  TENSOR_LINEAR_Q16: { book: "TensorLinearQ16", family: "Q16.16 compute", does: "Fixed-point linear layer." },
  TENSOR_TRANSPOSE_Q16: { book: "TensorTransposeQ16", family: "Q16.16 compute", does: "Fixed-point transpose." },

  // Learning (q16/belnap.rs, q16/routing.rs).
  BELNAP_AGGREGATE: { book: "BelnapAggregate", family: "Learning", does: "Belnap-q16 aggregation of per-validator contributions into a Q16 value and a Belnap state per dimension." },
  ROUTING_INFERENCE: { book: "RoutingInference", family: "Learning", does: "Routing-model inference: a fixed Q16 MLP that maps a query embedding to a mentor, an adapter and a confidence." },

  // Agent precompiles (lora.rs, memory_anchor.rs, agent_ops.rs; docs/precompiles/AGENT_PRECOMPILES.md).
  LORA_APPLY: { family: "Agent", does: "Applies one LoRA adapter to one Q16.16 weight tile: W + (alpha / r) (B . A)." },
  LORA_MERGE: { family: "Agent", does: "Merges up to 16 LoRA adapters on one Q16.16 tile, for spot checks of a federated-learning aggregate." },

  // Signature verification (ed25519.rs).
  ED25519_VERIFY: { book: "Ed25519Verify", family: "Signature verification", does: "Ed25519 (RFC 8032) signature verification with strict acceptance." },

  MEMORY_ANCHOR_VERIFY: { family: "Agent", does: "Checks a nightly decision-anchor inclusion proof and returns the day commitment to look up in AnchorRegistry." },
  AGENT_OPS: { family: "Agent", does: "Checks member DeviceLink and DeviceRevocation signatures, matching the mesh's own rules." },

  // Recursive-fold verification (commd_fold_verify.rs).
  FOLD_COMMD_VERIFY: { family: "Recursive-fold verification", does: "Recursive-fold CommD proof verifier; feature-gated, so the default build returns a feature-absent error." },

  // x402 payments (x402.rs).
  EIP712_VERIFY: { book: "X402Eip712Verify", family: "x402 payments", does: "Recovers the signer of an EIP-712 typed-data signature." },
  TRANSFER_AUTH_VERIFY: { book: "X402TransferAuthVerify", family: "x402 payments", does: "Verifies an EIP-3009 transferWithAuthorization signature and checks signer equals from." },
  BATCH_PAYMENT_VERIFY: { book: "X402BatchPaymentVerify", family: "x402 payments", does: "Verifies several transferWithAuthorization signatures in one call." },
};
