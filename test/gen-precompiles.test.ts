/**
 * The precompile table on docs.citrate.ai is generated from citrate-chain (scripts/gen-precompiles.mjs).
 * These tests pin the two tripwires: the generator refuses when the chain, the book and the docs-owned
 * description map disagree, and `--check` fails on drift without writing.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
// @ts-expect-error -- plain ESM helper shared with scripts/gen-precompiles.mjs
import { buildPrecompileRows, parseAgentPin, parseArray, renderPrecompilesMd } from "@/scripts/lib/precompiles.mjs";
// @ts-expect-error -- plain ESM helper shared with scripts/gen-*.mjs
import { parseGenArgs, writeOrCheck } from "@/scripts/lib/gen-cli.mjs";

const ROOT = path.resolve(__dirname, "..");

const modRs = (agent = true) => `
pub const PURE_PRECOMPILE_ADDRESSES: [[u8; 20]; 2] = [
    verify::addresses::TENSOR_COMMIT,          // 0x0107
    x402::addresses::EIP712_VERIFY,            // 0x0200
];
${
  agent
    ? `pub const AGENT_FORK_PRECOMPILE_ADDRESSES: [[u8; 20]; 1] = [
    lora::LORA_APPLY,                    // 0x0112
];`
    : ""
}`;
const forkRs = (pin: string) => `pub const AGENT_PRECOMPILES_PINS: &[(u64, Option<u64>)] = &[(40204, ${pin})];`;
const book = {
  ModelDeploy: "0x0000000000000000000000000000000000000100",
  TensorCommit: "0x0000000000000000000000000000000000000107",
  X402Eip712Verify: "0x0000000000000000000000000000000000000200",
};
const descriptions = {
  MODEL_DEPLOY: { book: "ModelDeploy", family: "Hosted inference", does: "deploy" },
  TENSOR_COMMIT: { book: "TensorCommit", family: "Verification", does: "commit" },
  EIP712_VERIFY: { book: "X402Eip712Verify", family: "x402 payments", does: "eip712" },
  LORA_APPLY: { family: "Agent", does: "lora" },
};
const base = { modRs: modRs(), agentForkRs: forkRs("Some(0)"), bookPrecompiles: book, descriptions, chainId: 40204 };

describe("precompile sources", () => {
  it("parses the chain array element comments and the release pin", () => {
    expect(parseArray(modRs(), "PURE_PRECOMPILE_ADDRESSES").entries).toEqual([
      { name: "TENSOR_COMMIT", value: 0x107 },
      { name: "EIP712_VERIFY", value: 0x200 },
    ]);
    expect(parseArray(modRs(false), "AGENT_FORK_PRECOMPILE_ADDRESSES")).toBeNull();
    expect(parseAgentPin(forkRs("Some(0)"), 40204)).toBe(0);
    expect(parseAgentPin(forkRs("Some(1234)"), 40204)).toBe(1234);
    expect(parseAgentPin(forkRs("None"), 40204)).toBeNull();
    expect(parseAgentPin(forkRs("None"), 1)).toBeUndefined();
    expect(parseAgentPin(null, 40204)).toBeUndefined();
  });

  it("flags a declared length that does not match the elements read", () => {
    const src = modRs().replace("[[u8; 20]; 2]", "[[u8; 20]; 3]");
    expect(() => buildPrecompileRows({ ...base, modRs: src })).toThrow(/declares 3 elements but 2/);
  });

  it("joins chain, book and descriptions; agent precompiles pinned at 0 are active from genesis", () => {
    const { rows, pin } = buildPrecompileRows(base);
    expect(pin).toBe(0);
    expect(rows.map((r: { short: string }) => r.short)).toEqual(["0x0100", "0x0107", "0x0112", "0x0200"]);
    const byName = Object.fromEntries(rows.map((r: { name: string }) => [r.name, r]));
    expect(byName.MODEL_DEPLOY.kind).toBe("hosted");
    expect(byName.MODEL_DEPLOY.reachable).toMatch(/^no/);
    expect(byName.TENSOR_COMMIT.padded).toBe("0x0000000000000000000000000000000000000107");
    expect(byName.LORA_APPLY.active).toMatch(/active from genesis/);
    const md = renderPrecompilesMd({ rows, pin, chainId: 40204, chainName: "Citrate Network", sha: "abcdef12" });
    expect(md).toMatch(/agent precompiles are \*\*active from genesis\*\* on 40204/);
    expect(md).not.toMatch(/\u2014/);
  });

  it("reports an unpinned agent fork honestly", () => {
    const { rows } = buildPrecompileRows({ ...base, agentForkRs: forkRs("None") });
    const lora = rows.find((r: { name: string }) => r.name === "LORA_APPLY");
    expect(lora.reachable).toMatch(/^no/);
    expect(lora.active).toMatch(/not activated/);
  });

  it("fails when the chain has a precompile the description map lacks", () => {
    const { LORA_APPLY: _drop, ...rest } = descriptions;
    expect(() => buildPrecompileRows({ ...base, descriptions: rest })).toThrow(/LORA_APPLY \(0x0112\) has no entry in the description map/);
  });

  it("fails when the book has a precompile the description map lacks", () => {
    const extra = { ...book, ModelTrain: "0x0000000000000000000000000000000000000104" };
    expect(() => buildPrecompileRows({ ...base, bookPrecompiles: extra })).toThrow(/book precompile ModelTrain/);
  });

  it("fails when the description map has an entry the chain and the book lack (chain main without the agent array)", () => {
    let err: (Error & { problems?: string[] }) | undefined;
    try {
      buildPrecompileRows({ ...base, modRs: modRs(false) });
    } catch (e) {
      err = e as Error & { problems?: string[] };
    }
    expect(err?.problems).toEqual([
      "chain mod.rs has no AGENT_FORK_PRECOMPILE_ADDRESSES",
      "description map entry LORA_APPLY is in neither the chain arrays nor the book",
    ]);
  });

  it("fails when the book and the chain disagree on an address", () => {
    const moved = { ...book, TensorCommit: "0x0000000000000000000000000000000000000108" };
    expect(() => buildPrecompileRows({ ...base, bookPrecompiles: moved })).toThrow(/TENSOR_COMMIT: chain says 0x0107, book TensorCommit says 0x0108/);
  });
});

describe("--check drift detection", () => {
  it("writeOrCheck passes on identical output, fails on drift, and never writes under --check", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-check-"));
    const out = path.join(dir, "page.md");
    fs.writeFileSync(out, "committed\n");
    expect(writeOrCheck({ outPath: out, content: "committed\n", check: true, tag: "t", root: dir })).toBe(0);
    expect(writeOrCheck({ outPath: out, content: "drifted\n", check: true, tag: "t", root: dir })).toBe(1);
    expect(fs.readFileSync(out, "utf8")).toBe("committed\n");
    expect(writeOrCheck({ outPath: out, content: "drifted\n", check: false, tag: "t", root: dir })).toBe(0);
    expect(fs.readFileSync(out, "utf8")).toBe("drifted\n");
  });

  it("parses --chain and --check", () => {
    expect(parseGenArgs(["--check", "--chain", "/x/chain"], ROOT)).toEqual({ chainDir: "/x/chain", check: true });
    expect(parseGenArgs([], ROOT)).toEqual({ chainDir: path.resolve(ROOT, "..", "citrate-chain"), check: false });
    expect(() => parseGenArgs(["--bogus"], ROOT)).toThrow(/unknown argument/);
  });

  it("the CLI fails --check against a chain whose precompiles differ from the committed page, and leaves the page alone", () => {
    const chain = fs.mkdtempSync(path.join(os.tmpdir(), "fake-chain-"));
    fs.mkdirSync(path.join(chain, "core/execution/src/precompiles"), { recursive: true });
    fs.mkdirSync(path.join(chain, "contracts/addresses"), { recursive: true });
    const committed = fs.readFileSync(path.join(ROOT, "content/chain/_generated/precompiles.md"), "utf8");
    // The real description map, a chain that only knows two of its entries: the generator must refuse.
    fs.writeFileSync(path.join(chain, "core/execution/src/precompiles/mod.rs"), modRs());
    fs.writeFileSync(path.join(chain, "core/execution/src/agent_fork.rs"), forkRs("Some(0)"));
    fs.writeFileSync(path.join(chain, "contracts/addresses/40204.json"), JSON.stringify({ chainId: 40204, chainName: "x", precompiles: book }));
    const r = spawnSync(process.execPath, ["scripts/gen-precompiles.mjs", "--chain", chain, "--check"], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/has no entry in the description map|in neither the chain arrays nor the book/);
    expect(fs.readFileSync(path.join(ROOT, "content/chain/_generated/precompiles.md"), "utf8")).toBe(committed);
  });

  it("the CLI passes --check on a chain matching the committed page and fails when the chain moves", () => {
    const pagePath = path.join(ROOT, "content/chain/_generated/precompiles.md");
    const committed = fs.readFileSync(pagePath, "utf8");
    // Rebuild a consistent fake chain from the committed table itself.
    const rows = [...committed.matchAll(/^\| `(0x[0-9A-F]{4})` \| `0x[0-9a-f]{40}` \| `([A-Z0-9_]+)` \| ([^|]+) \|/gm)].map((m) => ({ short: m[1], name: m[2], family: m[3].trim() }));
    expect(rows.length).toBeGreaterThan(20);
    const sha = /audited_against_sha: (\S+)/.exec(committed)?.[1];
    const hosted = rows.filter((r) => r.family === "Hosted inference");
    const agent = rows.filter((r) => r.family === "Agent");
    const pure = rows.filter((r) => r.family !== "Hosted inference" && r.family !== "Agent");
    const arr = (name: string, rs: typeof rows) => `pub const ${name}: [[u8; 20]; ${rs.length}] = [\n${rs.map((r) => `    m::${r.name}, // ${r.short}`).join("\n")}\n];\n`;
    // @ts-expect-error -- plain ESM data module
    return import("@/scripts/lib/precompile-descriptions.mjs").then(({ PRECOMPILE_DESCRIPTIONS }) => {
      const bookP: Record<string, string> = {};
      for (const r of rows) {
        const b = PRECOMPILE_DESCRIPTIONS[r.name].book;
        if (b) bookP[b] = "0x" + r.short.slice(2).toLowerCase().padStart(40, "0");
      }
      const pinNow = /active from genesis/.test(committed) ? "Some(0)" : "None";
      const chain = fs.mkdtempSync(path.join(os.tmpdir(), "fake-chain-"));
      fs.mkdirSync(path.join(chain, "core/execution/src/precompiles"), { recursive: true });
      fs.mkdirSync(path.join(chain, "contracts/addresses"), { recursive: true });
      fs.writeFileSync(path.join(chain, "core/execution/src/precompiles/mod.rs"), arr("PURE_PRECOMPILE_ADDRESSES", pure) + arr("AGENT_FORK_PRECOMPILE_ADDRESSES", agent));
      fs.writeFileSync(path.join(chain, "contracts/addresses/40204.json"), JSON.stringify({ chainId: 40204, chainName: "Citrate Network", precompiles: bookP }));
      // Not a git checkout, so the sha renders as "unknown"; align the committed copy for the comparison.
      const run = (pin: string) => {
        fs.writeFileSync(path.join(chain, "core/execution/src/agent_fork.rs"), forkRs(pin));
        return spawnSync(process.execPath, ["scripts/gen-precompiles.mjs", "--chain", chain, "--check"], { cwd: ROOT, encoding: "utf8" });
      };
      expect(hosted.length).toBeGreaterThan(0);
      fs.writeFileSync(pagePath, committed.replaceAll(sha as string, "unknown"));
      try {
        const same = run(pinNow);
        expect(same.stderr).toBe("");
        expect(same.status).toBe(0);
        const moved = run(pinNow === "None" ? "Some(0)" : "None");
        expect(moved.status).toBe(1);
        expect(moved.stderr).toMatch(/has drifted from the chain sources/);
      } finally {
        fs.writeFileSync(pagePath, committed);
      }
    });
  });

  it("the CLI refuses --check without a chain checkout", () => {
    const r = spawnSync(process.execPath, ["scripts/gen-precompiles.mjs", "--chain", path.join(os.tmpdir(), "no-such-chain-dir"), "--check"], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/--check needs a citrate-chain checkout/);
  });
});
