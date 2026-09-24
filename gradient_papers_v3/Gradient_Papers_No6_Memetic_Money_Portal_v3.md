---
title: "The Memetic Money Portal: Separating the Liquidity Instrument from the Gas Token"
subtitle: "From an NFT Bridge-as-Fundraise Proposal to an Implemented Wrapped-Token and Market-Maker Money-Path"
series: "The Gradient Papers — No. VI"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Partially Implemented
supersedes: "v2 (February 2026), v3-April draft"
---

# The Memetic Money Portal
### Separating the Liquidity Instrument from the Gas Token
#### From an NFT Bridge-as-Fundraise Proposal to an Implemented Wrapped-Token and Market-Maker Money-Path

**The Gradient Papers — No. VI**
Larry Klosowski, Lauren Mendenhall · Citrate Inc.
Preprint — not yet peer reviewed.

> **Maturity: [Partially Implemented], and a design that shifted.** This paper has changed more
> than any other in the series between v2 and v3. The February 2026 draft proposed a specific
> mechanism, an ERC-6551 NFT "bridge-as-fundraise" called $SNAP, that was **never deployed**. This
> revision keeps the durable thesis (separate the instrument that raises liquidity from the gas
> token) and replaces the unbuilt bridge with the money-path that Citrate actually implemented: a
> wrapped SALT token with gasless authorization transfers, a contracted market-maker allocation,
> and an on-chain SALT/USD price feed. We say plainly what was proposed, what was built, and what
> is still pending.

## Abstract

Traditional blockchain fundraising creates a structural misalignment: tokens sold to raise capital
face immediate sell pressure, diluting the network's economic foundation before it can build value.
This paper's durable claim is that the instrument used to bootstrap external liquidity should be
*separate* from the native gas token, so that raising and liquidity-provision do not dilute the
utility asset. The February 2026 draft realized that separation through $SNAP, ERC-721 NFTs with
ERC-6551 Token Bound Accounts serving simultaneously as fundraising instruments, bridge nodes, and
ownership positions. That NFT bridge was specified and partially deployed to a testnet but never
carried to production, and it is not the mechanism Citrate runs. This revision documents the
implemented money-path: **WrappedSALT**, an ERC-20 wrapper over native SALT supporting EIP-3009
gasless authorization transfers; **MarketMakerAllocation**, a governable vault that funds a
contracted market-maker; and **ComputePricingOracle**, which carries an on-chain SALT/USD price. We
present both, the design that shifted and the mechanism that exists, and we keep the memetic-money
framing as a philosophy rather than a prediction. In keeping with Citrate Inc.'s
public-communication policy, this paper makes no claim of day-one cash earnings and treats SALT's
availability on a licensed exchange as pending.

**Keywords:** wrapped token, EIP-3009, gasless transfer, market maker, price oracle, decentralized
liquidity, memetic finance, token economics, Citrate Network

## 1. Introduction: the ICO paradox

Every network faces the same bootstrapping problem: it needs capital to build infrastructure, but
selling its native token to raise capital creates sell pressure that undermines the token's economic
foundation. ICOs, IDOs, and venture rounds all involve selling or diluting the gas token, so the
network's economic base is weakened before it has demonstrated value, and speculative holders exit
precisely when the network needs momentum.

The durable thesis of this paper is a structural response: separate the instrument that bootstraps
external liquidity from the gas token entirely. Citrate's native gas token SALT (Paper I §5) should
not be the thing sold to raise or seed liquidity; a distinct mechanism should carry SALT to external
markets and provide the liquidity a two-sided market needs, while SALT itself remains a utility
asset. Everything else in this paper is a question of *which* mechanism realizes that separation, and
that is exactly where the design changed.

## 2. The design that shifted: $SNAP as an NFT bridge-as-fundraise (February 2026, not deployed)

**[Superseded, not deployed to production]** The February 2026 proposal realized the separation
through $SNAP: ERC-721 NFTs whose ERC-6551 Token Bound Accounts held a dual-zone vault, a
user-accessible zone for the holder's fee revenue and a protocol-managed zone holding locked ETH
collateral that backed cross-chain transfers. Each NFT was to be a bridge node; a per-wallet bonding
curve discouraged whale dominance; Chainlink oracle nodes operated by holders formed the attestation
layer; and the ETH committed at mint became bridge liquidity, so that "the fundraise is the bridge."
A reference implementation was deployed to an Ethereum testnet.

The design was intellectually appealing for reasons worth recording, because they explain what the
replacement had to preserve. The dual-zone vault solved a real problem: it let a contributor retain
ownership of and withdraw their fee revenue (the user zone) while the collateral backing transfers
(the protocol zone) stayed locked behind a timelock and governance, so holders could not drain the
liquidity that made the instrument useful. The per-wallet bonding curve, where a wallet's successive
mints grew progressively more expensive, was an attempt to discourage whale dominance and reward
early conviction without a central allocator. And making each NFT a bridge node meant the act of
investing was the act of building capacity. These are genuine design virtues, and any replacement had
to keep the core of them: separate the roles of "raise/seed liquidity" and "spend gas," and keep the
liquidity base stable.

We record the design here because honesty about the series' evolution requires it, and because the
thesis it embodied survives, but we are explicit: **no SNAP/SALT lock-mint bridge contract exists on
the Citrate chain-40204 deployment.** The `CitrateBridgeNFT` / `DualVault6551` / `BridgeRouter`
contracts were never carried to production, the AngelList SPV and Delaware C-Corp operating structure
described in the draft is not the vehicle for this work, and cross-chain bridges, being among the
most attacked primitives in the space (Ronin ~$625M, Wormhole ~$325M, Nomad ~$190M), are precisely
the kind of surface a small team should hesitate to ship without a very strong reason. The per-wallet
bonding curve also never solved Sybil resistance on its own, a coordinated actor could mint once from
many wallets at the base price, so its whale-resistance depended on an off-chain identity layer the
draft acknowledged it lacked. Weighed together, the bridge's attack surface and the instrument's
unresolved Sybil problem argued for a simpler mechanism. Section 3 documents the one that was built.

## 3. What was actually built: the implemented money-path

The separation thesis is realized on chain 40204 by three deployed contracts, none of which is a
lock-mint bridge.

**3.1 WrappedSALT (EIP-3009 gasless transfer).** **[Implemented, deployed `0xaa918302…`]**
`WrappedSALT.sol` is an ERC-20 wrapper over native SALT implementing the EIP-3009
transfer-with-authorization flow: `transferWithAuthorization`, a fee-bearing
`transferWithFeeAuthorization`, `receiveWithAuthorization`, `cancelAuthorization`, and
`authorizationState`, with a signature-malleability guard (`_recoverCanonical`). This is the
"portal" in its concrete form: a user signs an authorization off-chain, and a relayer or
counterparty submits it, so SALT can move to and be used by external tooling without the holder
needing native gas in hand. Where the February design imagined an NFT-vault bridge, the implemented
onramp is a standard, auditable wrapped token with gasless authorization, the same EIP-3009 pattern
used by production stablecoins, plus native `x402` payment-authorization precompiles (`0x0200`,
`0x0201`) for the verification path.

**3.2 MarketMakerAllocation (contracted market maker).** **[Implemented, deployed `0xa87fae5c…`]**
Rather than crowd-sourcing bridge liquidity from NFT holders, Citrate funds a *contracted*
market-maker. `MarketMakerAllocation.sol` is a `Governable` vault that accumulates native SALT (via a
receive fallback), and exposes `withdraw`/`withdrawAll`, `changeMarketMaker`, `changeAllocationRate`,
and `calculateAllocation`. The market-maker relationship, and its allocation rate, are governance
parameters, not a bonding curve. This is the recast the series index anticipated: a contracted
full-time market-maker model in place of the NFT-node model.

**3.3 ComputePricingOracle (SALT/USD).** **[Implemented, deployed `0xdcebd5ec…`]** There is no
standalone "SaltUsdOracle"; the SALT/USD reference lives in `ComputePricingOracle.sol`, which carries
`saltPriceUsdCents` and a rate-limited `proposeSaltPrice` update path (with a commit nonce and
`SaltPriceProposed`/`SaltPriceUpdated` events). This is the price reference the allocation and
compute-pricing logic read; it is an operator-proposed feed with rate limiting, not a
decentralized-oracle network, and we describe it as such.

**3.4 The end-to-end money-path.** The three contracts compose into a concrete flow that plays the
role the February design assigned to the bridge. A holder who wants to move SALT into external
tooling wraps native SALT into WrappedSALT and signs an EIP-3009 authorization; a relayer or
counterparty submits the authorization on-chain, so the transfer settles without the holder paying
native gas, and the `x402` precompiles verify the authorization on the payment path. On the
market-making side, the treasury funds `MarketMakerAllocation` with SALT at a governance-set
allocation rate, the contracted market-maker draws against that allocation to quote two-sided
liquidity on venues, and `ComputePricingOracle` supplies the SALT/USD reference the allocation and
compute-pricing logic read. The separation the thesis demands is preserved: SALT reaches external
markets and a two-sided market is seeded without SALT being sold in a fundraise, and the liquidity
base is stable because it is a governed allocation rather than a crowd of individually withdrawable
vaults. The difference from the February design is that the stability now comes from a contracted
relationship under governance control, not from a timelocked NFT vault, and the whale-resistance
question is moot because there is no public mint to game. What the wrapped-token path gives up
relative to the NFT design is the "every holder is an operator" ownership story; that ownership logic
now lives in the cooperative accounting of Paper VII rather than in bridge nodes.

## 4. Security considerations

The shift in mechanism also shifts the threat model, mostly in a favorable direction. **Bridge
risk is largely avoided:** because there is no lock-mint bridge holding pooled collateral, the
catastrophic bridge-exploit surface that dominated the February design (and the industry's loss
record) is simply not present. **The residual risks are different and named.** The wrapped-token
path inherits ERC-20 and EIP-3009 risks, replay and authorization-reuse, which the implemented
`cancelAuthorization`/`authorizationState` and the canonical-signature recovery are there to bound,
and it should still be third-party audited before any mainnet reliance. The market-maker path
introduces a *trust* dependency: `MarketMakerAllocation` funds a contracted counterparty, and the
governance controls (`changeMarketMaker`, `changeAllocationRate`) are the only checks on that
relationship, so their timelock and quorum matter. The price feed is operator-proposed and
rate-limited, which is honest to state: it is not manipulation-proof the way a deep decentralized
oracle would be, and downstream logic should treat it accordingly. Two specifics are worth stating because they are the failure modes a reviewer will look for first.
On the wrapped-token side, EIP-3009 authorizations are single-use nonced messages: each carries a
unique nonce whose consumption is recorded in `authorizationState`, so a submitted authorization
cannot be replayed, and a holder who signed one they no longer want executed can burn it via
`cancelAuthorization` before a relayer submits it. The malleability guard matters here too, because
without canonical-signature recovery an attacker could reshape a valid signature into a second
distinct-looking authorization; `_recoverCanonical` closes that. On the market-maker side, the honest
statement is that `MarketMakerAllocation` concentrates trust in a contracted counterparty: the vault
can be drained up to its allocation by whoever holds the market-maker role, so the safety of the
arrangement reduces to the safety of `changeMarketMaker` and `changeAllocationRate`, which are the
governance levers that appoint and bound that counterparty. Those levers should carry the same
timelock and quorum as any treasury action (Paper VIII), and their event log is the audit trail a
holder uses to verify the market-maker has not been changed without notice. As with every contract in
the series, none of this substitutes for a professional audit, which remains a precondition for
mainnet.

## 5. The memetic thesis

The name "Memetic Money Portal" is deliberate, and survives the mechanism change. In traditional
finance, a monetary instrument's value derives from institutional backing; in cryptocurrency, much
of it derives from narrative propagation. The meme-coin phenomenon showed that cultural resonance can
bootstrap real economic networks, though meme coins typically lack utility beyond speculation. The
portal's aspiration is to couple narrative and utility: the instrument that spreads culturally is
also the instrument that does useful work, moving value and seeding liquidity. **Honest boundaries:**
this depends on achieving cultural resonance, which is not an engineering variable and cannot be
specified or guaranteed. We present the memetic thesis as a design philosophy, not a prediction, and
we note it is even more clearly a philosophy now that the mechanism is a wrapped token and a
market-maker rather than a collectible NFT.

## 6. Compliance and honest boundaries

This paper is written under Citrate Inc.'s public-communication policy, and two constraints apply
directly. First, **no day-one cash earnings** are claimed from holding SALT, providing liquidity, or
operating any part of this money-path; SALT is a utility and staking asset, cash convertibility is
gated on mainnet and on audit, and any yield is a staked-grant construct, not a cash promise.
Second, **SALT's availability on a licensed exchange is pending**, so nothing here should be read as
a listing commitment or a solicitation. The February draft's fundraise targets, hard caps, and SPV
structure are not carried forward; the implemented money-path is infrastructure, not an offering.

## 7. Relationship to the Gradient Papers Series

Paper I defines SALT tokenomics (1 trillion supply, distribution, staking minimums); the Memetic Money Portal
provides the mechanism by which SALT reaches external markets without being sold in a fundraise.
Paper VII (Mozi Cooperative) provides the economic philosophy of contribution-proportional
ownership; the implemented money-path is thinner than the NFT-holder model the draft imagined, and
the cooperative's ownership logic now lives primarily in `ContributionAccounting` (Paper VII), not in
bridge NFTs. Paper VIII (BR1J Constitution) supplies the governance that controls the market-maker
and price-feed parameters through `TreasuryGovernor`. Paper IX (Medusa Paradigm) offers the symbiotic
framing, a host and its guest each benefiting, which now maps to the network and its contracted
market-maker rather than to a coral-and-algae vault.

## 8. Conclusion

The Memetic Money Portal's durable idea, separate the instrument that bootstraps liquidity from the
gas token, holds. Its *mechanism* changed: the ERC-6551 NFT bridge-as-fundraise of February 2026 was
never deployed, and the money-path Citrate actually runs is a wrapped SALT token with EIP-3009
gasless transfers, a governable market-maker allocation, and an on-chain SALT/USD feed, all deployed
on chain 40204. This is a narrower, more auditable, and less dangerous design than a pooled-collateral
bridge, and documenting the change honestly is the point of this revision. What remains before
mainnet reliance is the same short list that gates the rest of the series: a professional audit, real
SALT liquidity, and, for anything touching users' funds, the compliance posture Section 6 describes.

## Acknowledgments

Drafting and literature triage were assisted by AI systems; all mechanical claims were verified by
the authors against the referenced source files and deployed contracts on chain 40204. This work
received no external funding.

## References

[1] ERC-6551: Non-fungible Token Bound Accounts. Ethereum Improvement Proposal (Windle, Giang, et al., 2023). *(Cited for the superseded design of Section 2.)*
[2] ERC-3009: Transfer with Authorization. Ethereum Improvement Proposal.
[3] ERC-20: Token Standard. Ethereum Improvement Proposal (Vogelsteller, Buterin, 2015).
[4] Klosowski, L., Mendenhall, L. (2026). Citrate: Protocol Specification for an AI-Native BlockDAG Network. *The Gradient Papers No. I* (this series).
[5] Klosowski, L., Mendenhall, L. (2026). The Mozi Cooperative. *The Gradient Papers No. VII* (this series).
[6] Klosowski, L., Mendenhall, L. (2026). The BR1J Constitution. *The Gradient Papers No. VIII* (this series).
[7] Klosowski, L., Mendenhall, L. (2026). The Medusa Paradigm. *The Gradient Papers No. IX* (this series).
[8] Buterin, V. (2014). Ethereum: a next-generation smart contract and decentralized application platform.
[9] Ronin Network (2022); Wormhole (2022); Nomad (2022). Bridge incident post-mortems. *(Cited for the bridge-risk record that motivated not shipping a lock-mint bridge.)*

## Appendix A: Cross-Paper Parameter Consistency (reconciled against code, Aug 2026)

| Parameter | Value | Source |
|-----------|-------|--------|
| SALT total supply | 1,000,000,000,000 | Paper I §5 |
| BFT threshold | 67/100 (2/3) | Paper I; `checkpoint.rs:88` |
| WrappedSALT (EIP-3009) | deployed | `0xaa918302…`; `WrappedSALT.sol` |
| MarketMakerAllocation | deployed | `0xa87fae5c…`; `MarketMakerAllocation.sol` |
| SALT/USD feed (ComputePricingOracle) | deployed | `0xdcebd5ec…`; `ComputePricingOracle.sol` |
| x402 payment-auth precompiles | `0x0200`–`0x0201` | `precompiles/x402.rs` |
| SNAP/SALT lock-mint bridge | does not exist | superseded design (Section 2) |

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
