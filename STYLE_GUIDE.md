---
created: 2026-06-17T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: ATLAS-S0
---

# Citrate Atlas, Documentation Style Guide

This is the bar. Every page in Citrate Atlas is measured against it before it ships. It exists so the
documentation reads as if our team wrote it: plainly, accurately, and in one voice. Source of truth for
voice is the Citrate brand spec; source of truth for facts is the code.

## 1. Voice, the six pillars

- **Plain.** Ordinary words. Use a technical term only when it is the precise word; otherwise replace it
  with clearer English. Never reach for jargon to sound sophisticated.
- **Patient.** Sentences are allowed to develop. An extra clause or a comma is fine. Do not race to the verb.
- **Specific.** Numbers, dates, names, file paths. A specific claim is stronger than a vague one, and we
  have the specifics.
- **Honest.** A feature in development is described as in development. A risk is named, not buried.
- **Naturalist.** When a metaphor is needed it comes from the natural world: orchards, soil, seasons,
  grafting, pruning, harvest. Never sports, military, or business metaphors.
- **Quietly confident.** Describe, do not sell. The reader is an intelligent adult.

The Citrate sentence has three movements: state a concrete fact, expand it with a specific detail, place
it in the longer view. Not every sentence needs all three, but the rhythm should be felt across a page.

## 2. Casing, person, punctuation

- Sentence case for headings, buttons, nav. Title Case only for product names and proper nouns.
- "We" for Citrate, "you" for the reader. We are **operators**, not founders or visionaries.
- **No em-dashes.** Replace every em-dash with a comma or an ellipsis, whichever fits the pause. (This is a
  standing team directive and overrides the brand spec, which permits them.)
- Oxford comma always. Semicolons are allowed to do work. No exclamation points outside error states.
- No emoji, anywhere. Unicode marks (`·`, `→`) are acceptable inline, sparingly.
- Cut the third adjective. Specifics earn trust; adjectives accumulate suspicion.

## 3. Forbidden words (do not appear in any page)

revolutionary, revolutionize, cutting-edge, bleeding-edge, state-of-the-art, disrupt, disruptive,
game-changer, paradigm shift, unleash, unlock (metaphorical), empower, seamless, robust, scalable (as
buzzword), Web3, to the moon, WAGMI, GM, ser, anon, fren, synergy, leverage (as verb), pivot, deep-dive,
circle back, enterprise-grade, bank-grade, military-grade (name the certification instead), AI-powered,
AI-first, supercharge, intelligent (as a product claim).

## 4. Mandatory vocabulary substitutions

| Do not write | Write instead |
|---|---|
| blockchain | distributed network, public ledger, the network |
| crypto, cryptocurrency | compute marketplace, the network |
| token | credit, work receipt (avoid naming SALT unless required) |
| wallet | account, Citrate Keyring (UI may read "Wallet" where users expect it) |
| mining / miner | validating / node operator |
| decentralized | distributed, peer-operated, on-premise |
| tokenomics | network economics, marketplace economics |
| AI-powered, intelligent | describe what it does |
| DeFi, NFT | (avoid entirely) |

## 5. Product-surface names (use where relevant)

| Surface | Name |
|---|---|
| Public ledger | Citrate Network |
| Private on-prem instance | Citrate Ground |
| Compute marketplace | Citrate Market |
| Federated learning surface | Citrate Orchard |
| Node operator daemon | Citrate Node |
| Account / keys | Citrate Keyring |
| Schools program | Citrate Schools |
| This documentation product | **Citrate Atlas** |

## 6. Canonical truths (state where relevant; never contradict)

- Citrate is a **substrate, not an AI**. It is the soil intelligence runs on.
- The network is a public ledger (Citrate Network) paired with private, on-premise instances (Citrate
  Ground). On-prem sovereignty is the default; a participant's data and models stay on their hardware.
- The chain is a BlockDAG written in Rust, GhostDAG consensus: k = 18, finality depth 100, a 100-validator
  BFT committee at a 67% threshold, a checkpoint every 50 blocks. Chain id 40204 is testnet.
- Mainnet is targeted for Q1 2027; school pilots run the prior summer.
- Every node operator and machine on the public network is KYC'd through CLEAR. Citrate holds no sensitive
  personal data from that check.
- SALT settles work performed. It is not the product and not a speculative instrument. Avoid naming it
  unless a page genuinely requires it.
- US K-12 public schools have free access in perpetuity.
- We meet each industry's compliance floor before we ask anyone to build on us: FERPA, COPPA, CIPA, HIPAA,
  SOC 2, ITAR, by deployment context.

## 7. Status labels (per page, and per claim where it varies)

Replace "draft / pre-audit" with the honest four:

- **Implemented** , the code exists and runs (note "pre-audit" if it has not had an external audit).
- **Specified** , designed and written down (TLA+/Gherkin/RFC), not yet built.
- **Verified** , formally checked or externally audited (say how: "TLA+ checked", "testnet 40204").
- **Theoretical** , a research direction, not yet specified.

Put the status in the page's "Source & verification" section, and inline on any claim whose status differs
from the page default.

## 8. The page template (every content page follows this)

Frontmatter carries the title. The reader chrome renders it, so the body **must not** open with a `# H1`
that repeats the title. Body sections, in order (omit a section only when it genuinely does not apply):

1. **Lede.** One or two sentences: what this is and who it is for.
2. **What it is.** The substrate / on-prem framing where it applies; the mental model.
3. **How to use it.** Numbered, step by step. The reader should be able to follow it like a recipe.
4. **Reference.** The audited surface (methods, commands, fields, screens), each item citing its code path.
5. **Design rationale.** Why it is built this way; the trade-off taken. Keep it short and specific.
6. **Failure modes.** Where the surface is security relevant: what can go wrong, how the system fails closed.
7. **Access & canon.** The tier, and the on-prem / KYC-via-CLEAR / compliance notes that belong here.
8. **Source & verification.** Source repo + path, the SHA audited against, and the status label(s).

Tutorials keep a numbered-step structure and link the relevant sandbox.

## 9. Mechanical checks (CI enforces)

`npm run content-lint` fails the build on: any em-dash, any forbidden word, any banned vocabulary term. It
runs in CI next to `verify:bundle`. A page is not done until it is lint-clean, carries a status label and a
source SHA, and does not repeat its title.
