/** Test-only MCP key store builder matching lib/auth/mcp-keys.ts (HMAC under MCP_KEY_PEPPER). */
import { createHmac } from "node:crypto";

export const TEST_PEPPER = "test-pepper-0123456789-abcdefghijklmn"; // test-only, not a secret
/** A syntactically valid minted-format key (not random: tests only). */
export const testKey = (c: string) => `cdk_${c.repeat(43).slice(0, 43)}`;
export const digest = (key: string, pepper = TEST_PEPPER) => createHmac("sha256", pepper).update(key).digest("hex");
export function storeEnv(entries: Record<string, { tier: string; sub?: string; expiresAt?: number | null }>) {
  return {
    MCP_KEY_PEPPER: TEST_PEPPER,
    MCP_API_KEYS: JSON.stringify(Object.fromEntries(Object.entries(entries).map(([k, v]) => [digest(k), v]))),
  };
}
