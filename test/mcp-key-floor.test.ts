/**
 * PBA R2 / CodeQL js/insufficient-password-hash #5: MCP keys are looked up by HMAC-SHA256 under a
 * server-only pepper, and only minted-format keys (`cdk_` + 43 base64url chars) can resolve.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { resolveMcpKeyCap, MIN_MCP_KEY_LENGTH, MCP_KEY_RE, MIN_MCP_KEY_PEPPER_LENGTH, mcpPepperStatus, mcpStoreConfigured } from "@/lib/auth/mcp-keys";
import { vi } from "vitest";
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
    expect(resolveMcpKeyCap(key, NOW, { ...env, MCP_KEY_PEPPER: TEST_PEPPER.slice(0, MIN_MCP_KEY_PEPPER_LENGTH - 1) } as never).tier).toBe("public");
    expect(resolveMcpKeyCap(key, NOW, { ...env, MCP_KEY_PEPPER: "another-pepper-9876543210-zyxwvutsrq" } as never).tier).toBe("public");
    // a pepper of exactly the minimum length works
    const p32 = "0123456789abcdefghijklmnopqrstuv"; // exactly 32, >= 8 distinct
    expect(resolveMcpKeyCap(key, NOW, { MCP_KEY_PEPPER: p32, MCP_API_KEYS: JSON.stringify({ [digest(key, p32)]: { tier: "commercial", sub: "s" } }) } as never).tier).toBe("commercial");
  });

  it("an empty or short pepper disables resolution even when the store is keyed under that pepper", () => {
    const k = testKey("r");
    const short = TEST_PEPPER.slice(0, MIN_MCP_KEY_PEPPER_LENGTH - 1);
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

describe("pepper quality and diagnosability (verify2)", () => {
  it("mcpPepperStatus: missing / weak / ok", () => {
    expect(mcpPepperStatus({} as never)).toBe("missing");
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: " ".repeat(40) } as never)).toBe("missing");
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: "a".repeat(40) } as never)).toBe("weak");
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: "abcdefg".repeat(6) } as never)).toBe("weak"); // 7 distinct
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: "abcdefgh".repeat(4) } as never)).toBe("ok"); // 32, 8 distinct
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: ` ${TEST_PEPPER}` } as never)).toBe("weak"); // padded
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: TEST_PEPPER.slice(0, 31) } as never)).toBe("weak");
    expect(mcpPepperStatus({ MCP_KEY_PEPPER: TEST_PEPPER } as never)).toBe("ok");
  });

  it("a whitespace-only pepper refuses a key stored under it", () => {
    const k = testKey("v");
    const ws = " ".repeat(40);
    expect(resolveMcpKeyCap(k, NOW, { MCP_KEY_PEPPER: ws, MCP_API_KEYS: JSON.stringify({ [digest(k, ws)]: { tier: "academic" } }) } as never).tier).toBe("public");
  });

  it("warns once in the server log when a store is configured without a usable pepper", async () => {
    vi.resetModules();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const mod = await import("@/lib/auth/mcp-keys");
      const env = { MCP_API_KEYS: JSON.stringify({ abc: { tier: "academic" } }) } as never;
      expect(mod.mcpStoreConfigured(env)).toBe(true);
      mod.resolveMcpKeyCap(testKey("a"), NOW, env);
      mod.resolveMcpKeyCap(testKey("b"), NOW, env);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toMatch(/MCP_KEY_PEPPER is missing/);
      // no store: silent
      spy.mockClear();
      vi.resetModules();
      const mod2 = await import("@/lib/auth/mcp-keys");
      mod2.resolveMcpKeyCap(testKey("a"), NOW, {} as never);
      expect(spy).not.toHaveBeenCalled();
      expect(mcpStoreConfigured({} as never)).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("mint script applies the resolver's pepper rule", () => {
  const peppers = [
    "a".repeat(40),
    " ".repeat(40),
    ` ${TEST_PEPPER}`,
    `${TEST_PEPPER}\n`,
    TEST_PEPPER.slice(0, 31),
    "abcdefg".repeat(6),
    "abcdefgh".repeat(4),
    TEST_PEPPER,
  ];
  it.each(peppers)("mint accepts %j iff mcpPepperStatus says ok", (p) => {
    const ok = mcpPepperStatus({ MCP_KEY_PEPPER: p } as never) === "ok";
    const mint = () => mintMcpKey({ pepper: p, tier: "academic", sub: "org:p" });
    if (ok) {
      const { key, entry } = mint();
      // ...and a key it mints resolves under that pepper.
      expect(resolveMcpKeyCap(key, NOW, { MCP_KEY_PEPPER: p, MCP_API_KEYS: JSON.stringify(entry) } as never).tier).toBe("academic");
    } else {
      expect(mint).toThrow(/MCP_KEY_PEPPER is (weak|missing)/);
    }
  });
});

describe("mint script runs on node 20 (no TypeScript imports)", () => {
  it("scripts/mint-mcp-key.mjs and lib/auth/mcp-pepper.mjs import no .ts file", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = join(__dirname, "..");
    const mint = readFileSync(join(root, "scripts", "mint-mcp-key.mjs"), "utf8");
    expect(mint).not.toMatch(/from\s+["'][^"']+\.(c|m)?ts["']/);
    expect(mint).toMatch(/from "\.\.\/lib\/auth\/mcp-pepper\.mjs"/);
    const rule = readFileSync(join(root, "lib", "auth", "mcp-pepper.mjs"), "utf8");
    expect(rule).not.toMatch(/^\s*import\s/m);
  });
});
