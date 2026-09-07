/**
 * Entitlement resolution — the RP-side mapping from a verified identity to a Codex tier (S2).
 *
 * citrate-identity does NOT yet mint an `entitlement` claim (verified @4aa869c: scopes are
 * `openid profile wallet kyc offline_access`; claims are sub/wallet_address/wallets/signing_method/
 * kyc_status). So Codex resolves the entitlement itself from:
 *   1. a minted `entitlement` claim, IF present in the token (forward-compatible override) — a token
 *      may ASSERT a tier but never mint a role, and a non-public assertion still requires verified KYC;
 *   2. else an entitlements SOURCE keyed by a non-forgeable id (sub / signature-proven wallet — NEVER
 *      the self-asserted `email` claim) + the token's kyc_status.
 *
 * In this prototype the SOURCE is the fixtures (PRINCIPALS). In production it is the seat/contracts
 * table (Squad ③ Growth) + the team operators roster + time-gated auditor enrollments — see
 * PLANSET/07_IMPLEMENTATION_AND_HARDENING_PLAN.md §2. The shape and the chokepoint are identical
 * either way; only this lookup is swapped.
 */
import { Entitlement, PRINCIPALS, normalizeTier } from "@/prototype/fixtures";

type Claims = Record<string, unknown>;

/** Namespaced claim the issuer WILL mint once the entitlement scope ships (forward-compatible). */
const ENTITLEMENT_CLAIM = "https://citrate.ai/entitlement";

export function resolveEntitlement(
  claims: Claims,
  ids: { sub?: string; walletAddress?: string; email?: string; kycStatus?: string }
): Entitlement | undefined {
  // 1. Minted claim wins (when the issuer adds it) — but the token is a mutable, self-asserted
  // channel, so it may only ASSERT a tier, never confer trust the lookup branch would refuse:
  //   - the SAME KYC narrowing applies (a non-public minted tier requires verified KYC), and
  //   - `citrateRole` is NEVER honoured from a token (roles are resolved server-side from the
  //     entitlements source, never from a claim). DOC-B-006: previously the minted branch trusted
  //     tier/orgId/citrateRole verbatim with no KYC gate — the less-trusted path was the guarded one.
  const minted = claims[ENTITLEMENT_CLAIM];
  if (minted && typeof minted === "object") {
    const m = minted as Partial<Entitlement>;
    // The issuer's tier vocabulary is wider than Atlas's — normalize it here, at the trust boundary,
    // so no unmapped tier string can reach TIER_RANK/TIER_META downstream.
    if (m.tier) {
      const tier = normalizeTier(m.tier);
      if (tier !== "public" && ids.kycStatus !== "verified") {
        return { tier: "public", orgId: null, expiresAt: null };
      }
      return {
        tier,
        orgId: m.orgId ?? null,
        // citrateRole intentionally dropped: a role is authority, and a token may not mint authority.
        milestone: m.milestone,
        expiresAt: m.expiresAt ?? null,
      };
    }
  }

  // 2. Look up the entitlements source by a NON-forgeable identifier (prototype: fixtures PRINCIPALS).
  // DOC-B-006: `email` is a self-asserted, never-verified claim (citrate-identity does not verify it),
  // so it is NOT a match key — matching is on `sub` or a signature-proven wallet address only.
  const match = PRINCIPALS.find(
    (p) =>
      (ids.sub && p.sub === ids.sub) ||
      (ids.walletAddress && p.walletAddress?.toLowerCase() === ids.walletAddress.toLowerCase())
  );
  if (match) {
    // KYC can only narrow, never widen: a commercial.kyc/commercial grant requires verified KYC.
    if (match.entitlement.tier !== "public" && ids.kycStatus && ids.kycStatus !== "verified") {
      return { tier: "public", orgId: null, expiresAt: null };
    }
    return match.entitlement;
  }

  // 3. No entitlement on record → Public (fail-safe; never escalate an unknown principal).
  return { tier: "public", orgId: null, expiresAt: null };
}
