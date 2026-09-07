import { describe, it, expect } from "vitest";
import { resolveRepoTiers, repoTierFrom, DEFAULT_REPO_TIERS } from "@/lib/ai/memory";

describe("memory repo-tier resolution (DOC-B-009)", () => {
  it("a partial MEMORY_REPO_TIERS override merges over defaults, never replacing them", () => {
    // Operator intends to ADD one rule; the other confidential repos must stay confidential.
    const map = resolveRepoTiers('{"citrate-security":"confidential"}');
    expect(repoTierFrom(map, "citrate-security")).toBe("confidential");
    expect(repoTierFrom(map, "citrate-commercial")).toBe("confidential");
    expect(repoTierFrom(map, "citrate-compliance")).toBe("confidential");
    expect(repoTierFrom(map, "citrate-federation")).toBe("confidential");
  });

  it("malformed JSON falls back to the safe defaults (fail-closed)", () => {
    const map = resolveRepoTiers("{not json");
    expect(repoTierFrom(map, "citrate-commercial")).toBe("confidential");
  });

  it("every declared confidential repo still resolves confidential after any override", () => {
    for (const [repo, tier] of Object.entries(DEFAULT_REPO_TIERS)) {
      if (tier === "confidential") {
        const map = resolveRepoTiers('{"some-other-repo":"public"}');
        expect(repoTierFrom(map, repo)).toBe("confidential");
      }
    }
  });
});
