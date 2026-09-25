---
title: "The Substrate of Verifiable Inference: Halo2-KZG, Deterministic Q16 Compute, and Attestation Gates"
series: "The Gradient Papers — No. X"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Implemented
supersedes: "v3-April draft (new in v3; no v2 antecedent)"
---

# The Substrate of Verifiable Inference

> **Addresses.** Contract addresses cited in this paper are from an earlier address book and several have moved or have no code on chain 40204. Use the canonical, generated list at https://docs.citrate.ai/chain/addresses, which marks each contract as deployed or not deployed.
### Halo2-KZG, Deterministic Q16 Compute, and Attestation Gates

**The Gradient Papers — No. X**
Larry Klosowski, Lauren Mendenhall · Citrate Inc.
Preprint — not yet peer reviewed.

> **Maturity: [Implemented], with one feature-gate caveat.** Papers I–IX describe *what*
> Citrate does. This paper describes *how the on-chain verification of off-chain AI work is
> actually mechanized*. Every primitive here has code on the chain-40204 testnet; the one that
> is compiled out of the default build (the Halo2-KZG verifier, behind a cargo feature) is
> labelled as such, rather than presented as always-on.

## Abstract

We present the substrate that lets Citrate certify off-chain AI computation on-chain without
trusted custodians. It has four layers: **Q16.16 fixed-point arithmetic** giving
bit-deterministic numeric primitives identical across CPUs; a **tensor canonical wire format**
that fixes the byte layout crossing the contract/precompile boundary; a **Halo2-KZG
zero-knowledge verifier** whose structured reference string is a public Powers-of-Tau ceremony;
and **TEE attestation gates** that admit non-deterministic operations, such as large-model
inference, on signed hardware evidence rather than a proof. We situate this hybrid against the
2024–2026 verifiable-ML literature, which has produced practical zero-knowledge inference
systems (zkLLM, ZKML, zkGPT), optimistic fraud-proof designs (opML), and determinism-focused
verification (DiFR), and we argue that a chain needs both a proof path for small deterministic
work and an attestation path for large non-deterministic work. We anchor every layer to source
and give the honest status of each: the deterministic compute path and the on-chain attestation
registry are live; the Halo2-KZG verifier is real and tested but ships behind a cargo feature;
and full saturation-sound circuits and the production attestation implementation are scoped
follow-ups.

**Keywords:** verifiable inference, zero-knowledge machine learning, Halo2, KZG, TEE
attestation, fixed-point arithmetic, deterministic computation, precompiles

## 1. Introduction

A blockchain that hosts AI must answer a question ordinary chains never face: when a node
claims it ran a model and got an output, how does the network *check*? Papers I–IX describe the
surface, model registration, paraconsistent aggregation, mentorship, economics, governance. This
paper documents the substrate beneath that surface, the mechanical layer at which "Citrate has
verifiable inference" becomes a specific set of primitives a contract can call. A reader who
stops at Papers I–IX could leave believing in verifiable inference without knowing what the
verification consists of; if the substrate fails, every higher-level promise fails with it.

Verification faces a hard split. Some computation is small and deterministic enough to prove in
zero knowledge, a linear layer, a small classifier, where the network can demand a cryptographic
proof that the output follows from committed weights and inputs. Other computation, a 70-billion
parameter language-model forward pass, is far beyond practical proving time, and for it the only
tractable trust anchor today is hardware attestation: run the work inside a confidential VM and
have the hardware sign evidence of what ran. Citrate's substrate provides both paths and a
common numeric and wire-format foundation underneath them, so that a contract can choose the
trust model appropriate to the work rather than being forced into one.

**Status conventions.** As in the rest of the series: **[Implemented]** cites a source file or
deployed address; **[Feature-gated]** exists in code but is compiled out of the default build;
**[Specified]** is designed but unbuilt.

## 2. Related Work: the verifiable-ML landscape (2024–2026)

The April draft of this paper cited no academic prior art; this revision corrects that, because
the field it sits in has matured quickly and Citrate must be positioned against it.

**Zero-knowledge inference.** ZKML (Chen, Waiwitlikhit, Stoica, Kang, EuroSys 2024) [3] is an
optimizing compiler from ML computation to zero-knowledge circuits, and establishes the
practicality baseline for small-to-medium models. zkLLM (Sun, Li, Zhang, CCS 2024) [4]
introduces tlookup and a specialized zkAttn to bring a full large-language-model forward pass
into a proof, on the order of fifteen minutes for a Llama-2-13B inference. zkGPT (Qu et al.,
USENIX Security 2025) [5] drives GPT-2-scale proving down to tens of seconds; we note this
figure belongs to zkGPT and not to zkLLM, a distinction easy to blur. A 2025 survey [6]
organizes the space into training, test, and inference verification. Citrate's Halo2-KZG path
(Section 5) is in this lineage but deliberately scoped: it proves small deterministic layers
today and leans on attestation for anything large, rather than claiming to prove LLM inference.

**Optimistic and interactive alternatives.** opML (Conway et al., 2024) [7] replaces proofs
with fraud proofs: a result is assumed correct and challengeable, echoing optimistic rollups.
This is cheaper than zero knowledge and complements Citrate's optimistic inference tier
(Paper I §3.3), but its security depends on an honest challenger being online, and it does not
give the immediate cryptographic settlement a proof does.

**Determinism as a first-class problem.** DiFR (2025) [8] verifies inference despite
nondeterminism, which is precisely why Citrate's substrate begins with fixed-point arithmetic:
a proof or a cross-node re-execution is only meaningful if the computation is bit-reproducible
in the first place. Where DiFR tolerates nondeterminism at the verification layer, Citrate
eliminates it at the arithmetic layer for the deterministic path (Section 3), and confines
nondeterminism to the attestation path (Section 7).

**TEE-attested inference.** A growing line of work uses confidential computing to attest
generative inference, including optimistic TEE-rollup hybrids for blockchain settlement [9].
Citrate's attestation registry (Section 7) is in this family, pinning Microsoft Azure
Attestation and NVIDIA remote-attestation trust roots. The distinguishing choice is that
attestation gates *precompile dispatch*: a non-deterministic operation is not merely recorded as
attested, it is refused execution unless attestation succeeds.

Citrate's contribution is not a new proof system but the composition: one deterministic numeric
foundation, one wire format, a proof path for what can be proven, and an attestation path for
what cannot, all callable from ordinary EVM contracts.

## 3. Q16.16 fixed-point arithmetic [Implemented]

**Why fixed-point.** Floating point is non-deterministic across CPUs: ARM and x86 differ in
rounding modes, fused-multiply-add semantics, and extended-precision register widths. For a
zero-knowledge system to be sound, the result computed off-chain by the prover on real hardware
must be bit-identical to the result encoded as a witness in the circuit over a finite field.
Q16.16, a single `i32` carrying a sign, 15 integer bits, and 16 fractional bits, gives
bit-deterministic integer-only saturating arithmetic, roughly five decimal digits of dynamic
range (enough for forward inference of small networks), single-cycle add/subtract, and
two-cycle multiply with a 32-bit intermediate and no precision loss. The arithmetic lives in
`core/execution/src/precompiles/q16/ops.rs`, and cross-platform determinism is pinned by
fixtures at `tests/cross_platform/q16_determinism.rs`. A CI tripwire blocks any commit that
introduces `f32`/`f64` in the Q16 precompile tree, so the determinism property cannot silently
regress.

**The exp function.** The hardest deterministic operation is `exp(x)`, needed for softmax. The
substrate computes it by range reduction and Taylor series with wide intermediates:

```
q16_exp(x):
  1. Decompose x = k * ln(2) + r,  with |r| <= ln(2)/2
  2. Compute exp(r) via 7-term Taylor: 1 + r + r^2/2! + ... + r^7/7!
     using Q48 (i128) intermediates to preserve precision
  3. Multiply by 2^k via integer shift
  4. Saturate the result to the Q16 range
```

Worst-case error is at most 32 ULP across the entire Q16 range; after softmax normalization this
is sub-percent, comfortably inside the precision inference requires (`precompiles/q16/exp.rs`).

**Six compute precompiles.** The Q16 substrate exposes six operations at `0x010A`–`0x010F`
(`core/execution/src/precompiles/compute.rs`):

| Precompile | Operation | Cap |
|-----------|-----------|-----|
| `0x010A` Q16_MATMUL | C = A * B | m*n*p <= 2^20 |
| `0x010B` Q16_DOT | dot product | len <= 2^16 |
| `0x010C` Q16_SOFTMAX | numerically-stable softmax | len <= 1024 |
| `0x010D` Q16_RELU | max(0, x) elementwise | len <= 2^20 |
| `0x010E` Q16_LINEAR | y = Wx + b | out * in <= 2^18 |
| `0x010F` Q16_TRANSPOSE | matrix transpose | m*n <= 2^18 |

Each validates the dtype as Q16.16 and reverts on mismatch, and each performs
validate-before-allocate: caps are checked from the parsed header before any large allocation,
bounding memory consumption to the cap regardless of caller intent.

## 4. Tensor canonical wire format [Implemented]

A precompile and a Solidity contract must agree on byte layout before they can hash, verify, or
compute over a tensor. The canonical format is an 8-byte header (magic `0x54` = 'T', a version
byte, a dtype byte, a rank byte of at most 4, and reserved zero bytes), followed by the shape as
one little-endian `uint32` per dimension, followed by the packed data. The parser returns an
oversize error *before* allocation if the declared shape exceeds the per-precompile cap, which
is what makes the caps in Section 3 memory-safe rather than advisory. The format is
ABI-friendly: a Solidity `bytes calldata` holding canonical tensor bytes can be `keccak256`'d
for direct comparison or transmitted with `abi.encodePacked`, and a contract that needs to
remember a tensor stores a single hash rather than the tensor itself. Poseidon commitments over
this layout are produced by precompile `0x0107` (TENSOR_COMMIT) and Merkle inclusion is checked
by `0x0109` (MERKLE_VERIFY_TENSOR), both in `core/execution/src/precompiles/verify.rs`.

## 5. Halo2-KZG verifier substrate [Implemented, feature-gated]

**Why Halo2-KZG rather than a per-circuit trusted setup.** An earlier substrate used Groth16
with a per-circuit trusted setup; the current substrate uses Halo2-KZG with a public
Powers-of-Tau ceremony. The migration buys a universal setup (one ceremony serves all circuits),
native recursion via folding and accumulation, and the ability to change a circuit by
regenerating a verifying key rather than running a new trusted setup. The cost is on-chain
verification gas, a single SHPLONK pairing check is several times more expensive than Groth16,
which is acceptable here because inference proofs are submitted by sophisticated counterparties
and the transparency of a universal, publicly-audited setup outweighs the gas cost for a public
chain.

**Honest status.** The verifier is real code: `verify_inference_proof` at
`core/execution/src/zkp/halo2/mod.rs:199` uses `verify_proof_multi`, the KZG commitment scheme,
the SHPLONK verifier, and a Blake2b transcript, and it is exercised by tests including
`tests/inference_proof_verify_real_srs.rs`, `tests/porep_proof_verify_e2e.rs`, and
`tests/post_proof_verify_e2e.rs`. It is dispatched by precompile `0x0108`
(`verify.rs:118`). **But it is compiled behind the `halo2-substrate` cargo feature**; in the
default build, `0x0108` returns a discoverable "feature absent" error (`mod.rs:132`). This paper
states that plainly: proving and verifying are implemented and tested, and off by default. A
deployment that needs on-chain KZG verification enables the feature; one that relies on the
attestation path does not.

**The inference circuit.** The v1 `InferenceCircuit` exposes three public inputs, a Poseidon
commitment to the input vector, a Poseidon commitment to the flattened weights and bias, and a
Poseidon commitment to the output, and privately witnesses the Q16 weights, inputs, and biases.
Its constraints enforce that the output equals the linear layer applied to the witnessed weights
and inputs, and that each public commitment equals the Poseidon hash of the corresponding cells,
bound via copy constraints so a malicious prover cannot feed different values to the hash than to
the arithmetic. The circuit is composed from a Poseidon chip and a linear chip
(`core/execution/src/zkp/halo2/circuits.rs`, `chips.rs`). The v1 dimensions are small
(`out_dim=1, in_dim=2`); larger sizes are configuration-only changes to the witness vectors and
the keygen parameter, since the circuit logic is already general.

**Soundness sketch and a v1 limitation.** The circuit reduces "I ran the linear layer correctly"
to a SHPLONK pairing check whose soundness inherits from Halo2-KZG knowledge soundness under the
discrete-log assumption and the secrecy of the Powers-of-Tau setup, from the Poseidon chip
matching the off-chain hash byte-for-byte (round-trip tested), and from the linear chip's gate
equations matching Q16 overflow semantics over the field. A full cryptographic soundness proof is
deferred to the underlying Halo2 and KZG literature; a state-machine-level property (verifier
version monotonicity) is model-checked in TLA+. One honest limitation: the linear chip does not
yet enforce Q16 saturation in-circuit, so the v1 off-chain witness contract is that inputs stay
in range, and the application layer must enforce ranges before submitting proofs. Full
saturation soundness via in-circuit lookup range checks is a scoped follow-up.

## 6. Structured reference string resolution [Implemented]

The structured reference string is loaded from a `.ptau` file named by the `CITRATE_PTAU_PATH`
environment variable. The loader (`core/execution/src/zkp/halo2/ptau.rs`) hash-verifies the file
against an embedded expected SHA-256 for the k=18 ceremony before parsing, so a tampered or
wrong file is rejected fail-closed. If the variable is unset, the verifier falls back to a
deterministic setup with a hardcoded seed; this is reproducible across nodes but cryptographically
insecure (the toxic waste is reproducible) and is for development and test only. The production
runbook covers acquisition of the real ceremony file and its hash verification.

## 7. TEE attestation gates [Implemented registry; Specified precompile gate]

**The non-determinism problem.** Some operations cannot be proven in zero knowledge at any
practical cost, a large-model forward pass being the canonical example. For these the substrate
offers hardware attestation: a worker runs the inference inside a confidential VM (Azure
confidential GPU VMs with NVIDIA H100 support under the current target), the hardware produces an
attestation token combining a Microsoft Azure Attestation JWT with NVIDIA remote-attestation
evidence, and an on-chain registry verifies the token against pinned trust roots.

**What is deployed.** The `TEEAttestationRegistry` contract is deployed on chain 40204 at
`0x4df26aae3619f449a142d237ed818ebf7c186ed5` (the April draft listed an earlier address; this is
the current one). It implements attestation submission (`submitAttestation`,
`submitAttestationStrictBound`), lookup (`isAttested`, `getAttestation`), a dispute path for
serving expired attestations (`reportExpiredServe`, `finalizeReport`), governance of the MAA and
NRAS signer trust roots and MAA RSA keys, and a strict-cryptographic-mode switch. It is consumed
on-chain by `ComputePoolPipeline.sol` and `ComputeVerifier.sol`. So the on-chain attestation
state machine is real and live.

**What is still gated.** On the precompile side, the non-deterministic inference operations
(`0x0101`, `0x0102`) gate their dispatch on attestation, and in the default production build the
gate is fail-closed: a `AlwaysReject` attestation gate is the shipped default, and a full
Microsoft Azure Attestation plus NVIDIA remote-attestation implementation of the gate is the
scoped follow-up. The gate is pre-deployed precisely so that when the production implementation
ships it is a swap-in rather than an architectural change: contracts already using the
gate-checked precompiles keep working, the gate simply stops always-rejecting, and the chain
stays running while attestation is upgraded with no contract redeployment. A CI tripwire ensures
any new non-deterministic operation declares its attestation requirement.

## 8. End-to-end verifiable inference flow

The layers compose into a complete flow. Off-chain, a provider runs inference inside a TEE and
obtains the input/output pair plus an attestation token. On-chain, the provider posts the pair
to the inference router, which calls `TEEAttestationRegistry` to verify the token; on success the
tuple is settled and paid. Optionally, for small deterministic layers, the provider also
generates a Halo2-KZG proof that the output matches the committed weights and the contract calls
`0x0108` to verify it (with the `halo2-substrate` feature enabled). Optionally, a contract calls
the `0x010A`–`0x010F` Q16 compute precompiles for arbitrary deterministic post-processing. The
deterministic compute path and the on-chain attestation registry are live today on testnet
40204; the production MAA+NRAS gate implementation is the remaining piece for the fully
non-deterministic path.

## 9. Implementation reality check

| Component | Status | Anchor |
|-----------|--------|--------|
| Q16 arithmetic + exp | Implemented | `precompiles/q16/{ops,exp}.rs` |
| 6 Q16 compute precompiles (0x010A–0x010F) | Implemented, live | `precompiles/compute.rs` |
| Tensor canonical wire format | Implemented | `precompiles/verify.rs`, format parser |
| Poseidon commit / Merkle verify (0x0107/0x0109) | Implemented | `precompiles/verify.rs` |
| Halo2-KZG verifier (0x0108) | Implemented, **feature-gated `halo2-substrate`** | `zkp/halo2/mod.rs:199` (real), `:132` (stub) |
| InferenceCircuit v1 | Implemented | `zkp/halo2/circuits.rs` |
| PPoT k=18 SRS loader (hash-verified) | Implemented | `zkp/halo2/ptau.rs` |
| TEEAttestationRegistry (on-chain) | Implemented, deployed | `0x4df26aae…`; `TEEAttestationRegistry.sol` |
| Precompile attestation gate (0x0101/0x0102) | Fail-closed default; production impl Specified | `precompiles/inference.rs` |
| In-circuit Q16 saturation lookups | Specified | future sprint |
| TLA+ specs (verifier monotonic, Q16 determinism, attestation) | Verified | `specs/tla/{zk,compute}/` |

## 9b. Threat model and trust boundaries

It is worth stating plainly what each path does and does not protect against, because the two
paths have different trust boundaries and conflating them is the easiest way to overclaim.

**The deterministic proof path (Q16 + Halo2-KZG).** Here the trusted base is cryptographic and
minimal: the discrete-log assumption, the secrecy of at least one honest contributor to the
Powers-of-Tau ceremony, and the correctness of the verifier code. A prover cannot make the
verifier accept an output that does not follow from the committed weights and inputs without
breaking one of these, and the cell-binding copy constraints close the specific gap where a
prover might hash one set of values while computing on another. The residual risks are concrete
and named: the v1 circuit does not enforce Q16 saturation in-circuit, so an out-of-range input
is a soundness gap the application layer must exclude until the lookup-based range checks land;
and because the verifier is feature-gated, a deployment that forgets to enable `halo2-substrate`
gets a fail-closed "feature absent" rather than a silent accept, which is the safe failure but
still a configuration hazard the runbook must cover. The proof path does not protect against a
wrong *model* being committed; it proves computation over whatever weights were committed, so
model provenance (Paper I's registry) is a separate and necessary control.

**The attestation path (TEE + registry).** Here the trusted base is larger and hardware-rooted:
the confidential-VM manufacturer, the attestation services whose roots are pinned in the
registry, and the assumption that the enclave was not physically compromised. This is a
strictly weaker guarantee than a proof, and the substrate treats it that way, it is offered only
for computation that cannot be proven at practical cost, and it is gated rather than assumed.
The registry's dispute path (`reportExpiredServe`/`finalizeReport`) exists because attestation
tokens expire and a provider might serve stale evidence; the strict-cryptographic-mode switch
exists so an operator can require full signature verification rather than trusting a softer
check. The honest characterization is that the attestation path moves trust from "the provider's
word" to "the provider's hardware and its attestation roots," which is a large improvement over
an unverified oracle but is not the custodian-free guarantee the proof path provides.

**Why both.** A chain that offered only proofs could not host large-model inference at all; a
chain that offered only attestation would be custodial for its most valuable operations. The
substrate's position is that the trust model should match the computation: prove what is
provable, attest what is not, and never present the second as the first. The end-to-end flow of
Section 8 lets a single application use both, a proven deterministic post-processing step over an
attested large-model output, so the trust boundary is drawn as tightly as the work allows.

## 10. Conclusion

The substrate is the mechanical foundation the rest of the series rests on. Its deterministic
numeric layer makes proofs and cross-node re-execution meaningful; its wire format lets contracts
and precompiles agree on tensors; its Halo2-KZG path proves small deterministic computation
against a public setup; and its attestation gates admit the large non-deterministic computation
that no proof system can yet reach, refusing it unless the hardware evidence checks out. We have
been explicit about the seams: the KZG verifier is real but ships behind a feature, the
attestation registry is deployed while the production precompile-side gate is a scoped swap-in,
and saturation-sound circuits are a follow-up. A chain that hosts AI needs both a proof path and
an attestation path, and it needs to be honest about which parts of each are live. This paper is
that account.

## Acknowledgments

Drafting and literature triage were assisted by AI systems; all mechanical claims were verified
by the authors against the referenced source files and the deployed contract on chain 40204. This
work received no external funding.

## References

[1] Bowe, S., Grigg, J., Hopwood, D. (2019). Halo: recursive proof composition without a trusted setup. *IACR ePrint 2019/1021.*
[2] Boneh, D., Bonneau, J., Bünz, B., Fisch, B. (2018). Verifiable delay functions. *CRYPTO.*
[3] Chen, B.-J., Waiwitlikhit, S., Stoica, I., Kang, D. (2024). ZKML: an optimizing system for ML inference in zero-knowledge proofs. *EuroSys.*
[4] Sun, H., Li, J., Zhang, H. (2024). zkLLM: zero-knowledge proofs for large language models. *ACM CCS*; arXiv:2404.16109.
[5] Qu, W., et al. (2025). zkGPT: an efficient non-interactive zero-knowledge proof framework for LLM inference. *USENIX Security.* (Source of the tens-of-seconds GPT-2 proving figure.)
[6] Peng, Z., Wang, T., et al. (2025). A survey of zero-knowledge proof based verifiable machine learning. arXiv:2502.18535.
[7] Conway, K. D., et al. (2024). opML: optimistic machine learning on blockchain. arXiv:2401.17555.
[8] (2025). DiFR: inference verification despite nondeterminism. arXiv:2511.20621. *(Verify author list before final submission.)*
[9] (2025). Optimistic TEE-rollups: a hybrid architecture for scalable and verifiable generative AI inference on blockchain. arXiv:2512.20176. *(Verify author list before final submission.)*
[10] Microsoft Azure Attestation. Product documentation.
[11] NVIDIA. Confidential computing and H100 remote attestation (NRAS). Product documentation.
[12] Grassi, L., Khovratovich, D., Rechberger, C., Roy, A., Schofnegger, M. (2021). Poseidon: a new hash function for zero-knowledge proof systems. *USENIX Security.*

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
