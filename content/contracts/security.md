---
title: Security & Slashing Contracts
codex_slug: /contracts/security
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/{KYCRegistry,TEEAttestationRegistry,NematocystSlashing}.sol, contracts/src/interfaces/INematocystSlashing.sol
surfaces: [SC-sec-slashing, SC-sec-kyc, SC-sec-tee]
audited_against_sha: 54d1f2c
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The security surface is where the network enforces who may participate and what happens when a participant
misbehaves. Three contracts carry it: a verification registry that records whether an account passed
identity review, an attestation registry that records whether a worker is running in a trusted execution
environment, and a graduated slashing model that penalizes staked providers. This page is for protocol
researchers, node operators, and compute providers.

## What it is

Two of these contracts gate participation, and one punishes it. `KYCRegistry` holds the result of an
identity check, a single boolean per account, mirrored from the off-chain identity authority. The personal
data behind the check never reaches the ledger; only the verification outcome does. `TEEAttestationRegistry`
holds, per worker, whether that worker has a fresh attestation that its hardware is running in a trusted
execution environment. `NematocystSlashing` takes the staked SALT of a provider and reduces it when the
provider is shown to have misbehaved, with the penalty scaled by how severe the fault is and by how many
providers failed at once.

| Contract | Role | Status |
|---|---|---|
| `KYCRegistry` | Mirror of a revocable, data-free identity claim, an anti-Sybil gate | Implemented, pre-audit |
| `TEEAttestationRegistry` | Per-worker trusted-execution attestation state | Implemented, pre-audit |
| `NematocystSlashing` | Graduated three-tier provider slashing with a correlation multiplier | Implemented, pre-audit |
| `INematocystSlashing` | Minimal calling interface for the slashing contract | Implemented, interface only |

The slashing model is named for the nematocyst, the stinging cell of a cnidarian. The name is academic in
origin, but the contract is real and runs; only the minimal `INematocystSlashing` interface is interface
only, and it exists so other contracts can call `slash` without importing the full implementation.

## How to use it

1. **Read an identity result.** Call `KYCRegistry.isVerified(account)`. A gating contract, for example the
   pinning incentive contract, calls this before it lets an account take a rewarded slot. To learn the
   stable identity an account resolves to, call `identityOf(account)`; two accounts that return the same
   non-zero value belong to the same person.
2. **Check a worker's attestation.** Call `TEEAttestationRegistry.isAttested(worker, currentBlock)`. It
   returns true only when the worker has a fresh, non-slashed attestation that has not expired at that
   block. A pipeline contract calls this before it routes confidential inference to the worker.
3. **Stake as a provider.** Call `NematocystSlashing.stake()` with at least `MIN_STAKE`, which is 100 SALT,
   to become a slashable provider. Call `unstake()` to withdraw the full stake and deregister, which is
   refused if the account has been banned.
4. **Apply a slash.** Only governance calls `slash(provider, tier, evidence)`. The penalty is a fixed
   fraction of the stake for the tier, scaled up by the correlation multiplier when many providers are
   slashed in the same window.

## Reference

The audited surface, each item citing its source file under `contracts/src/`.

### KYCRegistry

Source: `contracts/src/KYCRegistry.sol`. A deliberately small contract built on `AccessControl`. It mirrors
the off-chain identity authority's `kyc` claim by holding one boolean per account and, separately, the
stable identity hash that account resolves to. It holds no value and no personal data; the off-chain claim
is issued over the identity provider's userinfo endpoint, and only the outcome is mirrored here.

Two roles govern it: `DEFAULT_ADMIN_ROLE`, the deployer, manages updaters, and `KYC_UPDATER_ROLE`, held by
the identity authority key or a KYC oracle relay, sets and revokes verification.

| Function | Access | What it does |
|---|---|---|
| `setVerified(account)` | `KYC_UPDATER_ROLE` | Marks an account verified; binds a self identity if none is set yet |
| `setVerifiedWithIdentity(account, subHash)` | `KYC_UPDATER_ROLE` | Verifies and binds the account to a real identity hash |
| `revoke(account)` | `KYC_UPDATER_ROLE` | Clears verification; leaves the identity binding intact |
| `isVerified(account)` | view | Returns the current verification boolean |
| `identityOf(account)` | view | Returns the bound identity hash, or zero if unbound |

Until the identity provider issues real subject and account claims, `setVerified` binds each account to its
own identity, a hash of `"PIN-self"` and the address, so per-account verification is unchanged and the
Sybil binding is a safe no-op. When real claims arrive, the authority calls `setVerifiedWithIdentity` and
the binding becomes meaningful: two accounts under the same identity hash are the same person. Events:
`KYCVerified`, `KYCRevoked`, `IdentityBound`.

### TEEAttestationRegistry

Source: `contracts/src/TEEAttestationRegistry.sol`. Stores, per worker, an attestation record proving the
worker runs inside a trusted execution environment, for confidential pipeline-parallel inference. A complete
attestation is an Azure MAA token at the VM level plus an NVIDIA NRAS claim at the GPU level. It inherits
`ReentrancyGuard` and `Governable`, and its state machine mirrors the `PipelineParallelTEE.tla` spec:
not attested, attested, expired, then slashed as an absorbing terminal state.

There are two submission paths. The older governance-trusted path, `submitAttestation`, takes
measurement hashes and trusts that they came from pre-approved signers. The cryptographic path,
`submitAttestationStrictBound`, takes the raw MAA token, its signature, and the literal claim bytes; it
verifies the RS256 signature on chain against a governance-published RSA key and verifies that the claim
bytes appear literally inside the token payload, so the on-chain measurement is bound to real token content.
The NRAS side remains governance-trusted, pending a P-384 verification primitive.

| Function | Access | What it does |
|---|---|---|
| `submitAttestation(...)` | open, gated by `strictCryptographicMode` | V1 path; reverts when strict mode is on |
| `submitAttestationStrictBound(...)` | open | V2 path; on-chain RS256 verify plus literal claim binding |
| `isAttested(worker, currentBlock)` | view | True only for a fresh, non-slashed, unexpired record |
| `getAttestation(worker)` | view | Returns the full attestation record |
| `reportExpiredServe(...)` | open, posts bond | Files a claim that a worker served past expiry |
| `finalizeReport(reportId, uphold, stake)` | `onlyGovernance` | Adjudicates a report; slashes on uphold |
| `proposeMaaRsaKey / finalizeMaaRsaKey` | `onlyGovernance`, then open | Timelocked install of an RSA key |
| `setMaaRsaKeyActive(kidHash, active)` | `onlyGovernance` | Single-step activate or deactivate |
| `setStrictCryptographicMode(enabled)` | `onlyGovernance` | Switches the V1 path on or off |

Key constants: `ATTESTATION_LIFETIME_BLOCKS` is 28,800, roughly four hours; `SLASH_BPS` is 1,000, ten
percent; `REPORT_BOND` is 1 SALT; `RSA_KEY_TIMELOCK_BLOCKS` is 3,600. `strictCryptographicMode` defaults to
true, so a fresh deployment is in the cryptographic path unless governance explicitly opts out.

### NematocystSlashing

Source: `contracts/src/NematocystSlashing.sol`. The graduated slashing model, inheriting `ReentrancyGuard`
and `Governable`. It maps three severities of provider misbehavior onto three tiers, each with a fixed
penalty in basis points of the provider's stake.

| Tier | `SlashTier` | Fault | Base penalty |
|---|---|---|---|
| 1 | `Latency` | Missed checkpoints or latency faults | `LATENCY_PENALTY_BPS` = 500 (5%) |
| 2 | `Inconsistency` | Inconsistent results | `INCONSISTENCY_PENALTY_BPS` = 2000 (20%) |
| 3 | `Byzantine` | Equivocation or double-signing | `BYZANTINE_PENALTY_BPS` = 10000 (100%) plus a permanent ban |

A `Byzantine` slash sets `banned[provider]` to true, forfeits any remaining stake, and emits `Banned`. A
banned provider can never re-stake. The novel part of the design is the correlation multiplier, taken from
Ethereum slashing research: penalties scale up when many providers are slashed in the same window, so
coordinated failures cost far more than isolated ones.

```text
multiplier = clamp( slashedInWindow * 30 / totalProviders, 1x, 3x )
```

It is computed in `getCorrelationMultiplier`, with all arithmetic scaled by `1e18`. `CORRELATION_WINDOW`
is 50 blocks; the per-block slash counter is summed across the window. The multiplier floors at 1x, so a
penalty is never reduced below its base, and caps at 3x. When there are no providers it is 1x.

A slash, step by step, in `slash(provider, tier, evidence)`, which is `onlyGovernance`:

1. Require non-empty evidence and an un-banned, currently staked provider.
2. Record the slash for correlation tracking.
3. Compute the raw penalty as stake times the tier basis points, then multiply by the correlation
   multiplier, capped at the full stake.
4. Deduct the penalty; for `Byzantine`, also forfeit the remainder and ban.
5. Emit `Slashed` with the provider, tier, amount, and multiplier.

Staking surface: `stake()`, `payable` and `nonReentrant`; `unstake()`, `nonReentrant`; and the views
`isSlashable`, `slashesInWindow`, `getCorrelationMultiplier`, plus the public mappings `stakes` and
`banned` and the counter `totalProviders`. Events: `Staked`, `Unstaked`, `Slashed`, `Banned`.

`INematocystSlashing`, at `contracts/src/interfaces/INematocystSlashing.sol`, is the minimal interface that
`DisputeResolution` and other callers use. It declares one method, `slash(address, uint8, bytes)`, so a
caller does not need the full implementation to trigger a penalty.

## Design rationale

Slashing is graduated rather than flat because the faults are not equal. A slow provider is an annoyance; a
provider serving inconsistent results is a correctness problem; a provider double-signing is an attack. A
single penalty for all three would either be too soft for the attack or too harsh for the slowness, so the
penalty tracks the severity. The correlation multiplier exists because the dangerous failure is the
correlated one: a single bad node is noise, but many nodes failing in one window suggests a coordinated
problem, and the cost should rise to match. The floor at 1x means an isolated fault is never discounted.

Attestation defaults to the cryptographic path because the safe default is the one that does not trust the
caller's word. The earlier governance-trusted path is kept only as an explicit, reversible opt-out for a
staged cutover. The RSA key install is timelocked so that even a one-block compromise of governance cannot
install a malicious signing key, while deactivating a key stays single-step so a compromised key can be
killed at once.

## Failure modes

- **Expired attestation.** A worker that serves past its attestation expiry can be reported with
  `reportExpiredServe`, and governance slashes it on uphold. The reporter's bond is returned whether the
  report is upheld or rejected, because under-reporting is the greater risk here.
- **Token replay.** Each MAA token signature is consumed once, tracked by its hash. Re-submitting the same
  token reverts, so a valid token cannot be replayed by the same or another worker.
- **Governance compromise on keys.** Installing an RSA signing key is timelocked, giving off-chain monitors
  a window to observe and abort, so a brief governance hijack cannot immediately accept forged attestations.
- **Banned provider re-entry.** A `Byzantine` slash bans the provider permanently; `stake` refuses a banned
  sender, so a fully slashed attacker cannot quietly rejoin.
- **Identity revocation.** A revoked KYC claim flips `isVerified` to false at once while leaving the
  identity binding intact, so a gating contract sees the revocation immediately and re-verification keeps
  the same person identity.

## Access and canon

Tier: commercial. These contracts carry the network's identity and attestation machinery, whose internals
would help a competitor, so the full detail is served to contracted and verified principals rather than
published openly. There are no secrets here, no keys, no credentials, and no private endpoints. Any deployed
addresses are public on-chain data and are verifiable with `eth_getCode`.

This surface ties to the rest of Atlas at three points. The identity result `KYCRegistry` holds comes from
the VERI identity check that gates every account on the public network, covered under [accounts and
identity](/aa); Citrate keeps the verification result, not the personal data. The compliance posture these
gates serve, FERPA, HIPAA, SOC 2, and the rest by deployment context, is covered under
[enterprise](/enterprise). Slashing and finality as consensus concerns are covered under [Citrate Network
consensus](/chain/consensus).

## Source and verification

- Source repo: `citrate-chain`, files under `contracts/src/`: `KYCRegistry.sol`,
  `TEEAttestationRegistry.sol`, `NematocystSlashing.sol`, and `interfaces/INematocystSlashing.sol`, plus
  `contracts/src/lib/Governable.sol` for the ownership mixin.
- Audited against `citrate-chain` SHA `54d1f2c`.
- Status by contract: `KYCRegistry` Implemented, pre-audit; `TEEAttestationRegistry` Implemented, pre-audit,
  state machine specified against `PipelineParallelTEE.tla`; `NematocystSlashing` Implemented, pre-audit;
  `INematocystSlashing` Implemented as an interface only. None has completed a final third-party audit.
  Verify deployed bytecode yourself with `eth_getCode` once addresses are published.
