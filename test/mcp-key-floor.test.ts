/**
 * MCP keys are matched by a fast hash (SHA-256), which is only sound for high-entropy random tokens.
 * A key shorter than MIN_MCP_KEY_LENGTH must never resolve to a grant, even if its hash is stored
 * (the precondition behind CodeQL js/insufficient-password-hash on lib/auth/mcp-keys.ts).
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { resolveMcpKeyCap, MIN_MCP_KEY_LENGTH } from "@/lib/auth/mcp-keys";

const h = (k: string) => createHash("sha256").update(k).digest("hex");
const NOW = Date.now();

describe("MCP key length floor", () => {
  it("is 32 characters", () => expect(MIN_MCP_KEY_LENGTH).toBe(32));

  it("a stored short key resolves to public; a stored key at the floor resolves to its tier", () => {
    const short = "a".repeat(MIN_MCP_KEY_LENGTH - 1);
    const ok = "b".repeat(MIN_MCP_KEY_LENGTH);
    const env = { MCP_API_KEYS: JSON.stringify({ [h(short)]: { tier: "academic", sub: "s" }, [h(ok)]: { tier: "academic", sub: "o" } }) };
    expect(resolveMcpKeyCap(short, NOW, env as never)).toEqual({ tier: "public", sub: "mcp:anon", expiresAt: null });
    expect(resolveMcpKeyCap(ok, NOW, env as never)).toEqual({ tier: "academic", sub: "o", expiresAt: null });
  });

  it("surrounding whitespace does not count toward the floor", () => {
    const k = ` ${"c".repeat(MIN_MCP_KEY_LENGTH - 1)} `;
    const env = { MCP_API_KEYS: JSON.stringify({ [h(k.trim())]: { tier: "academic", sub: "w" } }) };
    expect(resolveMcpKeyCap(k, NOW, env as never).tier).toBe("public");
  });
});
