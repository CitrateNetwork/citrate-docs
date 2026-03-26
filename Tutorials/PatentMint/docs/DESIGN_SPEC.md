# PatentMint — Design Specification
## Decentralized Patent & IP Management on Citrate

**Version:** 0.1.0
**Branch:** Renzo-patent-tool
**Date:** 2026-03-25

---

## 1. Overview

PatentMint is a decentralized application for creating, managing, licensing, and defending patents and intellectual property on the Citrate blockchain. It reduces the cost of IP protection by shifting infrastructure costs to network operators (who earn SALT) and tokenizing legal protection as a marketplace service.

### Core Principles

- **Platform is a connector, never a funder** — all litigation is funded and directed by the patent owner
- **KYC-gated access** — verified identity required before any patent activity
- **$5 SALT stake barrier** — low enough for accessibility, high enough for anti-spam
- **Modular IP architecture** — patents first, trademarks and copyrights plug in later via shared base
- **IPFS-first storage** — all patent documents stored on IPFS with on-chain CID references
- **AI-assisted workflows** — prior art search, claim drafting, classification via Citrate precompiles and MCP

---

## 2. Smart Contract Architecture

### 2.1 Contract Hierarchy

```
IPBase.sol (abstract)
│   Shared: TBA wallets (ERC-6551), tier system, SALT staking, revenue splits
│   Shared: IPType enum (PATENT, TRADEMARK, COPYRIGHT)
│
├── KYCRegistry.sol (Soulbound ERC-5192)
│   - mintCredential(user, level, jurisdiction, validityPeriod, providerHash)
│   - revokeCredential(user)
│   - isVerified(user, minLevel) → bool
│   - Levels: NONE, INDIVIDUAL, BUSINESS, INTERNATIONAL
│   - Non-transferable soulbound token (no PII on-chain)
│   - PII stays with third-party KYC provider (GDPR compliant)
│   - Credentials expire and require periodic re-verification
│
├── PatentNFT.sol (ERC-721 + ERC-6551 Registry)
│   - mint(title, abstract, ipfsCID, contentHash, sizeBytes, category, tier, revShareBps)
│   - Requires valid KYC credential (INDIVIDUAL minimum)
│   - Each patent NFT gets a token-bound account (TBA)
│   - TBA holds: license revenue, sub-patent references, metadata
│   - On-chain SVG tokenURI (ModelNFT pattern)
│   - SALT staking on mint (~$5 USD equivalent)
│   - 90-day stake lock, refundable if valid, burned if spam
│
├── PatentLicense.sol
│   - createLicense(patentId, licensee, terms, fee, duration)
│   - Encrypted symmetric key per licensee (ChatVault pattern)
│   - grantAccess(patentId, licensee, encryptedKey)
│   - revokeLicense(patentId, licensee)
│   - License fees route to patent's TBA wallet (minus tier rev share)
│   - Supports: exclusive, non-exclusive, time-limited
│
├── PatentMarketplace.sol
│   - listPatent(patentId, askPrice, royaltyBps)
│   - bid(patentId, amount)
│   - acceptBid(patentId, bidId)
│   - ERC-2981 royalties on secondary sales
│   - Auction + fixed-price modes
│   - Revenue splits via TBA
│
├── PatentTiers.sol
│   - Tier enum: BASIC, PROTECTED, DEFENDED
│   - Revenue share ranges per tier
│   - Upgrade-only tier changes
│   - Revenue distribution to ServicePool
│
├── PatentAI.sol
│   - classifyPatent(ipfsCID) → precompile 0x1001 (embeddings)
│   - scorePriorArt(patentCID, candidateCID) → cosine similarity
│   - generateAbstract(patentCID) → MCP /v1/chat/completions (off-chain)
│   - Patent categories: UTILITY, DESIGN, PLANT, PROVISIONAL, SOFTWARE
│
├── PatentIPFS.sol (extends IPFSIncentives pattern)
│   - Adds PATENT_DOCUMENT ModelType with 2x multiplier
│   - registerPatentDocument(patentId, cid, sizeBytes)
│   - Links CIDs to patent IDs for integrity tracking
│   - Tiered replication: Active (3x), Standard (2x), Historical (1x)
│
├── PatentIndex.sol
│   - addToIndex(patentId, cid, category, timestamp)
│   - Category-based indexes for search
│   - getMerkleRoot() → verifiable completeness proof
│
├── LegalEntityRegistry.sol
│   - Curated directory of licensed law firms (Phase 1: admin-curated)
│   - Jurisdictions + IPType specialties per firm
│   - On-chain legal disclaimer (always present)
│   - Phase 1: recommendations only, all engagement off-platform
│   - Future: DAO-curated, reputation system
│
├── LitigationFunding.sol (IP Stake Marketplace)
│   - createDefensePost(patentId, descriptionCID, stakeOfferedBps, fundingGoal, duration)
│   - fundDefense(postId, amount)
│   - DEFENDED tier required to create posts
│   - Goal met → SALT to owner, backers get revenue share
│   - Goal not met → SALT refunded to backers
│   - Platform NEVER touches litigation decisions or funds
│
└── ServicePool.sol
    - Receives revenue share from PROTECTED/DEFENDED tiers
    - Distribution: 70% node operators, 20% platform, 10% community grants
    - NO litigation reserves
```

### 2.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| CID stored as `string` | Matches all existing Citrate contracts |
| Content hash as `bytes32` | SHA-256, verified on retrieval |
| ERC-6551 TBA per patent | Each patent "owns" a wallet for revenue and sub-references |
| Encrypted IPFS for pre-publication | AES-256-GCM, keys managed by PatentLicense.sol |
| AI precompiles for classification | On-chain categorization enables decentralized search |
| IPType enum in shared base | Future-proofs for trademarks and copyrights |
| Upgrade-only tiers | Prevents downgrade gaming after receiving services |
| Burned stakes → ServicePool | Spam attempts fund the ecosystem |
| KYC via third-party provider | Legal-grade identity verification without building in-house |
| Soulbound KYC token (ERC-5192) | Non-transferable, no PII on-chain, GDPR compliant |
| KYC gating on all patent actions | Patents require verified identity for legal legitimacy |

---

## 3. Tiered IP Packages

### 3.1 Tier Definitions

```
BASIC ($5 SALT stake only)
├── Patent NFT minting + IPFS storage
├── AI-assisted prior art search
├── AI-assisted claim drafting
├── On-chain timestamp proof
├── Community recommendations for law offices (with disclaimers)
└── Revenue share: 0%

PROTECTED ($5 SALT stake + 3-5% revenue share)
├── Everything in BASIC
├── Curated directory of licensed law firms
├── Pre-negotiated rate cards from partner firms
├── Cross-border licensing coordinator recommendations
├── IP valuation tools (AI-assisted)
├── Automated licensing agreement templates
└── Revenue share activates on first revenue event

DEFENDED ($5 SALT stake + 8-15% revenue share)
├── Everything in PROTECTED
├── Priority matching with vetted litigation firms
├── Infringement monitoring (AI scan of new filings)
├── Cross-border "legal attached" coordinator recommendations
├── Access to IP Stake Marketplace (crowdfund defense)
├── Multi-jurisdiction filing coordination tools
└── Revenue share activates on first revenue event
```

### 3.2 Revenue Flow

```
Patent generates revenue (sale, license, or usage fee)
│
├── BASIC: 100% → Patent Owner TBA
│
├── PROTECTED (e.g., 4% share):
│   ├── 96% → Patent Owner TBA
│   └──  4% → ServicePool
│         ├── 70% → Node operators (IPFS pinning, AI compute)
│         ├── 20% → Platform maintenance
│         └── 10% → Community grants
│
└── DEFENDED (e.g., 12% share):
    ├── 88% → Patent Owner TBA
    └── 12% → ServicePool (same 70/20/10 split)
```

### 3.3 Staking Mechanics

```
Stake: ~$5 USD equivalent in SALT (price oracle)
├── Refundable after 90 days if patent is valid
├── Burned to ServicePool if flagged as spam/duplicate
└── No inventor pays more than $5 upfront, ever
```

---

## 4. Legal Architecture

### 4.1 Platform Role

```
WHAT THE PLATFORM DOES                    WHAT THE PLATFORM NEVER DOES
──────────────────────                    ────────────────────────────
✓ Connects inventors to licensed firms    ✗ Fund litigation directly
✓ Maintains firm directory                ✗ Make legal decisions
✓ Facilitates IP stake sales for defense  ✗ Hold litigation reserves
✓ Provides AI tools for draft/search      ✗ Guarantee legal outcomes
✓ Stores documents immutably on IPFS      ✗ Act as legal counsel
```

### 4.2 Legal Entity Registry (Phase 1)

- Admin-curated directory of patent law firms
- Each firm tagged with: jurisdictions, IP type specialties, contact info (on IPFS)
- On-chain disclaimer always displayed:
  > "This platform provides directory information only. It does not provide legal advice, fund litigation, or guarantee the quality of any legal services. All engagement with legal entities is at the user's sole risk and discretion."
- All engagement is between inventor and firm, off-platform

### 4.3 Cross-Border Licensing (Phase 1)

- Platform shows recommended firms with multi-jurisdiction expertise
- Informational paperwork checklists and timeline estimates
- Disclaimer: "Consult qualified legal counsel"
- On-chain licensing via PatentLicense.sol (terms, fees, duration — inventor-controlled)
- Future: managed paperwork system, automated filings, jurisdiction-specific templates

### 4.4 IP Stake Marketplace (Crowdfunded Defense)

- Patent owner creates a DefensePost: offers X% future revenue for Y SALT
- Anyone can back a defense (investment, not donation)
- If goal met by deadline: SALT → patent owner, backers get proportional revenue share via TBA
- If goal not met: SALT refunded to backers
- Only DEFENDED tier patents can create defense posts
- Inventor contacts counsel independently, negotiates independently, pays independently
- Platform enforces on-chain revenue splits only

---

## 5. KYC & Identity Verification

### 5.1 Verification Levels

| Level | Requirements | Enables |
|-------|-------------|---------|
| **NONE** | No verification | Browse, search, AI prior art search |
| **INDIVIDUAL** | Government photo ID + passport + liveness check + address verification | Mint patents, create licenses, list on marketplace, back defense posts |
| **BUSINESS** | Individual + business registration + proof of authority + tax ID | Mint patents as a business entity |
| **INTERNATIONAL** | Business + apostille/document authentication + local legal rep + sanctions screening | Cross-border licensing |

### 5.2 KYC Flow

```
1. User connects wallet to PatentMint
2. User clicks "Verify Identity"
3. Redirected to third-party KYC provider (Sumsub, Persona, Jumio, or Onfido)
   ├── Upload government-issued ID / passport
   ├── Liveness check (selfie video, anti-spoofing)
   ├── Address verification (utility bill / bank statement)
   └── Business docs (if entity: articles of incorporation, board resolution, tax ID)
4. Provider webhook → PatentMint backend verifies result
5. Backend mints soulbound KYC token (ERC-5192) to user's wallet
   ├── Non-transferable (soulbound)
   ├── Stores: verification level, jurisdiction, expiry, provider hash
   ├── Does NOT store PII on-chain
   └── PII stays with KYC provider (GDPR/CCPA compliant)
6. PatentNFT.mint() checks KYCRegistry.isVerified(msg.sender, INDIVIDUAL)
```

### 5.3 Data Privacy

```
WHAT IS STORED ON-CHAIN              WHAT IS NEVER ON-CHAIN OR IPFS
──────────────────────               ────────────────────────────────
✓ Verification level (enum)         ✗ Name, DOB, address
✓ Jurisdiction (ISO country code)   ✗ ID document images
✓ Expiry timestamp                  ✗ Selfie/liveness data
✓ Provider hash (keccak256)         ✗ Tax IDs, passport numbers
✓ Active/revoked status             ✗ Business registration docs
```

### 5.4 Gating Matrix

| Action | Minimum KYC Level |
|--------|-------------------|
| Browse / search patents | NONE |
| AI prior art search | NONE |
| Mint patent (individual) | INDIVIDUAL |
| Mint patent (as business) | BUSINESS |
| Create license agreement | INDIVIDUAL |
| List on marketplace | INDIVIDUAL |
| Cross-border licensing | INTERNATIONAL |
| Create defense post | INDIVIDUAL |
| Back a defense post | INDIVIDUAL |

### 5.5 KYC Provider Evaluation (Phase 1)

| Provider | Coverage | Liveness | Business KYC | API Quality | Notes |
|----------|----------|----------|--------------|-------------|-------|
| **Sumsub** | 220+ countries | Yes | Yes | Strong | Good pricing, recommended |
| **Persona** | Global | Yes | Yes | Strong | Flexible workflows |
| **Jumio** | 200+ countries | Yes | Yes | Strong | Enterprise-grade, pricier |
| **Onfido** | 195+ countries | Yes | Limited | Good | Strong AI fraud detection |

Phase 1 integrates one provider via webhook. Future phases may support multiple providers or decentralized identity solutions.

### 5.6 Re-Verification

- Individual credentials expire after **12 months**
- Business credentials expire after **6 months** (business status changes more frequently)
- International credentials expire after **6 months**
- Expired credentials block new patent actions but do not affect existing patents
- Users receive on-chain event notification 30 days before expiry

---

## 6. IPFS Storage Architecture

### 5.1 Document Structure

```
/patent-{patentId}/
├── manifest.json          # CID index + metadata
├── claims.json            # Patent claims (encrypted if pre-publication)
├── drawings/              # Technical drawings (PNG/SVG)
├── specification.pdf      # Full specification
└── prior-art/
    └── references.json    # Array of { cid, relationship, relevance }
```

### 5.2 Manifest Schema

```json
{
  "patentId": "0x...",
  "version": 1,
  "created": 1710864000,
  "documents": {
    "claims": "bafybeic3...",
    "drawings": "bafybeig7...",
    "specification": "bafybeid2...",
    "abstract": "bafybeif9..."
  },
  "contentHash": "0x...",
  "encrypted": true,
  "encryptionAlgo": "AES-256-GCM"
}
```

### 5.3 Pinning Tiers

| Tier | Age | Replication | CITRATE Reward | Notes |
|------|-----|-------------|----------------|-------|
| Active | < 2 years | 3x minimum | 2x multiplier | Penalty for < 99.9% uptime |
| Standard | 2-10 years | 2x minimum | 1.5x multiplier | Standard incentives |
| Historical | 10+ years | 1x (archival) | 1x multiplier | Ideal for USPTO import |

### 5.4 Encryption Flow (Pre-Publication)

1. Inventor uploads patent draft
2. Client generates AES-256-GCM key
3. Encrypts document, uploads to IPFS → encrypted CID
4. Encrypts AES key with inventor's public key
5. Stores encrypted key in PatentLicense.sol
6. On licensing: re-encrypts AES key with licensee's public key
7. Post-publication: optionally uploads unencrypted version

### 5.5 Future: Full Patent Database on IPFS

```
USPTO Bulk Data → ETL Pipeline → IPFS Cluster → Citrate Index
                                  ~12M Patents
                                  ~50TB estimated
                                  Sharded by year
PatentIndex.sol ← Merkle roots per year shard → Verifiable completeness
```

---

## 7. AI Integration

### 7.1 Feature Matrix

| Feature | Tier | Method | Input | Output |
|---------|------|--------|-------|--------|
| Prior Art Search | ALL | Embeddings precompile (0x1001) | Claims/description text | Ranked matches with similarity % |
| Claim Drafting | ALL | MCP /v1/chat/completions | Invention description | Independent + dependent claims |
| Abstract Generation | ALL | MCP /v1/chat/completions | Claims + spec CID | 150-word patent abstract |
| Patent Classification | ALL | Embeddings precompile | Patent CID | Category assignment (on-chain) |
| IP Valuation | PROTECTED+ | MCP inference | Patent metadata, market data | Estimated value range |
| Infringement Monitoring | DEFENDED | Scheduled embedding scan | Patent embedding | Alerts when similarity > threshold |

### 7.2 On-Chain vs Off-Chain

- **On-chain (precompiles):** Classification, similarity scoring — results stored on-chain for searchability
- **Off-chain (MCP):** Claim drafting, abstract generation, valuation — results stored on IPFS

---

## 8. Frontend Architecture

### 8.1 Pages

| Page | Purpose |
|------|---------|
| DashboardPage | My patents, revenue, tier status |
| KYCPage | Identity verification wizard (redirect to provider) |
| MintPage | File a patent (6-step wizard) |
| SearchPage | AI-powered prior art search |
| PatentDetailPage | View patent, manage licenses |
| MarketplacePage | Browse/buy/sell patents |
| LegalDirectoryPage | Browse firms by jurisdiction + specialty |
| DefensePage | IP Stake Marketplace (crowdfund) |
| LicensingPage | Create/manage license agreements |
| CrossBorderPage | Cross-border coordinator tool |
| StoragePage | Node operator IPFS pinning rewards |

### 8.2 Mint Wizard Flow

```
Step 0: KYC VERIFICATION → One-time: verify identity via third-party provider (blocks all further steps if not complete)
Step 1: CONNECT & STAKE  → Connect wallet, stake ~$5 SALT, select tier
Step 2: PATENT DETAILS   → Title, category, AI-assisted abstract
Step 3: CLAIMS & PRIOR ART → Claim editor, AI prior art search
Step 4: UPLOAD & ENCRYPT → Drag-and-drop documents, optional encryption
Step 5: REVIEW & MINT   → Summary, disclaimer, mint patent NFT
```

### 8.3 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + Viem + Wagmi | Matches ReferenceApp, ChatVault, LoRAForge |
| Contracts | Solidity + Foundry | Matches all existing tutorials |
| IPFS | Local daemon via ipfsService.ts | Existing pattern from citrate_gui_v2 |
| Styling | Tailwind CSS | Matches existing tutorials |
| AI | Citrate MCP + on-chain precompiles | Native to Citrate ecosystem |

---

## 9. Modular IP Architecture

### 9.1 Shared Base (IPBase.sol)

```solidity
enum IPType { PATENT, TRADEMARK, COPYRIGHT }
```

Shared across all IP types:
- KYC identity verification (KYCRegistry.sol)
- IPFS storage + CID management
- TBA wallets (ERC-6551)
- Tier system (BASIC / PROTECTED / DEFENDED)
- SALT staking
- Revenue splits + ServicePool
- LegalEntityRegistry (firms tag themselves with `IPType[] specialties`)
- IP Stake Marketplace

### 9.2 Module Roadmap

| Phase | Module | Key Contracts |
|-------|--------|--------------|
| **Phase 1 (now)** | Patents | PatentNFT, PatentLicense, PatentMarketplace, PatentAI, PatentIPFS, PatentIndex |
| **Phase 2 (future)** | Trademarks | TrademarkNFT, TrademarkLicense, TrademarkAI (clearance search), TrademarkMonitor (use-in-commerce) |
| **Phase 3 (future)** | Copyrights | CopyrightNFT, CopyrightLicense, CopyrightAI (originality scoring), CopyrightRegistry (timestamp proof) |

---

## 10. Directory Structure

```
Tutorials/PatentMint/
├── contracts/
│   └── src/
│       ├── IPBase.sol
│       ├── KYCRegistry.sol
│       ├── PatentNFT.sol
│       ├── PatentLicense.sol
│       ├── PatentMarketplace.sol
│       ├── PatentTiers.sol
│       ├── PatentAI.sol
│       ├── PatentIPFS.sol
│       ├── PatentIndex.sol
│       ├── LegalEntityRegistry.sol
│       ├── LitigationFunding.sol
│       └── ServicePool.sol
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── config/
│   └── package.json
├── test/
├── scripts/
├── docs/
│   └── DESIGN_SPEC.md
└── README.md
```

---

## 11. Existing Citrate Patterns Leveraged

| Pattern | Source | Used For |
|---------|--------|----------|
| ERC-721 + on-chain SVG | ModelNFT.sol | Patent NFT rendering |
| Encrypted IPFS storage | ChatVault.sol | Pre-publication patent docs |
| IPFS pinning incentives | IPFSIncentives.sol | PATENT_DOCUMENT ModelType |
| CID + contentHash storage | ModelRegistry.sol | Patent document integrity |
| Model type multipliers | IPFSIncentives.sol | Tiered pinning rewards |
| Frontend IPFS service | ipfsService.ts | Upload/download/encrypt |
| Foundry test patterns | All tutorials | Contract testing |
| React + Viem + Wagmi | All tutorials | Frontend stack |
