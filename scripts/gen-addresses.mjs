#!/usr/bin/env node
// Generate the canonical contract-address reference from the citrate-chain
// address book, mirroring gen-api-refs.mjs. Reads the sibling
// `citrate-chain/contracts/addresses/40204.json` and writes a real nav page at
// content/chain/_generated/addresses.md. Like the API reference, the output is
// COMMITTED: on Vercel the sibling repo is absent, so the committed copy is
// used and this script keeps it rather than blanking it.
//
// Regenerate after every re-roll / address fan-out:  npm run docs:addresses
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BOOK = path.resolve(ROOT, "..", "citrate-chain", "contracts", "addresses", "40204.json");
const OUT_DIR = path.join(ROOT, "content", "chain", "_generated");
const OUT = path.join(OUT_DIR, "addresses.md");

if (!fs.existsSync(BOOK)) {
  console.log("[gen-addresses] sibling citrate-chain not present; keeping the committed addresses.md.");
  process.exit(0);
}

const book = JSON.parse(fs.readFileSync(BOOK, "utf8"));

let sha = "unknown";
try {
  sha = execSync("git -C ../citrate-chain log -1 --format=%h -- contracts/addresses/40204.json", {
    cwd: ROOT,
  }).toString().trim() || "unknown";
} catch {
  /* leave unknown */
}

const table = (obj) => {
  const rows = Object.entries(obj)
    .filter(([, v]) => typeof v === "string" && v.startsWith("0x"))
    .map(([name, addr]) => `| \`${name}\` | \`${addr}\` |`)
    .join("\n");
  return `| Contract | Address |\n|---|---|\n${rows}\n`;
};

const deployedAt = (book.deployedAt || "").replace(/[TZ]/g, " ").trim();

const md = `---
title: Contract addresses
codex_slug: /chain/addresses
tier: public
org_scope: ~
source_kind: generated
source: citrate-chain/contracts/addresses/40204.json
surfaces: [CHAIN-addresses]
audited_against_sha: ${sha}
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 5
---

This is the canonical list of deployed contract addresses on chain ${book.chainId} (${book.chainName}). It
is generated from the federation address book (\`citrate-chain/contracts/addresses/40204.json\`), the single
source of truth every application reads from, and is regenerated after each re-roll or address fan-out. As
of the book at commit \`${sha}\`${deployedAt ? `, deployed ${deployedAt}UTC` : ""}.

Addresses are deterministic (CREATE2 through the genesis factory), so a re-roll moves them together and this
page moves with them. The RPC endpoint is \`${book.rpcUrl}\` and the deployer is \`${book.deployer}\`.

## Core contracts

${table(book.contracts || {})}
## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

${table(book.aaStack || {})}
## Precompiles

Precompiles are fixed genesis addresses and do not move across re-rolls.

${table(book.precompiles || {})}
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, md);
const n =
  Object.keys(book.contracts || {}).length +
  Object.keys(book.aaStack || {}).length +
  Object.keys(book.precompiles || {}).length;
console.log(`[gen-addresses] wrote ${path.relative(ROOT, OUT)} (${n} addresses, book @ ${sha})`);
