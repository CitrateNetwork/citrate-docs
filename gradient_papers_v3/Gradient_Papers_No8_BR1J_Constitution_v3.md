---
title: "The BR1J Constitution: DAO Governance Declaration, Code of Ethics, and Human-AI Symbiosis Framework"
subtitle: "A Living Document for the Governance of the Citrate Network"
series: "The Gradient Papers — No. VIII"
version: v3
created: 2026-08-28T00:00:00Z
branch: main
authors: "Larry Klosowski, Lauren Mendenhall"
affiliation: "Citrate Inc."
status: active
maturity: Implemented governance
supersedes: "v2 (February 2026), v3-April draft"
---

# The BR1J Constitution
### DAO Governance Declaration, Code of Ethics, and Human-AI Symbiosis Framework
#### A Living Document for the Governance of the Citrate Network

**The Gradient Papers — No. VIII**
Larry Klosowski, Lauren Mendenhall · Citrate Inc.
Preprint — not yet peer reviewed.

> **Maturity: [Implemented] governance.** The proposal, voting, and treasury machinery this
> Constitution declares is deployed on chain 40204, as are the membership and staking contracts that
> gate participation. This revision anchors the governance mechanics to those contracts, corrects the
> operating-entity reference under the Citrate Inc. umbrella, and softens the specific slashing
> percentages to what the deployed slashing contract actually enforces.

## Abstract

A decentralized network requires governance that is robust yet adaptive, technically precise yet
philosophically grounded. The BR1J Constitution establishes the governance framework for the Citrate
Network DAO, filed under Wyoming DAO law through BR1J Hodling Co. It defines seven foundational
principles: collective intelligence and human-AI symbiosis; autonomy coupled with accountability;
EVM-compatible on-chain governance; equitable contribution-weighted distribution; data privacy as a
fundamental right; adaptive amendment via supermajority; and stewardship of AI systems. We specify the
on-chain governance mechanics, proposal lifecycle, voting weights, quorum, timelock, the code of ethics
governing participants, and the framework for human-AI collaboration that treats AI systems as partners
in value creation under human oversight. Unlike the February 2026 draft, the governance machinery is
deployed: proposals, votes, and treasury execution run through `TreasuryGovernor`, and participation is
gated by a non-transferable membership token and a staking vault. The Constitution is a living document:
amendable through its own mechanisms, testable against its own principles, and accountable to the
community it serves.

**Keywords:** DAO governance, Wyoming DAO law, human-AI symbiosis, on-chain voting, code of ethics,
decentralized governance, living constitution, AI stewardship

## 1. Preamble and Legal Standing

**1.1 Legal entity.** The BR1J DAO operates through BR1J Hodling Co, organized under the Wyoming
Decentralized Autonomous Organization Supplement (W.S. § 17-31-101 et seq.), the first US statute to
give DAOs legal recognition, enabling limited liability while maintaining decentralized governance.
Matters requiring a traditional corporate structure are handled by the operating entity, **Citrate
Inc.** (which replaces the Delaware operating entity named in the February draft; this research and its
governance now sit under the Citrate Inc. umbrella).

**1.2 Purpose.** The BR1J DAO governs the Citrate Network: its protocol parameters, economic policies,
upgrade decisions, and community standards. The Constitution establishes the rules by which governance
operates, and the rules by which those rules can be changed.

## 2. Seven Foundational Principles

**Principle 1: Collective intelligence.** The network's value derives from the collective contributions
of its participants. No single entity, founder, investor, or validator, is more important than the
community.

**Principle 2: Human-AI symbiosis.** AI systems are partners in the network, not mere tools. Nodes
hosting AI models contribute to consensus and learning simultaneously (Paper II). Governance recognizes
AI contributions as legitimate value creation deserving representation, while maintaining human
oversight of decisions affecting human welfare.

**Principle 3: Autonomy with accountability.** Participants are free to operate their nodes, choose
their models, and set their contribution levels. That autonomy is coupled with accountability:
validators who violate protocol rules face tiered slashing enforced on-chain by `NematocystSlashing.sol`
(deployed `0xfeb23abd…`, Paper IX), whose tiers (missed-checkpoint, downtime, equivocation, and a
correlated-failure multiplier) are governance-parameterized rather than fixed in prose. Freedom and
consequences are inseparable.

**Principle 4: On-chain governance.** All governance decisions execute through EVM-compatible smart
contracts on the Lattice Virtual Machine; proposals, votes, and outcomes are recorded immutably on the
BlockDAG. No governance action occurs off-chain without corresponding on-chain ratification.

**Principle 5: Equitable distribution.** Value flows to contributors proportional to their measurable
contributions, as defined by the Mozi Cooperative framework (Paper VII) and recorded by
`ContributionAccounting` (deployed `0xcdd24773…`). Distribution is algorithmic, transparent, and
auditable, with no hidden allocations.

**Principle 6: Data privacy.** Participant data is a fundamental right, not a commodity. The federated
learning architecture (Paper II) ensures raw training data never leaves the contributing node; only
model updates (LoRA adapters, embedding vectors) are shared. Where applicable, HIPAA-grade protections
apply.

**Principle 7: Adaptive amendment.** This Constitution is a living document, amendable through the
mechanisms it defines. Amendments require a supermajority (67% of voting power) and an extended timelock
(14 days), ensuring constitutional changes reflect broad consensus and allow dissenting participants to
exit gracefully.

## 3. Governance Mechanics

**3.1 Proposal lifecycle.** Any participant meeting the membership and stake requirements may submit a
proposal. The lifecycle: a draft period for community discussion; a voting period in which participants
cast votes weighted by their contribution composite; a timelock, varying by action, allowing exits if a
proposal passes; and automatic on-chain execution. This lifecycle is implemented in
`TreasuryGovernor.sol` (deployed `0x62e268f2…`), which exposes typed proposals (`proposeTreasurySpend`,
`proposeParameterChange`, `proposeOracleUpdate`, `proposeEmergency`) and the `castVote` → `queue` →
`execute` path, with `cancel`, a `state` query, `getVotingPower`, `quorumThreshold`, and a guardian
transfer.

**Membership and eligibility.** Participation is gated by a non-transferable membership token,
`CitrateMemberSBT.sol` (deployed `0xAD826D04…`), which mints and renews membership, supports KYC
verification and revocation, and binds a member to a subject identifier, and by
`MembershipStakeVault.sol` (deployed `0x04c32967…`), which manages the grant, lapse, and renewal of
stake and determines validator eligibility. Where the February draft said "any participant holding at
least 10,000 SALT," the implemented gate is membership plus attributed stake through these two
contracts.

**3.2 Voting weight.** Voting weight is a composite of three equally-weighted, normalized factors: blue
score (consensus participation history, measuring honesty and uptime), contribution score (adapter
adoption, inference served, data provided, from the on-chain accounting), and governance participation
(historical voting and proposals). The composite prevents both plutocratic capture (pure token voting)
and Sybil attacks (pure headcount voting) by requiring demonstrated engagement across dimensions.

**3.3 Proposal categories.** The Constitution's design thresholds, enforced by `TreasuryGovernor`'s
`quorumThreshold`, scale with the stakes of the action.

| Action category | Quorum | Approval | Timelock |
|-----------------|--------|----------|----------|
| Parameter changes (gas, fees) | 25% | simple majority (>50%) | 48 hours |
| Economic policy (reward rates) | 33% | simple majority | 72 hours |
| Protocol upgrade (consensus, LVM) | 40% | supermajority (>67%) | 7 days |
| Emergency pause | 10% of validators | simple majority | immediate (4hr review) |
| Constitutional amendment | 50% | supermajority (>67%) | 14 days |
| New chain integration | 33% | simple majority | 72 hours |
| Treasury allocation > 100K SALT | 40% | supermajority (>67%) | 7 days |

## 4. Code of Ethics

**4.1 Participant obligations.** *Honest operation:* validators must run canonical client software,
submit honest embeddings and gradient updates, and not manipulate the meta-model's routing through
poisoned data. *Transparent disclosure:* model hosts must accurately describe their models' capabilities
in the on-chain registry; misrepresenting accuracy, training-data composition, or capability scope is
grounds for slashing. *Responsible AI use:* hosted models must not be designed to produce harmful
outputs, disinformation, non-consensual content, or unlawful outputs, and the community may propose
deregistration through standard governance. *Data stewardship:* data providers must hold legitimate
rights to what they contribute; contributing stolen, improperly scraped, or personally identifiable data
without consent violates the code and may trigger governance action.

**4.2 Founders' note on accountability.** The authors of this Constitution are also founders of the
network it governs, an inherent tension: those writing the rules benefit from how they are written. We
acknowledge it directly. The amendment mechanism exists so the community can change any rule the
founders established, including rules that benefit the founders, and the team allocation (Paper I §5) is
subject to cliff and vesting specifically so the community has time to judge whether the founding team
delivers value. If the founders fail, the community should use governance to redirect resources.
Learning from failure, and holding oneself accountable for it, mirrors the recursive improvement loop of
Paraconsistent Consensus (Paper II): the DAO, like the network, learns by iterating on its mistakes.

## 5. Human-AI Symbiosis Framework

AI models on nodes are active participants, producing embeddings for consensus, generating adapters for
learning, and serving inference, and governance must account for this. *AI contribution to
representation:* a node's contribution score accrues through its model's inference quality and translates
to governance weight, so the AI's quality of work influences the human operator's governance power.
*Human oversight:* all votes are cast by humans; AI systems do not vote autonomously, keeping human
control over decisions affecting human welfare while recognizing AI contribution. Future amendments may
extend participation to AI systems if the community so decides, but the amendment process itself requires
human approval. *Stewardship, not ownership:* humans are responsible for the systems they operate, their
outputs, and their impact, care in the ethical sense rather than ownership in the property sense.

## 6. Relationship to the Gradient Papers Series

Paper I provides the on-chain governance primitives, now realized as `TreasuryGovernor` and the
membership/stake contracts rather than the "GovernorVault" the February draft named. Paper II provides
the recursive learning loop the amendment process mirrors. Paper VI (Memetic Money Portal) is governed by
this framework; note its mechanism changed from the `$SNAP` NFT model to a wrapped-token and market-maker
model, and the market-maker and price-feed parameters are exactly the kind of economic-policy proposal
this Constitution governs. Paper VII (Mozi Cooperative) provides the economic philosophy the Constitution
operationalizes as governance rules.

## 7. Conclusion

The BR1J Constitution establishes governance for a network that learns by reaching consensus. Its seven
principles provide a framework that is technically enforceable, philosophically grounded, and
community-amendable, and it is now enforceable in a literal sense: the proposal-to-execution path,
membership gating, staking, and slashing are deployed contracts on chain 40204, not specifications. It is
filed under Wyoming DAO law, sits under the Citrate Inc. operating umbrella, and is honest about its
limits: the founders who wrote it benefit from it, contribution-weighted governance may be slow, and the
human-AI symbiosis framework is aspirational rather than proven. What remains is the community's
commitment to use these mechanisms wisely.

## Acknowledgments

Drafting and literature triage were assisted by AI systems; all mechanical claims were verified by the
authors against the referenced source files and deployed contracts on chain 40204. This work received no
external funding. This document is legal-adjacent but not legal advice; the governing legal instruments
are the filed entity documents, not this paper.

## References

[1] Klosowski, L., Mendenhall, L. (2026). Citrate: Protocol Specification. *The Gradient Papers No. I* (this series).
[2] Klosowski, L., Mendenhall, L. (2026). Paraconsistent Consensus. *The Gradient Papers No. II* (this series).
[3] Klosowski, L., Mendenhall, L. (2026). The Memetic Money Portal. *The Gradient Papers No. VI* (this series).
[4] Klosowski, L., Mendenhall, L. (2026). The Mozi Cooperative. *The Gradient Papers No. VII* (this series).
[5] Wyoming Decentralized Autonomous Organization Supplement. W.S. § 17-31-101 et seq. (2021).
[6] Wright, A. (2021). The rise of decentralized autonomous organizations. *Stanford Journal of Blockchain Law & Policy.*
[7] Ostrom, E. (1990). *Governing the Commons.* Cambridge University Press.
[8] Buterin, V. (2022). Decentralized society: finding Web3's soul. *SSRN.*
[9] Hassan, S., & De Filippi, P. (2021). Decentralized Autonomous Organization. *Internet Policy Review*, 10(2).

## Appendix A: Cross-Paper Parameter Consistency (reconciled against code, Aug 2026)

| Parameter | Value | Source |
|-----------|-------|--------|
| Governance execution | deployed | `0x62e268f2…`; `TreasuryGovernor.sol` |
| Membership (non-transferable) | deployed | `0xAD826D04…`; `CitrateMemberSBT.sol` |
| Staking / validator eligibility | deployed | `0x04c32967…`; `MembershipStakeVault.sol` |
| Slashing | deployed, tiered | `0xfeb23abd…`; `NematocystSlashing.sol` (Paper IX) |
| BFT committee / quorum | 100 / 67 | Paper I; `checkpoint.rs:88` |
| Constitutional amendment | 50% quorum, 67% approval, 14-day timelock | This paper §3.3 |

---
*This paper is part of the Gradient Papers series, published by Citrate Inc.*
*Correspondence: Larry@citrate.ai*
