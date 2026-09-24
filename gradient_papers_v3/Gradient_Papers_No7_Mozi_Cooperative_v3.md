---
title: "The Mozi Cooperative: Cooperative Capitalism and Shared Ownership of AI Infrastructure"
subtitle: "The Value Should Flow to the People Who Train, Support, and Believe in the Models"
series: "The Gradient Papers — No. VII"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Implemented accounting, Specified cooperative suite
supersedes: "v2 (February 2026), v3-April draft"
---

# The Mozi Cooperative
### Cooperative Capitalism and Shared Ownership of AI Infrastructure
#### The Value Should Flow to the People Who Train, Support, and Believe in the Models

**The Gradient Papers — No. VII**
Larry Klosowski, Lauren Mendenhall · Citrate Inc.
Preprint — not yet peer reviewed.

> **Maturity: [Implemented] accounting, [Specified] cooperative suite.** The contribution-and-reward
> primitive is deployed on chain 40204; the fuller cooperative-ownership suite is implemented in the
> `citrate-coop` codebase but is not yet deployed to the main chain, and this revision is careful to
> distinguish the two. Two obsolete references from the February draft, to the `$SNAP` bridge that
> was never built (Paper VI), are corrected here.

## Abstract

The dominant model of AI infrastructure, venture-backed, corporate-owned, extraction-oriented,
concentrates both economic returns and governance power in a vanishingly small number of entities.
This paper argues that cooperative ownership of AI infrastructure is not merely ethically preferable
but economically superior for the long-term health of the technology. Named for Mozi (c. 470–391
BCE), who advocated *jian ai* (impartial care) and pragmatic cooperation over hierarchical power, we
propose a cooperative economic framework for decentralized AI. It addresses three failures of the
venture model: misaligned incentives between capital providers and value creators; extraction of
creative and data labor without proportional compensation; and concentration risk that makes the
ecosystem fragile. We formalize cooperative mechanisms for model ownership, inference-revenue
sharing, and contribution-weighted governance, and we anchor them to what exists on the Citrate
Network: contribution recording and reward distribution are implemented and deployed
(`ContributionAccounting`), while the fuller cooperative suite (model cooperatives, patronage ledger,
membership) is implemented in `citrate-coop` and pending deployment.

**Keywords:** cooperative capitalism, AI infrastructure, venture-capital critique, platform
cooperativism, decentralized ownership, Mozi, jian ai, cooperative game theory

## 1. The Problem: venture capital and the enclosure of AI

**The extraction thesis.** The venture model operates on a simple exchange: capital for equity.
Investors provide the compute budgets to train large models and receive ownership; the data, the raw
material, comes from individuals who receive no stake, internet users whose text and images become
training corpora, creators whose works are ingested without licensing, and data laborers whose wages
bear no relationship to the value they create [2, 3]. Zuboff [4] documented the surveillance-capitalism
model where behavioral data is extracted without meaningful consent; the AI era intensifies it as
foundation-model companies monetize generative capacity derived from absorbed human output.

**Concentration risk.** A handful of cloud providers control most global compute [6], fewer than ten
organizations produce the most capable foundation models, and GPU supply is constrained by a single
manufacturer. This is systemic fragility: one provider's policy decision or one manufacturer's supply
disruption cascades across the ecosystem, a governance failure that calls for alternative ownership
structures [8].

**The open-source exception.** Open-source AI has been the one consistent exception to extraction,
returning usable tools, transferable skills, and reputation. But it faces a sustainability crisis:
frontier training costs tens to hundreds of millions, and projects depend on corporate sponsors whose
interests may diverge from the community's; when a sponsor's corporate struggles threaten a widely
used model, the community has no governance mechanism to ensure continuity [9]. The cooperative model
addresses this gap.

## 2. The Mozi Framework: universal love as economic design

**Philosophical foundation.** Mozi advocated *jian ai* (兼爱), impartial care, caring equally for all
rather than privileging one's in-group at others' expense [10], and he was a pragmatist and engineer.
Applied to AI infrastructure: value created by the network should benefit all contributors
proportionally, not privilege early investors disproportionately, and the cooperative must be
economically viable, not merely ideologically appealing.

**Core principles.** *Contribution-proportional ownership:* ownership is earned through measurable
contributions, running validators, providing training data, developing adapters, building
applications, provisioning compute, inverting the VC model where capital determines ownership.
*Revenue flows to contributors:* inference and marketplace revenue are distributed algorithmically
and transparently on-chain. *Governance follows contribution:* voting power is weighted by
contribution history, not token holdings alone, so a validator operating honestly for a year outweighs
a speculator who bought tokens yesterday, preventing the plutocratic capture that afflicts most DAO
governance [11]. *Knowledge sharing is value creation:* the Mentorship Protocol (Paper III) makes
knowledge transfer a first-class economic activity, so an adapter creator whose LoRA improves a weaker
node receives attribution and revenue share, a positive-sum game [12].

## 3. Economic Mechanisms

**Contribution taxonomy.** The cooperative recognizes value across the whole lifecycle: validation
(blocks, uptime, blue score), model hosting (inference served, accuracy), adapter creation (adapters,
adoption), data provision (quality, volume, uniqueness), application development (usage,
transactions), and governance (votes, proposals). Each has a measurable metric and a reward path.

**Revenue distribution.** A base layer distributes SALT block rewards to validators by blocks
produced. An inference layer splits inference fees across the participants who make a served response
possible, the host, the adapter creators whose LoRAs improved the model, the treasury, and data
providers, so that no participant in the value chain is purely extractive. (The February draft also
specified a "bridge layer" paying `$SNAP` NFT holders; since no such bridge was built (Paper VI), that
layer is removed, and cross-market liquidity is handled by the contracted market-maker of Paper VI
rather than by a class of bridge-owning cooperators.)

**Game-theoretic property.** In a cooperative-game formulation [14], each contributor's Shapley value
grows as the network grows, because a contribution's marginal value depends on what it interacts with:
a host's value rises with better adapters, an adapter creator's with more hosts, a validator's with
more application demand. The cooperative converts zero-sum extraction into positive-sum cooperation,
Mozi's *jian ai* expressed as incentive alignment.

## 4. Comparison to existing models

Against VC-backed AI (owned by investors and founders, revenue to shareholders, no data compensation,
board governance, very high concentration), open-source AI (no ownership or revenue, sponsor-dependent,
medium concentration), and Bittensor (token-holder ownership, miner rewards via subnets, indirect data
compensation, senate-plus-token governance), the Mozi Cooperative distinguishes itself on the breadth
of the contributor taxonomy: it compensates data providers, adapter creators, application developers,
and operators directly, not only miners and validators, and it weights governance by contribution to
keep concentration low by design. Bittensor [15] is the closest existing implementation, but it
concentrates rewards in mining and validation without recognizing the broader knowledge lifecycle; the
Mozi Cooperative extends the model to the whole of it.

## 5. Implementation on the Citrate Network

**[Implemented, deployed]** The cooperative's accounting core is live. `ContributionAccounting.sol`
(deployed `0xcdd24773…`) records contributions across types (`recordContribution`,
`recordDimensionContribution`), funds and distributes rewards (`fundRewards`, `distributeRewards`,
`claimRewards`, `pendingReward`), computes a per-contributor score (`getScore`, `_computeScore`), and
gates recording behind an access-controlled recorder set. Adapter attribution is carried by
`LoRAFactory.sol` (deployed `0x6e564d22…`, Paper III), and treasury and parameter governance by
`TreasuryGovernor.sol` (deployed `0x62e268f2…`, Paper VIII). Contribution metrics are deterministically
computable from chain history, so distribution requires no trusted third party, and the checkpoint
chain provides an immutable, publicly auditable record of every contribution and distribution.

**[Specified, not yet on chain 40204]** The fuller cooperative-ownership suite is implemented in the
`citrate-coop` codebase, `ModelCooperative`, `CooperativeGovernor`, `PatronageLedger`,
`ContributionRewardPool`, `MembershipSBT`, and a `CitrateCooperativeFactory`, with revenue-routing and
federated-settlement tests, but it has no deployed address on chain 40204. We mark it Specified and
separately deployable, and we do not imply it is live on the main chain. The February draft named a
`RewardDistributor` and a `GovernorVault`; the implemented equivalents are `ContributionAccounting`
(deployed) and `TreasuryGovernor`/`CooperativeGovernor` respectively, and this revision uses the real
names.

## 6. Honest limitations

The cooperative model faces real challenges this paper does not solve. *Free-riders* who do minimal
work but accumulate governance weight through longevity. *Sybil attacks* where one entity creates many
identities to claim disproportionate contribution credit. *Governance paralysis*, since
contribution-weighted voting may be slower than executive decision-making. *Cold start*, the
bootstrapping problem shared by every marketplace: the cooperative needs enough initial participation
to generate meaningful revenue. These are the known challenges of cooperative economics [16, 19]. We
propose that on-chain transparency and algorithmic enforcement mitigate some of them, and that the
recorder-gated, score-based accounting resists the crudest Sybil and free-rider strategies, but we do
not claim to have solved any of them.

## 7. Relationship to the Gradient Papers Series

Paper I provides the primitives, on-chain contribution tracking, smart-contract revenue distribution,
and contribution-weighted governance are all implementable within its architecture. Paper III
(Mentorship Protocol) provides the organizational-learning theory, and Principle 4, knowledge sharing
as value creation, is that theory operationalized as economics. Paper VI (Memetic Money Portal)
supplies the money-path; note that its mechanism changed from the `$SNAP` NFT model to a wrapped-token
and market-maker model, which is why the bridge-owner class of cooperators has been removed from
Section 3. Paper VIII (BR1J Constitution) implements the governance, the DAO framework is the legal and
procedural realization of this economic philosophy.

## 8. Conclusion

The venture model produced remarkable capability at the cost of extreme concentration, systematic
extraction, and governance failure. The Mozi Cooperative proposes an alternative: infrastructure owned
by contributors, revenue flowing to value creators, governance weighted by engagement, and knowledge
sharing as the primary mechanism of value creation. Unlike the February draft, the accounting core is
no longer aspirational, it is deployed, and the fuller ownership suite exists in code awaiting
deployment. What remains is the deployment of that suite, the compliance posture the money-path
requires (Paper VI), and the conviction to build infrastructure that serves the many rather than
extracting from them.

## Acknowledgments

Drafting and literature triage were assisted by AI systems; all mechanical claims were verified by the
authors against the referenced source files and deployed contracts on chain 40204. This work received
no external funding.

## References

[1] Klosowski, L., Mendenhall, L. (2026). Citrate: Protocol Specification. *The Gradient Papers No. I* (this series).
[2] Perrault, R., et al. (2024). The AI Index 2024 Annual Report. Stanford HAI.
[3] Zuboff, S. (2019). *The Age of Surveillance Capitalism.* Profile Books.
[4] Zuboff, S. (2019). Surveillance capitalism and collective action. *New Labor Forum*, 28(1).
[5] Klosowski, L. (2024). Venture and AI: to Whom? Unpublished internal note, Citrate Inc.
[6] Synergy Research Group. (2025). Cloud infrastructure service spending. *(Verify before final submission.)*
[7] OpenAI. (2024). Infrastructure is Destiny. Policy paper. *(Verify before final submission.)*
[8] Hubbard, S. (2025). Cooperative paradigms for AI. Harvard Ash Center. *(Verify before final submission.)*
[9] Stability AI. (2024). Corporate restructuring. Industry analysis.
[10] Fraser, C., & Campagna, D. (2003). *Mozi: Basic Writings.* Columbia University Press.
[11] Simoncic, K., & Jerele, T. (2023). *Democratizing AI Governance.* Palgrave Macmillan.
[12] Klosowski, L., Mendenhall, L. (2026). The Mentorship Protocol. *The Gradient Papers No. III* (this series).
[13] Klosowski, L., Mendenhall, L. (2026). The Memetic Money Portal. *The Gradient Papers No. VI* (this series).
[14] Shapley, L. S. (1953). A value for n-person games. *Contributions to the Theory of Games II.*
[15] Rao, J. (2021). Bittensor: a peer-to-peer intelligence market.
[16] Scholz, T. (2016). *Platform Cooperativism.* Rosa Luxemburg Stiftung.
[17] Scholz, T., & Tortorici, S. (2025). Five ways cooperatives can shape AI. *Harvard Business Review.*
[18] Piketty, T. (2014). *Capital in the Twenty-First Century.* Harvard University Press.
[19] Ostrom, E. (1990). *Governing the Commons.* Cambridge University Press.

## Appendix A: Cross-Paper Parameter Consistency (reconciled against code, Aug 2026)

| Parameter | Value | Source |
|-----------|-------|--------|
| SALT total supply | 1,000,000,000,000 | Paper I §5 |
| Contribution accounting | deployed | `0xcdd24773…`; `ContributionAccounting.sol` |
| Adapter attribution | deployed | `0x6e564d22…`; `LoRAFactory.sol` |
| Treasury governance | deployed | `0x62e268f2…`; `TreasuryGovernor.sol` |
| Cooperative-ownership suite | implemented, not on 40204 | `citrate-coop` |
| Inference fee split | host / adapter / treasury / data | This paper §3 |
| BFT committee | 100 validators, 67 quorum | Paper I; `checkpoint.rs:88` |

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
