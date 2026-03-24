# Compute for Education: How AI Companies Can Fund Schools by Buying What They Already Need

*A proposal for turning 400 billion idle device-hours per year into school funding.*

---

## The Numbers That Make This Inevitable

**The demand:**
- Anthropic will spend **$19 billion on compute in 2026**
- OpenAI will spend **$46 billion**
- The Big 5 (Microsoft, Google, Amazon, Meta, Oracle) have committed **$660-690 billion in AI capex for 2026**
- Total worldwide AI spending: **$2.52 trillion in 2026** (Gartner)

**The supply:**
- US K-12 schools have **49-55 million computing devices**
- These devices are idle **92-94% of the time** (nights, weekends, summers, holidays)
- That's **~400 billion device-hours of unused compute per year**

**The gap:**
- US schools face a **$90 billion annual funding gap** for facilities alone
- **$12 billion** in federal education funding was disrupted in 2025-2026
- Schools spend **$30 billion/year on technology** — a budget under pressure as pandemic funds expire

**The math:**
- If AI companies paid **$1/device/month** for idle compute: **$600M/year** back to schools
- At **$5/device/month**: **$3B/year** — covering 10% of school tech budgets
- At **$10/device/month**: **$6B/year** — meaningfully closing the technology funding gap
- Even $5/device/month is **0.03% of Anthropic's compute spend** — a rounding error for them, a lifeline for schools

---

## Why This Works for Everyone

### For AI Companies (Anthropic, OpenAI, Google, etc.)

**The problem they have:** Compute demand is growing faster than datacenter supply. Anthropic signed a $50B datacenter deal. OpenAI is targeting $600B cumulative compute through 2030. They're building as fast as they can and it's not fast enough.

**What they get:**
- Access to distributed compute capacity that scales with school adoption (no construction needed)
- Inference workloads (the majority of production compute) are embarrassingly parallel — perfect for distributed execution
- Cost savings: decentralized compute runs 60-80% cheaper than hyperscaler pricing
- PR: "We fund education with every API call" is an extraordinary narrative
- Mission alignment: Anthropic is a Public Benefit Corporation chartered to benefit humanity. Funding education through compute purchases IS the mission.

**The cost:** A fraction of a percent of their compute budget. The marginal cost of adding school nodes to an inference pool is essentially zero — the routing infrastructure already exists.

### For Schools

**The problem they have:** Chronic underfunding. $90B/year facility gap. $12B in federal disruptions. Technology budgets shrinking as ESSER funds expire. Meanwhile, 55 million devices sit idle 92% of the time.

**What they get:**
- Passive income from hardware they already own
- $5-10/device/month × 50 devices = $3,000-6,000/year per school — real money for a school that can't afford new textbooks
- AI curriculerprise trust signal (institutional buyers want the audit report)
- Regulatory defense ("we engaged a qualified auditor")

**My recommendation:**sum integration: the same platform that earns money teaches students about AI
- Compliance-ready: no student data leaves the school network. Learning operates on embeddings, not raw data.

**The cost:** Electricity. A typical desktop running compute overnight adds ~$2-3/month to the power bill. Net positive at $5/device/month.

### For Government

**The problem they have:** An executive order on AI education (April 2025) with no budget to fund it. A mandate for public-private AI partnerships with no obvious partner. A political need to show AI benefits ordinary Americans, not just tech companies.

**What they get:**
- A ready-made public-private partnership that satisfies the EO's requirements
- Schools earning money from AI companies = the narrative that AI creates jobs, not just eliminates them
- Students learning AI on the same platform that powers commercial inference = workforce development
- No new legislation required. No new budget. The marketplace is built. The EO mandate is met.

**The political payoff:** A school in Ohio earning $5,000/month from Anthropic compute is a MUCH better story than "AI will create 20 million jobs by 2030" (abstract) or "We're investing in responsible AI" (vague). It's concrete. It's local. It's photographable. It's a school board meeting where the principal says "our computers earned $47,000 last year."

### For Anthropic Specifically

Anthropic's charter as a Public Benefit Corporation includes "responsible development and maintenance of advanced AI for the long-term benefit of humanity." The Long-Term Benefit Trust (LTBT) governs the company with an explicit mandate to prioritize this.

**Buying compute from schools is the most direct expression of this mission possible.** Every inference query that routes through a school node:
1. Funds education (benefit to humanity)
2. Distributes AI infrastructure (responsible development)
3. Teaches students about AI (long-term capacity building)
4. Provides verified compute to Anthropic (business value)

This isn't CSR. It's not philanthropy. It's a business transaction where every dollar spent creates educational value as a byproduct. The compute is real. The payment is real. The education is real.

**Dario's opportunity:** The AI safety conversation has been about risks. "What if AI goes wrong?" This flips the narrative: "Here's what AI is doing RIGHT — right now, in this school, in your district." Every Anthropic API call that routes through a school node is a proof point that AI companies and communities can be aligned.

---

## How It Works Technically

```
Anthropic API Call
  → Citrate Compute Marketplace (verified, cached, load-balanced)
    → School Inference Pool (50 devices, idle overnight)
      → Device executes inference (model cached from IPFS)
      → Result + ZK commitment proof returned
    → Verification: commitment proof checked on-chain
    → Payment: 95% to school, 2.5% burned (BME), 2.5% treasury
  → Result returned to Anthropic
Total latency: <200ms (inference pool, parallel execution)
```

**Why it's safe:**
- 36 TLA+ specifications verify every state machine
- Adversarial spec proves 6 attack vectors are unprofitable
- Poseidon ZK proofs verify compute correctness
- NematocystSlashing punishes bad providers proportionally
- No student data involved — inference workloads come from Anthropic's customers, not from students

**Why it's fast enough:**
- Inference is embarrassingly parallel — each device handles separate requests
- 50 devices = 50 concurrent queries
- Model cached locally after first download
- QueryCache prevents redundant contract calls
- Linear scaling: 1,000 schools × 50 devices = 50,000 concurrent inference capacity

---

## The Viral Angle

**The one-liner:** "Your child's school computer earned $5,000 this year by helping run AI — and your kid learned how it works."

**The visual:** A school dashboard showing real-time earnings. SALT accumulating. A bar chart of contributions by type. A teacher showing students the models running on their computers. A principal presenting the quarterly earnings report to the school board.

**The political activation:**

For the **President**: "My executive order on AI education produced this result — schools earning money from AI companies while students learn AI. Public-private partnership, no new spending, American innovation."

For **Dario/Anthropic**: "We don't just talk about AI benefiting humanity — we fund schools with every API call. Our compute budget is an education budget."

For **school boards**: "We earned $47,000 last year from our existing computers. Here's the dashboard. Here's the audit report. No student data was involved. We recommend continuing."

For **parents**: "Your child's school is an AI laboratory. They're learning the technology that will define their career. And the school is earning money from it."

For **Congress**: "The AI companies that spend $700 billion on compute this year could direct 0.1% of that through schools — $700 million in education funding with no new legislation."

**Why it's viral:** It's not an abstract policy proposal. It's a dashboard with a number on it. "$5,247 earned this month." That screenshot travels. That school board presentation gets shared. That parent tells another parent. The concrete, local, photographable result IS the marketing.

---

## The Ask

### Phase 1: Pilot (3-6 months)

**5 schools. 250 devices. One AI company partner.**

- Deploy Citrate nodes on school computers (one-click installer, already built)
- Connect to partner's inference workload (OpenAI-compatible API, already built)
- Track: earnings, uptime, queries served, student engagement
- Produce: case study with real numbers, school board presentation template, teacher curriculum

**Cost to AI company:** ~$15,000/month in compute purchases (250 devices × $60/device/month for inference capacity). This is less than one engineer's monthly salary.

**Output:** Proof that the model works. Real earnings data. Real school testimonials. The case study that makes Phase 2 possible.

### Phase 2: District Scale (6-12 months)

**20 schools. 1,000 devices. Multiple AI company partners.**

- School district partnership (single procurement decision, not per-school)
- Teacher training program (curriculum for AI + compute + economics)
- Student projects: build a model, train on school data, serve it on the network
- Quarterly earnings reports for school boards

**Cost to AI companies:** ~$60,000/month total (split across partners). Still a rounding error.

### Phase 3: National (12-24 months)

**1,000+ schools. 50,000+ devices. Open marketplace.**

- Any AI company can buy compute from the marketplace
- Any school can join by installing the app
- Pricing via reverse auction (schools compete on availability, not price)
- National dashboard: total schools, total earnings, total queries served, total students learning AI

**At scale:** 50,000 devices × $5/month = $3M/year flowing to schools. If even 1% of Anthropic's compute budget routes through schools, that's $190M/year.

---

## What No One Else Has Built

| Capability | Citrate | Everyone Else |
|-----------|---------|---------------|
| Verified compute (ZK proofs) | 36 TLA+ specs + Poseidon ZK | No verification (Akash), reputation only (Render) |
| School-friendly onboarding | One-click installer, persona-based UX | CLI-only, dev-focused |
| Teacher curriculum integration | Learning Center with classroom management | None |
| Formal security proofs | Adversarial TLA+ spec, 6 attack vectors modeled | None |
| Student data isolation | Inference only, no student data on-chain | N/A |
| Real-time earnings dashboard | Built and wired to contracts | None for education |

This isn't a pitch deck. The code exists. The specs are verified. The Apps and Infrastructure is built. The contracts are tested. The architecture composes with existing infrastructure. The gap between "ready" and "deployed" is a testnet launch and a partnership conversation.

---

## The Precedent We're Setting

No one has ever tokenized school compute. BOINC proved distributed computing works (20 PetaFLOPS from 136K hosts). Folding@home proved people volunteer compute for science (350K+ volunteers). Neither paid the contributors.

Citrate pays the schools. In SALT. Which can be converted to USD. Which appears on the school budget as earned revenue, not a grant.

The difference between a grant and earned revenue matters to school boards. A grant expires. Earned revenue is self-sustaining. A school that earns $5,000/month from compute doesn't need to reapply next year. The computers keep earning. The income compounds. The program justifies itself.

This is the flywheel: schools join → compute capacity grows → AI companies buy more → more schools join. The incentive alignment is structural, not charitable. Everyone is doing what's in their economic interest, and the emergent result is education funding.

---

*Written March 22, 2026.*
*400 billion idle device-hours. $90 billion funding gap. $2.52 trillion AI spend.*
*The math has been waiting for the technology. The technology is built.*
*Now it needs a conversation.*
