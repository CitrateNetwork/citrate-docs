#!/usr/bin/env node
// Render the contract-address pages from the canonical address book, one page per network
// (content/chain/networks.json), plus the stable /chain/addresses page for the current network.
//
// The books come from the published @citratelabs/chain-config package (one npm alias per network) or,
// for a network retired before the package existed, a frozen copy of the chain's archived book. Neither
// needs a chain checkout, so this runs in prebuild and predev: the deployed pages always come from the
// pinned books. The output is also committed, so a diff shows in review.
//
//   (no flags)       write the pages
//   --check          render in memory and fail if a committed page differs; with a citrate-chain checkout
//                    (default ../citrate-chain, or --chain <dir>), also fail if any registered book or
//                    getCode snapshot differs from the chain's (CI tripwire: a new genesis turns it red)
//   --sync           copy the getCode snapshots and archived books from the chain checkout and rewrite the
//                    registry's sha256 pins, then write the pages (run after a re-probe or a new genesis)
//   --chain <dir>    the citrate-chain checkout for --check and --sync
import fs from "node:fs";
import path from "node:path";
import { parseGenArgs, writeOrCheck } from "./lib/gen-cli.mjs";
import { buildPages, chainCrossCheck, syncFromChain } from "./lib/addresses.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const argv = process.argv.slice(2);
const sync = argv.includes("--sync");
let args;
try {
  args = parseGenArgs(argv.filter((a) => a !== "--sync"), ROOT);
} catch (e) {
  console.error(`[gen-addresses] ${e.message}`);
  process.exit(2);
}
const { chainDir, check } = args;
const haveChain = fs.existsSync(path.join(chainDir, "contracts", "addresses", "40204.json"));

if (sync && check) {
  console.error("[gen-addresses] --sync and --check are exclusive");
  process.exit(2);
}
if (sync) {
  if (!haveChain) {
    console.error(`[gen-addresses] --sync needs a citrate-chain checkout; none at ${chainDir}`);
    process.exit(2);
  }
  syncFromChain(ROOT, chainDir);
  console.log(`[gen-addresses] synced snapshots, archived books and sha256 pins from ${chainDir}`);
}

let pages;
try {
  pages = buildPages(ROOT);
} catch (e) {
  console.error(`[gen-addresses] ${e.message}`);
  process.exit(1);
}

let code = 0;
for (const p of pages) code = writeOrCheck({ outPath: p.outPath, content: p.content, check, tag: "gen-addresses", root: ROOT }) || code;

// A page from a network no longer registered would keep being served; remove it (or fail under --check).
const outDir = path.dirname(pages[0].outPath);
const wanted = new Set(pages.map((p) => path.basename(p.outPath)));
for (const f of fs.readdirSync(outDir)) {
  if (!/^addresses(-[a-z0-9-]+)?\.md$/.test(f) || wanted.has(f)) continue;
  if (check) {
    console.error(`[gen-addresses] --check: content/chain/_generated/${f} is not a registered network's page`);
    code = 1;
  } else fs.rmSync(path.join(outDir, f));
}

if (check) {
  if (haveChain) {
    const problems = chainCrossCheck(ROOT, chainDir);
    for (const p of problems) console.error(`[gen-addresses] --check: ${p}`);
    if (problems.length) {
      console.error("[gen-addresses] the chain has moved on; update content/chain/networks.json (README.md, Chain-generated pages)");
      code = 1;
    } else console.log(`[gen-addresses] --check: every registered book matches citrate-chain at ${chainDir}`);
  } else if (argv.some((a) => a === "--chain" || a.startsWith("--chain="))) {
    // An explicit --chain that is not there must not pass by reading nothing (the CI job passes one).
    console.error(`[gen-addresses] --check: no citrate-chain address book under ${chainDir}`);
    code = 1;
  } else {
    console.log(`[gen-addresses] --check: no citrate-chain at ${chainDir}; checked the committed pages only`);
  }
}
if (code === 0 && !check) console.log(`[gen-addresses] wrote ${pages.length} pages (${pages.map((p) => path.basename(p.outPath)).join(", ")})`);
process.exit(code);
