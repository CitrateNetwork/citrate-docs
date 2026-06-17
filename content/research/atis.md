---
title: ATIS, Analog Token Importance Scoring
codex_slug: /research/atis
tier: academic
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/Gradient_Papers_No5_ATIS_v3.md
surfaces: [RES-atis]
audited_against_sha: cd729ed
status: Theoretical
created: 2026-06-17T00:00:00Z
author: Citrate team
---

ATIS is a research direction, not a feature. It asks whether the decision of which tokens a transformer
should attend to could be made in analog hardware, before the digital arithmetic begins, to push the
energy cost of inference below the digital floor. This page is for researchers; it summarizes Gradient
Paper V and is clear about what does not exist: there is no prototype, no simulation, and no code in the
Citrate Network for any of it.

## What it is

Pruning tokens that contribute little to the next layer is a well-studied way to speed up attention,
usually two to four times. ATIS, Analog Token Importance Scoring, proposes computing the importance score
itself in a Field-Programmable Analog Array placed before the digital query and key projection, so the
cheap analog stage decides which tokens are worth the expensive digital stage. The appeal is energy:
attention grows with the square of sequence length, and on long contexts that quadratic term dominates
both memory bandwidth and power.

This is theoretical work. The paper is honest that the naive version does not pay off, and its value is
the framing, filter before the expensive operation, together with a clear account of why the obvious
design fails. We carry it here in the same spirit: as a direction a researcher might pursue on the
Citrate substrate, not as anything the network does.

## How to use it

There is nothing to run. Read the paper if you work on inference hardware or efficient attention, and
treat the page as orientation. Where ATIS touches the network is only conceptual: the network pays for
inference by work performed, so any genuine energy saving would flow to the operator who earned it, which
is the economic reason a researcher might build on the substrate at all. The relevant built surfaces are
the hardware-agnostic inference router and the attestation gates, described under
[verifiable inference](/research/verifiable-inference), neither of which depends on ATIS.

## Reference

A summary of the paper's structure, not a copy. The honest core is the second table: the naive design
spends almost all its energy converting digital signals to analog.

| Section | Claim |
|---|---|
| The problem | Attention is quadratic in sequence length; on 8K-token contexts the matrix dominates energy and bandwidth. |
| The proposal | Insert an analog filter between embedding and digital attention: convert to analog, approximate dot products against a learned query prototype, compare to a threshold, and run the digital pipeline only on the surviving tokens. |
| The bottleneck | The digital-to-analog conversion, not the analog compute, dominates the budget, so the naive design costs more than the attention it was meant to avoid. |
| The honest conclusion | ATIS does not pay off without an architecture that removes the conversion step. |

The paper sketches three conversion-free directions, all multi-year hardware research: charge-domain
compute inside memory sense amplifiers, mixed-signal stores that keep embeddings analog from training
time, and photonic dot products driven by a laser modulator. It also notes a purely digital fallback: a
small importance-predicting network run before attention captures most of the framing's value, because
pruning the token set shrinks the attention matrix quadratically across layers, without any analog
hardware at all.

## Design rationale

The paper earns its place in the series by being candid rather than promising. An earlier revision named
the conversion bottleneck; this one sharpens it into the conclusion that the naive approach should not be
built. That is the right altitude for a research page: state the idea plainly, state why it is hard, and
do not let the framing's appeal stand in for a result. The connection to Citrate is economic, not
technical. Because the network settles work performed, an operator who found a real efficiency would keep
the gain, which is the incentive that makes hardware research on the substrate rational. The network does
not require ATIS, and ATIS does not require the network.

## Access and canon

Academic tier. Nothing here is sensitive; the paper cites public literature and commercial datasheets,
and there is no Citrate Network surface, contract, or endpoint involved. This is the soil intelligence
could one day run on more cheaply, described as research and not as a claim.

## Source and verification

- Paper, linked, not copied: `citrate-docs/gradient_papers_v3/Gradient_Papers_No5_ATIS_v3.md`.
- Code anchor: none. This is hardware research with no implementation in `citrate-chain`, and the series
  index correctly lists the paper with no code anchor.
- Status: Theoretical. There is no Field-Programmable Analog Array prototype, no SPICE simulation, and no
  measured energy figure. The digital importance-predicting fallback is a researcher's option, not a
  shipped feature, and the custom-hardware attestation extension is specified pending the attestation
  surface. This page frames a direction honestly; it does not describe a feature of the network.
- Audited against SHA: `cd729ed` (citrate-docs).
- Related: [the Gradient Papers](/research/gradient-papers), [verifiable inference](/research/verifiable-inference).
