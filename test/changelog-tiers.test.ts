/**
 * PBA-L3c-037 (INFO): the PUBLIC changelog recalled memory from repos (chain,
 * core, identity, inference-gateway, ...) that Ask chat treats as confidential
 * by default (unlisted repo -> MEM_DEFAULT_TIER, default "confidential"). The
 * changelog now selects repos with the SAME policy: only repos that resolve to
 * "public" for the chat are recalled onto the public page.
 */
import { describe, it, expect } from "vitest";
import { resolveRepoTiers, repoTierFrom } from "@/lib/ai/memory";
// @ts-expect-error -- plain ESM helper shared with scripts/gen-changelog.mjs
import { changelogRepos } from "@/scripts/lib/changelog-repos.mjs";

const CANDIDATES = ["citrate-chain", "citrate-core", "citrate-inference-gateway", "citrate-identity", "citrate-docs", "citrate-sdk-js", "citrate-security"];

describe("changelog repo selection matches the chat tier policy", () => {
  it("with default config no federation repo is public, so none is recalled", () => {
    expect(changelogRepos({})).toEqual([]);
  });

  it("repos opened to public in MEMORY_REPO_TIERS are recalled; everything else is not", () => {
    const env = { MEMORY_REPO_TIERS: JSON.stringify({ "citrate-docs": "public", "citrate-sdk-js": "public", "citrate-chain": "commercial" }) };
    expect(changelogRepos(env)).toEqual(["citrate-docs", "citrate-sdk-js"]);
  });

  it("agrees with lib/ai/memory for every candidate under several configs", () => {
    const configs = [
      {},
      { MEMORY_REPO_TIERS: JSON.stringify({ "citrate-docs": "public", "citrate-security": "public" }) },
      { MEM_DEFAULT_TIER: "public" },
    ];
    for (const env of configs) {
      const saved = { ...process.env };
      Object.assign(process.env, env);
      try {
        const map = resolveRepoTiers(env.MEMORY_REPO_TIERS);
        const chatPublic = CANDIDATES.filter((r) => repoTierFrom(map, r) === "public");
        const picked = changelogRepos({ ...env, CHANGELOG_REPOS: CANDIDATES.join(",") });
        // The changelog never publishes a repo the chat would gate.
        for (const r of picked) expect(chatPublic).toContain(r);
      } finally {
        for (const k of Object.keys(env)) delete (process.env as Record<string, string | undefined>)[k];
        Object.assign(process.env, saved);
      }
    }
  });

  it("the four declared-confidential repos are never recalled, even if an override demotes one", () => {
    const env = { MEMORY_REPO_TIERS: JSON.stringify({ "citrate-security": "public" }), CHANGELOG_REPOS: "citrate-security,citrate-docs" };
    expect(changelogRepos(env)).not.toContain("citrate-security");
  });
});
