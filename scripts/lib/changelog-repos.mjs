// PBA-L3c-037: which repos the PUBLIC changelog may recall from. It applies the SAME tier policy as
// Ask chat (lib/ai/memory.ts): the declared tiers in lib/ai/repo-tiers.json, merged under the
// MEMORY_REPO_TIERS override, with unlisted repos at MEM_DEFAULT_TIER (default "confidential", fail
// closed). Only repos that resolve to "public" are recalled, so the public page never shows memory the
// chat would gate. The declared-confidential repos are excluded outright (defense in depth).
import fs from "node:fs";

const DECLARED = JSON.parse(fs.readFileSync(new URL("../../lib/ai/repo-tiers.json", import.meta.url), "utf8"));

const DEFAULT_CANDIDATES =
  "citrate-chain,citrate-core,citrate-inference-gateway,citrate-identity,citrate-docs,citrate-sdk-js";

export function changelogRepos(env = process.env) {
  let map = { ...DECLARED };
  const raw = env.MEMORY_REPO_TIERS;
  if (raw && raw.trim()) {
    try {
      map = { ...DECLARED, ...JSON.parse(raw) };
    } catch {
      /* malformed override: declared defaults only (same as lib/ai/memory.ts) */
    }
  }
  const fallback = env.MEM_DEFAULT_TIER || "confidential";
  return (env.CHANGELOG_REPOS || DEFAULT_CANDIDATES)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((r) => DECLARED[r] !== "confidential")
    .filter((r) => (map[r] ?? fallback) === "public");
}
