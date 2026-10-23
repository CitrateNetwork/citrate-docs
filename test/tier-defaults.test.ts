/**
 * Fail-closed defaults on the tier/entitlement path, and the client/server content split:
 *  - a partial MEMORY_REPO_TIERS override never drops a declared tier, even when an operator sets
 *    MEM_DEFAULT_TIER=public (where a replace-instead-of-merge bug becomes visible);
 *  - an unlisted repo with no MEM_DEFAULT_TIER is confidential;
 *  - a principal lookup does not hand out a gated tier to an unverified KYC status;
 *  - org-scoped content is readable only by that org (or an admin);
 *  - the generated client module carries no gated body, and the body module is server-only;
 *  - mermaid renders with securityLevel "strict" (its SVG is inserted via innerHTML).
 */
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveRepoTiers, repoTierFrom, DEFAULT_REPO_TIERS } from "@/lib/ai/memory";
import { resolveEntitlement } from "@/lib/auth/entitlement";
import { canRead } from "@/prototype/fixtures";
import { CONTENT_DOCS } from "@/content/_generated/content";

const ROOT = path.resolve(__dirname, "..");
const saved = process.env.MEM_DEFAULT_TIER;
afterEach(() => {
  if (saved === undefined) delete process.env.MEM_DEFAULT_TIER;
  else process.env.MEM_DEFAULT_TIER = saved;
});

describe("memory repo tiers", () => {
  it("a partial override keeps every declared tier when MEM_DEFAULT_TIER=public", () => {
    process.env.MEM_DEFAULT_TIER = "public";
    const map = resolveRepoTiers('{"citrate-docs":"public"}');
    const declared = Object.entries(DEFAULT_REPO_TIERS);
    expect(declared.length).toBeGreaterThan(0);
    for (const [repo, tier] of declared) expect(repoTierFrom(map, repo)).toBe(tier);
    expect(repoTierFrom(map, "citrate-docs")).toBe("public");
  });

  it("an unlisted repo with no MEM_DEFAULT_TIER is confidential", () => {
    delete process.env.MEM_DEFAULT_TIER;
    expect(repoTierFrom(resolveRepoTiers(undefined), "some-unlisted-repo")).toBe("confidential");
  });
});

describe("principal lookup and KYC", () => {
  it("a gated principal with a non-verified KYC status resolves to public", () => {
    for (const kycStatus of ["pending", "rejected", "none"]) {
      const e = resolveEntitlement({}, { sub: "uuid:7f3c1a90-builder", kycStatus });
      expect(e?.tier).toBe("public");
    }
  });

  it("the same principal with verified KYC keeps its tier (control)", () => {
    const e = resolveEntitlement({}, { sub: "uuid:7f3c1a90-builder", kycStatus: "verified" });
    expect(e?.tier).toBe("commercial");
  });
});

describe("org scope", () => {
  const reader = (orgId: string | null) =>
    ({ required: true, authenticated: true, sub: "u", kycStatus: "verified", entitlement: { tier: "commercial", orgId, expiresAt: null } }) as never;
  const node = { tier: "commercial" as const, orgId: "org-a" };

  it("org-scoped content is refused to another org and to an org-less reader", () => {
    expect(canRead(reader("org-b"), node, Date.now())).toBe(false);
    expect(canRead(reader(null), node, Date.now())).toBe(false);
  });

  it("the owning org reads it (control)", () => {
    expect(canRead(reader("org-a"), node, Date.now())).toBe(true);
  });
});

/**
 * Run the real generator against a throwaway fixture corpus (the committed corpus is all public
 * today, so it cannot exercise the split). The script resolves ROOT from its own location, so a
 * copy under a temp dir reads and writes only inside that dir.
 */
function runGeneratorOnFixture(): { client: string; bodies: string } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docs-gen-"));
  try {
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.copyFileSync(path.join(ROOT, "scripts/build-content.mjs"), path.join(tmp, "scripts/build-content.mjs"));
    const dir = path.join(tmp, "content", "guides");
    fs.mkdirSync(dir, { recursive: true });
    const page = (tier: string, marker: string) => `---\ntitle: ${tier} page\ntier: ${tier}\n---\n# ${tier}\n\n${marker}\n`;
    fs.writeFileSync(path.join(dir, "pub.md"), page("public", "PUBLIC-MARKER-1"));
    fs.writeFileSync(path.join(dir, "com.md"), page("commercial", "COMMERCIAL-MARKER-2"));
    fs.writeFileSync(path.join(dir, "aca.md"), page("academic", "ACADEMIC-MARKER-3"));
    execFileSync(process.execPath, [path.join(tmp, "scripts/build-content.mjs")], { cwd: tmp, stdio: "pipe" });
    const gen = path.join(tmp, "content", "_generated");
    return {
      client: fs.readFileSync(path.join(gen, "content.ts"), "utf8"),
      bodies: fs.readFileSync(path.join(gen, "content-bodies.ts"), "utf8"),
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe("generated content split", () => {
  it("the generator keeps gated bodies out of the client module and puts them in the server-only one", () => {
    const { client, bodies } = runGeneratorOnFixture();
    expect(client).toContain("PUBLIC-MARKER-1"); // control: public bodies stay client-side
    expect(client).not.toContain("COMMERCIAL-MARKER-2");
    expect(client).not.toContain("ACADEMIC-MARKER-3");
    expect(bodies).toMatch(/^import "server-only";$/m);
    expect(bodies).toContain("COMMERCIAL-MARKER-2");
    expect(bodies).toContain("ACADEMIC-MARKER-3");
    expect(bodies).not.toContain("PUBLIC-MARKER-1");
  });

  it("the committed client module carries no body for any gated doc", () => {
    for (const d of Object.values(CONTENT_DOCS)) if (d.tier !== "public") expect(d.body ?? null).toBeNull();
  });

  it("the body module is server-only and no client component imports it", () => {
    const bodies = fs.readFileSync(path.join(ROOT, "content/_generated/content-bodies.ts"), "utf8");
    expect(bodies).toMatch(/^import "server-only";$/m);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
          const src = fs.readFileSync(p, "utf8");
          if (/^\s*["']use client["']/.test(src) && src.includes("content/_generated/content-bodies")) offenders.push(p);
        }
      }
    };
    for (const d of ["app", "components", "lib"]) walk(path.join(ROOT, d));
    expect(offenders).toEqual([]);
  });
});

describe("mermaid rendering", () => {
  it("initialises with securityLevel strict", () => {
    const md = fs.readFileSync(path.join(ROOT, "lib/md.tsx"), "utf8");
    const levels = [...md.matchAll(/securityLevel:\s*"([a-z]+)"/g)].map((m) => m[1]);
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.every((l) => l === "strict")).toBe(true);
  });
});
