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

// Mark every entry that has no code on chain. The snapshot is written by
// citrate-chain/verification/check_address_code.py --probe (read-only eth_getCode) and is
// validated against claims.json in citrate-chain CI. Refuse to publish a stale snapshot.
const SNAP = path.resolve(ROOT, "..", "citrate-chain", "verification", "address-code.snapshot.json");
if (!fs.existsSync(SNAP)) {
  console.error("[gen-addresses] missing citrate-chain/verification/address-code.snapshot.json; run check_address_code.py --probe first.");
  process.exit(1);
}
const snap = JSON.parse(fs.readFileSync(SNAP, "utf8"));
if (snap.book_deployedAt !== book.deployedAt) {
  console.error(`[gen-addresses] getCode snapshot is for book ${snap.book_deployedAt}, book is ${book.deployedAt}; re-probe.`);
  process.exit(1);
}
const codeless = new Set(snap.codeless || []);

let sha = "unknown";
try {
  sha = execSync("git -C ../citrate-chain log -1 --format=%h -- contracts/addresses/40204.json", {
    cwd: ROOT,
  }).toString().trim() || "unknown";
} catch {
  /* leave unknown */
}

const table = (obj, section, byDesign) => {
  const rows = Object.entries(obj)
    .filter(([, v]) => typeof v === "string" && v.startsWith("0x"))
    .map(([name, addr]) => {
      const status = byDesign ? "precompile (no code by design)" : codeless.has(section ? `${section}.${name}` : name) ? "**not deployed** (no code)" : "deployed";
      return `| \`${name}\` | \`${addr}\` | ${status} |`;
    })
    .join("\n");
  return `| Contract | Address | Status |\n|---|---|---|\n${rows}\n`;
};
const appNames = [
  ...Object.keys(book.contracts || {}).map((n) => `contracts.${n}`),
  ...Object.keys(book.aaStack || {}).map((n) => `aaStack.${n}`),
];
const liveCount = appNames.filter((n) => !codeless.has(n)).length;

const deployedAt = (book.deployedAt || "").replace(/[TZ]/g, " ").trim();

const md = `---
title: Contract addresses
codex_slug: /chain/addresses
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/addresses/40204.json
surfaces: [CHAIN-addresses]
audited_against_sha: ${sha}
book_deployed_at: ${book.deployedAt}
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 5
---

This is the canonical list of contract addresses on chain ${book.chainId} (${book.chainName}). It is generated
from the federation address book (\`citrate-chain/contracts/addresses/40204.json\`), the single source of truth
every application reads from, and is regenerated after each re-roll or address fan-out. As of the book at
commit \`${sha}\`${deployedAt ? `, deployed ${deployedAt}UTC` : ""}.

Not every entry in the book is deployed. At block ${snap.block} (${snap.probed_at}), ${liveCount} of the ${appNames.length}
application and account-abstraction entries have code on chain; rows marked **not deployed** have none. A call to a
not-deployed address returns empty data, and a value transfer to one succeeds and strands the value, so check the
status column before you send anything. Re-check any address yourself with
\`cast code <address> --rpc-url ${book.rpcUrl}\`.

The core and account-abstraction addresses are deterministic (CREATE2 through the genesis factory), so a
re-roll moves them together and this page moves with them. The membership contracts are the exception (see below). The RPC endpoint is \`${book.rpcUrl}\` and the deployer is \`${book.deployer}\`.

## Core contracts

${table(book.contracts || {}, "contracts")}
## Membership

The membership soulbound token and stake vault are top-level entries in the book. They are deployed by
nonce rather than through the CREATE2 factory, so their addresses change at every re-roll; always read them
from the book.

${table(Object.fromEntries(["CitrateMemberSBT", "MembershipStakeVault"].filter((k) => book[k]).map((k) => [k, book[k]])), "")}
## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

${table(book.aaStack || {}, "aaStack")}
## Precompiles

Precompiles are fixed genesis addresses and do not move across re-rolls.

${table(book.precompiles || {}, "precompiles", true)}
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, md);
const n =
  Object.keys(book.contracts || {}).length +
  Object.keys(book.aaStack || {}).length +
  Object.keys(book.precompiles || {}).length;
console.log(`[gen-addresses] wrote ${path.relative(ROOT, OUT)} (${n} addresses, ${liveCount}/${appNames.length} deployed, book @ ${sha})`);
