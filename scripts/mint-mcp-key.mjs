#!/usr/bin/env node
// Mint a docs MCP API key (PBA R2, CodeQL js/insufficient-password-hash #5).
//
//   MCP_KEY_PEPPER=<server pepper, >= 32 chars> node scripts/mint-mcp-key.mjs --tier commercial --sub org:acme [--days 90]
//
// Prints the new key ONCE (hand it to the partner over a secure channel) and the JSON entry to merge
// into MCP_API_KEYS on the deployment. The key is `cdk_` + 32 random bytes (base64url); the store is
// keyed by HMAC-SHA256(key, MCP_KEY_PEPPER), matching lib/auth/mcp-keys.ts.
import { createHmac, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export const MCP_KEY_PREFIX = "cdk_";
const TIERS = new Set(["public", "commercial", "academic", "confidential"]);

export function mintMcpKey({ pepper, tier, sub, expiresAt = null }) {
  if (typeof pepper !== "string" || pepper.length < 32) throw new Error("MCP_KEY_PEPPER must be set (>= 32 chars)");
  if (!TIERS.has(tier)) throw new Error(`tier must be one of ${[...TIERS].join(", ")}`);
  if (typeof sub !== "string" || !sub.trim()) throw new Error("sub is required (e.g. org:acme)");
  const key = MCP_KEY_PREFIX + randomBytes(32).toString("base64url");
  const digest = createHmac("sha256", pepper).update(key).digest("hex");
  return { key, entry: { [digest]: { tier, sub: sub.trim(), expiresAt } } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const days = Number(opt("days") ?? 0);
  try {
    const { key, entry } = mintMcpKey({
      pepper: process.env.MCP_KEY_PEPPER,
      tier: opt("tier"),
      sub: opt("sub"),
      expiresAt: days > 0 ? Date.now() + days * 86_400_000 : null,
    });
    console.log(`key (shown once): ${key}`);
    console.log(`merge into MCP_API_KEYS: ${JSON.stringify(entry)}`);
  } catch (e) {
    console.error(`[mint-mcp-key] ${e.message}`);
    process.exit(1);
  }
}
