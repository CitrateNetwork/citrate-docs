#!/usr/bin/env node
// Generate the canonical precompile address table from a citrate-chain checkout, alongside
// gen-addresses.mjs. Writes content/chain/_generated/precompiles.md (a real nav page, picked up by
// build-content.mjs like the other generated chain pages). The output is COMMITTED: on Vercel the chain
// checkout is absent, so without one this script keeps the committed copy.
//
//   npm run docs:precompiles                              # read ../citrate-chain
//   npm run docs:precompiles -- --chain <dir>             # read another checkout
//   npm run docs:precompiles -- --chain <dir> --check     # fail on drift, write nothing
//
// Fails (non-zero) when the chain arrays, the book's precompiles block and the description map
// (scripts/lib/precompile-descriptions.mjs) disagree. See scripts/lib/precompiles.mjs.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseGenArgs, writeOrCheck } from "./lib/gen-cli.mjs";
import { buildPrecompileRows, renderPrecompilesMd } from "./lib/precompiles.mjs";
import { PRECOMPILE_DESCRIPTIONS } from "./lib/precompile-descriptions.mjs";

const TAG = "gen-precompiles";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "chain", "_generated", "precompiles.md");

let args;
try {
  args = parseGenArgs(process.argv.slice(2), ROOT);
} catch (e) {
  console.error(`[${TAG}] ${e.message}`);
  process.exit(2);
}
const { chainDir, check } = args;
const MOD_RS = path.join(chainDir, "core", "execution", "src", "precompiles", "mod.rs");
const AGENT_FORK_RS = path.join(chainDir, "core", "execution", "src", "agent_fork.rs");
const BOOK = path.join(chainDir, "contracts", "addresses", "40204.json");

if (!fs.existsSync(MOD_RS) || !fs.existsSync(BOOK)) {
  if (check) {
    console.error(`[${TAG}] --check needs a citrate-chain checkout; none at ${chainDir}.`);
    process.exit(1);
  }
  console.log(`[${TAG}] no citrate-chain checkout at ${chainDir}; keeping the committed precompiles.md.`);
  process.exit(0);
}

const book = JSON.parse(fs.readFileSync(BOOK, "utf8"));
const INPUTS = [
  "core/execution/src/precompiles/mod.rs",
  "core/execution/src/agent_fork.rs",
  "contracts/addresses/40204.json",
];
let sha = "unknown";
try {
  sha = execFileSync("git", ["-C", chainDir, "log", "-1", "--format=%H", "--", ...INPUTS], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().slice(0, 8) || "unknown";
} catch {
  /* leave unknown */
}

let built;
try {
  built = buildPrecompileRows({
    modRs: fs.readFileSync(MOD_RS, "utf8"),
    agentForkRs: fs.existsSync(AGENT_FORK_RS) ? fs.readFileSync(AGENT_FORK_RS, "utf8") : null,
    bookPrecompiles: book.precompiles,
    descriptions: PRECOMPILE_DESCRIPTIONS,
    chainId: book.chainId,
  });
} catch (e) {
  console.error(`[${TAG}] ${e.message}`);
  process.exit(1);
}

const md = renderPrecompilesMd({ ...built, chainId: book.chainId, chainName: book.chainName, sha });
const code = writeOrCheck({ outPath: OUT, content: md, check, tag: TAG, root: ROOT });
if (!check && code === 0) {
  const by = (k) => built.rows.filter((r) => r.kind === k).length;
  console.log(
    `[${TAG}] wrote ${path.relative(ROOT, OUT)} (${built.rows.length} precompiles: ${by("pure")} pure, ${by("agent")} agent, ${by("hosted")} hosted; agent pin ${built.pin === undefined ? "absent" : built.pin}; chain @ ${sha})`,
  );
}
process.exit(code);
