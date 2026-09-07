import { describe, it, expect } from "vitest";
import { resolveEntitlement } from "@/lib/auth/entitlement";
import { PRINCIPALS } from "@/prototype/fixtures";

const ENTITLEMENT_CLAIM = "https://citrate.ai/entitlement";

describe("resolveEntitlement (DOC-B-006)", () => {
  it("does NOT trust a minted tier/role without verified KYC", () => {
    // A forward-compat minted claim asserting confidential+admin, from a caller with no KYC,
    // must be narrowed to public with no role — the minted branch must not out-trust the lookup branch.
    const e = resolveEntitlement(
      { [ENTITLEMENT_CLAIM]: { tier: "confidential", citrateRole: "admin" } },
      { kycStatus: "none" }
    );
    expect(e?.tier).toBe("public");
    expect(e?.citrateRole).toBeUndefined();
  });

  it("never resolves a role from a token claim (roles are server-side)", () => {
    // Even with verified KYC, a token-asserted citrateRole must not be honoured verbatim.
    const e = resolveEntitlement(
      { [ENTITLEMENT_CLAIM]: { tier: "commercial", citrateRole: "admin" } },
      { kycStatus: "verified" }
    );
    expect(e?.citrateRole).toBeUndefined();
  });

  it("does not grant a principal's entitlement on a self-asserted email match", () => {
    // Pick a privileged (non-public) principal and present only its email.
    const privileged = PRINCIPALS.find((p) => p.entitlement.tier !== "public" && p.email);
    expect(privileged).toBeDefined();
    const e = resolveEntitlement({}, { email: privileged!.email });
    expect(e?.tier).toBe("public");
  });

  it("still resolves a legitimate principal by verified sub", () => {
    const p = PRINCIPALS.find((x) => x.entitlement.tier !== "public" && x.sub);
    const e = resolveEntitlement({}, { sub: p!.sub, kycStatus: "verified" });
    expect(e?.tier).toBe(p!.entitlement.tier);
  });
});
