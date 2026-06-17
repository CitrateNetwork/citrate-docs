# Release process — Citrate Codex (Tier 1)

Per `.github/AUDIT_POSTURE.md` (federation Tier-1 obligations). Stable tags require a named-auditor
attestation; every release ships an SBOM and a keyless signature.

## Gate (every tag)

1. **CI green** — `.github/workflows/ci.yml`: `typecheck` + `build` + **`verify:bundle`** (the
   ConfidentialNeverInBuild invariant) + SBOM.
2. **SBOM** — `npm run sbom` → `sbom.cyclonedx.json` (CycloneDX), attached to the GitHub Release.
3. **Signing** — **cosign keyless (OIDC)** signs every release artifact + the SBOM; the signature +
   certificate are attached to the Release.
4. **Branch protection** — `main` requires the `ci` check + ≥1 reviewer; force-push disabled (Rule 10).
   Signed commits encouraged; required for stable tags.

## Tag policy

| Tag | Audit required | Visibility |
|---|---|---|
| `v0.x.y-alpha/beta/rc.N` | No (prerelease) | Draft GH Release, public artifacts |
| `v0.x.y` stable | **Yes** — named-auditor attestation w/ commit SHA | Promoted from draft after attestation |
| `v1.0.0` / major | **Yes** — re-audit | Promoted after attestation |

## Confidential safety at release

The release artifact is the **client build** — it must contain zero Confidential content. The
`verify:bundle` step proves this (sentinel absent from `.next/static`); Confidential bodies live only in
the server-only store and are served at runtime by `/api/content` after auth. No repo visibility flip is
part of any release (the repo stays private; the deployed site is the public surface).

## Steps

```bash
npm ci
npm run typecheck
npm run build            # postbuild runs verify:bundle automatically
npm run verify:bundle    # explicit gate
npm run sbom             # sbom.cyclonedx.json
# tag, draft GH Release, attach SBOM, cosign sign, (stable) attach auditor attestation, promote
```
