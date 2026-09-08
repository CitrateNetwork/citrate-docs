---
title: Entitlements and capabilities
codex_slug: /sdks/entitlements
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/entitlements/capabilities.ts
surfaces: [SDK-entitlements]
audited_against_sha: 9664fa8
status: Implemented
created: 2026-07-25T00:00:00Z
author: Citrate team
---

Citrate Identity mints a signed entitlement claim, `https://citrate.ai/entitlement`, that carries one of five
tiers: `public`, `commercial`, `commercial.kyc`, `academic`, `confidential`. The SDK ships one canonical way to
read that claim so relying parties stop disagreeing about what a tier means. It is available in the TypeScript
SDK (`@citratelabs/sdk`, the `entitlements` namespace) and the Python SDK (`citrate_sdk.entitlements`).

## What it is

The model is capabilities, not a global rank. There is no "tier A outranks tier B" comparison anywhere.
`normalizeTier` collapses any unknown value to `public` and never escalates; `capabilities` returns an explicit
set of what a principal may do. This matters because a bare ordinal is fragile. An unmapped tier that sorts as
`undefined` once took a relying party's whole app down, and two apps that ordered the tiers differently reached
opposite authorization decisions on the same signed claim.

The one decision worth stating plainly: `commercial.kyc` is the tier every KYC-verified principal receives, and
it opens ecosystem transactions but not confidential content. Passing KYC lets you transact; it does not buy a
content seat. `commercial.kyc` is not above `commercial`; it carries the same content capabilities.

## How to use it

```typescript
import { entitlements } from '@citratelabs/sdk';

entitlements.normalizeTier('made-up');                        // "public", unknown never escalates
entitlements.capabilities('commercial.kyc').ecosystemTx;      // true
entitlements.capabilities('commercial.kyc').confidentialDocs; // false

// can() applies expiry and the role bypass, matching the authority's resolveEntitlementClaim.
entitlements.can(claim, 'confidentialDocs');
```

```python
from citrate_sdk import entitlements

entitlements.normalize_tier("made-up")                        # "public"
entitlements.capabilities("commercial.kyc").ecosystem_tx      # True
entitlements.capabilities("commercial.kyc").confidential_docs # False
entitlements.can(claim, "confidential_docs")
```

## Reference

| Name | What it does |
|---|---|
| `normalizeTier(value)` | Return one of the five tiers; anything unknown collapses to `public`. Never escalates. |
| `capabilities(tier, overrides?)` | The capability set: `ecosystemTx`, `gatewayKeys`, `academicData`, `confidentialDocs`. |
| `can(claim, capability, opts?)` | Whether a claim grants a capability, applying expiry and the `citrateRole` bypass. |
| `DEFAULT_CAPABILITIES` | The canonical tier to capability map an RP can override. |

The default map: `public` grants nothing; `commercial` and `commercial.kyc` grant `ecosystemTx` and
`gatewayKeys`; `academic` adds `academicData`; `confidential` adds `confidentialDocs`. A role-bearing principal
(`citrateRole` set) bypasses the gate, and an expired claim collapses to `public`.

## Design rationale

Shipping a single default map is the point: relying parties import it instead of each inventing an ordering, so
the federation cannot disagree by accident. An RP with a genuinely different policy passes an override map,
which keeps the divergence explicit and local rather than silent and global.

## Access and canon

Public. The tiers and capabilities are authorization facts, not secrets, and are derivable from public on-chain
entitlement claims.

## Source and verification

- Source: `citrate-sdk-js/src/entitlements/capabilities.ts`, `citrate-sdk-python/citrate_sdk/entitlements.py`.
- Status: Implemented (pre-audit); the JavaScript and Python matrices are unit-tested to give identical answers.
