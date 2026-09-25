/**
 * PBA R2 / CodeQL js/insufficient-password-hash #5: MCP keys are looked up by HMAC-SHA256 under a
 * server-only pepper, and only minted-format keys (`cdk_` + 43 base64url chars) can resolve.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { resolveMcpKeyCap, MIN_MCP_KEY_LENGTH, MCP_KEY_RE, MIN_MCP_KEY_PEPPER_LENGTH } from "@/lib/auth/mcp-keys";
// @ts-expect-error -- plain ESM script
import { mintMcpKey } from "@/scripts/mint-mcp-key.mjs";
import { TEST_PEPPER, digest, storeEnv, testKey } from "./helpers/mcp-key";

const NOW = Date.now();

describe("MCP key format, pepper and HMAC", () => {
  it("floor and format constants", () => {
    expect(MIN_MCP_KEY_LENGTH).toBe(32);
    expect(MIN_MCP_KEY_PEPPER_LENGTH).toBe(32);
    expect(MCP_KEY_RE.test(testKey("a"))).toBe(true);
  });

  it("the verifier's case: 'a'*32 (and any non-minted string) never resolves, even if stored", () => {
    for (const k of ["a".repeat(32), "a".repeat(64), `cdk_${"a".repeat(42)}`, `cdk_${"a".repeat(44)}`, `CDK_${"a".repeat(43)}`, `cdk_${"a".repeat(42)}=`]) {
      expect(resolveMcpKeyCap(k, NOW, storeEnv({ [k]: { tier: "confidential", sub: "x" } }) as never).tier).toBe("public");
    }
  });

  it("a minted key resolves under the pepper; not without it, not with a short one, not with another one", () => {
    const { key, entry } = mintMcpKey({ pepper: TEST_PEPPER, tier: "academic", sub: "org:m" });
    expect(key).toMatch(MCP_KEY_RE);
    const env = { MCP_KEY_PEPPER: TEST_PEPPER, MCP_API_KEYS: JSON.stringify(entry) };
    expect(resolveMcpKeyCap(key, NOW, env as never)).toEqual({ tier: "academic", sub: "org:m", expiresAt: null });
    expect(resolveMcpKeyCap(key, NOW, { MCP_API_KEYS: env.MCP_API_KEYS } as never).tier).toBe("public");
    expect(resolveMcpKeyCap(key, NOW, { ...env, MCP_KEY_PEPPER: "x".repeat(MIN_MCP_KEY_PEPPER_LENGTH - 1) } as never).tier).toBe("public");
    expect(resolveMcpKeyCap(key, NOW, { ...env, MCP_KEY_PEPPER: "y".repeat(40) } as never).tier).toBe("public");
    // a pepper of exactly the minimum length works
    const p32 = "z".repeat(MIN_MCP_KEY_PEPPER_LENGTH);
    expect(resolveMcpKeyCap(key, NOW, { MCP_KEY_PEPPER: p32, MCP_API_KEYS: JSON.stringify({ [digest(key, p32)]: { tier: "commercial", sub: "s" } }) } as never).tier).toBe("commercial");
  });

  it("an empty or short pepper disables resolution even when the store is keyed under that pepper", () => {
    const k = testKey("r");
    const short = "s".repeat(MIN_MCP_KEY_PEPPER_LENGTH - 1);
    const under = (p: string) => JSON.stringify({ [digest(k, p)]: { tier: "academic", sub: "r" } });
    expect(resolveMcpKeyCap(k, NOW, { MCP_KEY_PEPPER: short, MCP_API_KEYS: under(short) } as never).tier).toBe("public");
    expect(resolveMcpKeyCap(k, NOW, { MCP_KEY_PEPPER: "", MCP_API_KEYS: under("") } as never).tier).toBe("public");
    expect(resolveMcpKeyCap(k, NOW, { MCP_API_KEYS: under("") } as never).tier).toBe("public");
  });

  it("a pre-R2 bare-SHA-256 store entry no longer resolves", () => {
    const k = testKey("q");
    const env = { MCP_KEY_PEPPER: TEST_PEPPER, MCP_API_KEYS: JSON.stringify({ [createHash("sha256").update(k).digest("hex")]: { tier: "academic" } }) };
    expect(resolveMcpKeyCap(k, NOW, env as never).tier).toBe("public");
  });

  it("surrounding whitespace is trimmed before the format check", () => {
    const k = testKey("w");
    expect(resolveMcpKeyCap(` ${k} `, NOW, storeEnv({ [k]: { tier: "academic", sub: "w" } }) as never).tier).toBe("academic");
  });

  it("mintMcpKey refuses a missing/short pepper, a bad tier and an empty sub; keys are unique", () => {
    expect(() => mintMcpKey({ pepper: "short", tier: "academic", sub: "s" })).toThrow(/MCP_KEY_PEPPER/);
    expect(() => mintMcpKey({ pepper: TEST_PEPPER, tier: "root", sub: "s" })).toThrow(/tier/);
    expect(() => mintMcpKey({ pepper: TEST_PEPPER, tier: "academic", sub: " " })).toThrow(/sub/);
    const a = mintMcpKey({ pepper: TEST_PEPPER, tier: "academic", sub: "s", expiresAt: 5 });
    const b = mintMcpKey({ pepper: TEST_PEPPER, tier: "academic", sub: "s" });
    expect(a.key).not.toBe(b.key);
    expect(Object.values(a.entry)[0]).toEqual({ tier: "academic", sub: "s", expiresAt: 5 });
    expect(Object.keys(a.entry)[0]).toBe(digest(a.key));
  });
});
