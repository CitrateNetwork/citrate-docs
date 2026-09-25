/**
 * MCP key pepper rule, shared by the resolver (lib/auth/mcp-keys.ts) and the mint script
 * (scripts/mint-mcp-key.mjs). No server-only or path-alias imports, so plain node can load it.
 */

/** Minimum length of the server-side pepper (`MCP_KEY_PEPPER`), after trimming. */
export const MIN_MCP_KEY_PEPPER_LENGTH = 32;
/** Minimum distinct characters in the pepper (rejects "aaaa…" / whitespace padding). */
export const MIN_MCP_KEY_PEPPER_DISTINCT = 8;

export type McpPepperStatus = "ok" | "missing" | "weak";

/** Status of a pepper value: set, >= 32 chars, >= 8 distinct characters, no surrounding whitespace. */
export function pepperStatus(raw: string | undefined | null): McpPepperStatus {
  const v = typeof raw === "string" ? raw : "";
  if (!v.trim()) return "missing";
  const p = v.trim();
  if (p !== v || p.length < MIN_MCP_KEY_PEPPER_LENGTH || new Set(p).size < MIN_MCP_KEY_PEPPER_DISTINCT) return "weak";
  return "ok";
}

/** Whether `MCP_KEY_PEPPER` in `env` is usable. */
export function mcpPepperStatus(env: NodeJS.ProcessEnv = process.env): McpPepperStatus {
  return pepperStatus(env.MCP_KEY_PEPPER);
}
