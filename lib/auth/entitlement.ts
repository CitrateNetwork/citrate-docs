/**
 * Entitlement resolution — the RP-side mapping from a verified identity to a Codex tier (S2).
 *
 * citrate-identity does NOT yet mint an `entitlement` claim (verified @4aa869c: scopes are
 * `openid profile wallet kyc offline_access`; claims are sub/wallet_address/wallets/signing_method/
 * kyc_status). So Codex resolves the entitlement itself from:
 *   1. a minted `entitlement` claim, IF present in the token (forward-compatible override), else
 *   2. an entitlements SOURCE keyed by sub/wallet/email + the token's kyc_status.
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
  // 1. Minted claim wins (when the issuer adds it).
  const minted = claims[ENTITLEMENT_CLAIM];
  if (minted && typeof minted === "object") {
    const m = minted as Partial<Entitlement>;
    // The issuer's tier vocabulary is wider than Atlas's — normalize it here, at the trust boundary,
    // so no unmapped tier string can reach TIER_RANK/TIER_META downstream.
    if (m.tier) {
      return {
        tier: normalizeTier(m.tier),
        orgId: m.orgId ?? null,
        citrateRole: m.citrateRole,
        milestone: m.milestone,
        expiresAt: m.expiresAt ?? null,
      };
    }
  }

  // 2. Look up the entitlements source by sub / wallet / email (prototype: fixtures PRINCIPALS).
  const match = PRINCIPALS.find(
    (p) =>
      (ids.sub && p.sub === ids.sub) ||
      (ids.walletAddress && p.walletAddress?.toLowerCase() === ids.walletAddress.toLowerCase()) ||
      (ids.email && p.email.toLowerCase() === ids.email.toLowerCase())
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
