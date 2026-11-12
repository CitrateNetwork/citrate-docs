// Contract-address pages, one per network, rendered at build time from the canonical address book.
//
// The canonical book is citrate-chain/contracts/addresses/40204.json. It is published byte for byte as
// the npm package @citratelabs/chain-config; this repo installs each network's release under its own
// alias (package.json: "citrate-book-<network>": "npm:@citratelabs/chain-config@<version>"), so the
// build has the book without a chain checkout. A network retired before the package existed is kept as
// a frozen copy of the chain's archived book under content/chain/address-books/.
//
// content/chain/networks.json is the registry: which networks exist, which one is current, where each
// book comes from, the sha256 of its bytes and its block-0 hash. A book whose bytes or genesis hash do not
// match the registry is refused. Nothing here reaches the network.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

export const REGISTRY = path.join("content", "chain", "networks.json");
export const OUT_DIR = path.join("content", "chain", "_generated");
const ADDR = /^0x[0-9a-fA-F]{40}$/;
const PENDING = /^@citratelabs\/chain-config@\d+\.\d+\.\d+$/;

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export function loadRegistry(root) {
  const file = path.join(root, REGISTRY);
  const reg = JSON.parse(fs.readFileSync(file, "utf8"));
  const nets = reg.networks || [];
  const current = nets.filter((n) => n.status === "current");
  if (current.length !== 1) throw new Error(`${REGISTRY}: needs exactly one current network, found ${current.length}`);
  if (current[0].id !== reg.current) throw new Error(`${REGISTRY}: "current" is ${reg.current} but the current network is ${current[0].id}`);
  const ids = new Set();
  for (const n of nets) {
    if (!/^[a-z0-9-]+$/.test(n.id || "")) throw new Error(`${REGISTRY}: bad network id ${JSON.stringify(n.id)}`);
    if (ids.has(n.id)) throw new Error(`${REGISTRY}: duplicate network id ${n.id}`);
    ids.add(n.id);
    if (!["current", "archived"].includes(n.status)) throw new Error(`${REGISTRY}: ${n.id}: status must be current or archived`);
    if (!n.book || !/^[0-9a-f]{64}$/.test(n.book.sha256 || "")) throw new Error(`${REGISTRY}: ${n.id}: book.sha256 missing`);
    if (!n.book.chainPath) throw new Error(`${REGISTRY}: ${n.id}: book.chainPath missing`);
    if (n.status === "current" && !n.book.package && !PENDING.test(n.book.packagePending || "")) {
      throw new Error(`${REGISTRY}: ${n.id}: the current network must come from the published package, or name the pending release in book.packagePending`);
    }
    if (n.book.packagePending && !PENDING.test(n.book.packagePending)) throw new Error(`${REGISTRY}: ${n.id}: book.packagePending must be @citratelabs/chain-config@x.y.z`);
  }
  return reg;
}

// Read a network's book. Returns the parsed book, its exact bytes, their sha256 and where they came from.
export function resolveBook(net, root) {
  let file;
  let source;
  if (net.book.package) {
    const req = createRequire(path.join(root, "package.json"));
    try {
      file = req.resolve(`${net.book.package}/${net.book.file || "40204.json"}`);
    } catch {
      // The books are npm aliases in package.json; a node_modules installed before an alias was
      // added does not have it. Say so instead of a bare "Cannot find module".
      throw new Error(`${net.id}: the address book package ${net.book.package} is not installed: run npm ci`);
    }
    const pkgJson = path.join(path.dirname(file), "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
    source = { kind: "npm", package: net.book.package, name: pkg.name, version: pkg.version };
  } else {
    file = path.join(root, net.book.file);
    source = { kind: "vendored", file: net.book.file, ...(net.book.packagePending ? { pending: net.book.packagePending } : {}) };
  }
  const bytes = fs.readFileSync(file);
  const digest = sha256(bytes);
  if (digest !== net.book.sha256) {
    throw new Error(`${net.id}: book sha256 is ${digest}, the registry pins ${net.book.sha256} (${source.kind === "npm" ? `${source.name}@${source.version}` : source.file})`);
  }
  const book = JSON.parse(bytes.toString("utf8"));
  if (net.genesisHash && book.genesisHash !== net.genesisHash) {
    throw new Error(`${net.id}: book genesisHash is ${book.genesisHash}, the registry says ${net.genesisHash}`);
  }
  return { book, bytes, sha256: digest, source };
}

// The getCode snapshot (citrate-chain verification/address-code.snapshot.json, a read-only eth_getCode
// probe) says which entries had code. It must be for this book.
export function loadSnapshot(net, root, book) {
  if (!net.codeSnapshot) return null;
  const snap = JSON.parse(fs.readFileSync(path.join(root, net.codeSnapshot.file), "utf8"));
  if (snap.book_deployedAt !== book.deployedAt) {
    throw new Error(`${net.id}: getCode snapshot is for book ${snap.book_deployedAt}, the book is ${book.deployedAt}; re-probe and re-sync`);
  }
  if (snap.genesisHash && book.genesisHash && snap.genesisHash !== book.genesisHash) {
    throw new Error(`${net.id}: getCode snapshot is for genesis ${snap.genesisHash}, the book is ${book.genesisHash}`);
  }
  if (snap.chainId !== undefined && snap.chainId !== book.chainId) throw new Error(`${net.id}: getCode snapshot is for chain ${snap.chainId}`);
  return snap;
}

const SECTIONS = [
  ["contracts", "contracts"],
  ["membership", ""],
  ["aaStack", "aaStack"],
  ["precompiles", "precompiles"],
];

function sectionEntries(book, section) {
  if (section === "membership") {
    return ["CitrateMemberSBT", "MembershipStakeVault"].filter((k) => typeof book[k] === "string").map((k) => [k, book[k]]);
  }
  return Object.entries(book[section] || {}).filter(([, v]) => typeof v === "string" && ADDR.test(v));
}

// Every address the page publishes, with its section.
export function bookAddresses(book) {
  const out = [];
  for (const [section] of SECTIONS) for (const [name, address] of sectionEntries(book, section)) out.push({ section, name, address });
  return out;
}

function table(book, section, codeless, archivedId) {
  const prefix = SECTIONS.find(([s]) => s === section)[1];
  const rows = sectionEntries(book, section).map(([name, addr]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    let status;
    if (section === "precompiles") status = "precompile (no code by design)";
    else if (!codeless) status = "not probed";
    else if (codeless.has(key)) status = "**not deployed** (no code)";
    else status = archivedId ? `had code on ${archivedId}` : "deployed";
    return `| \`${name}\` | \`${addr}\` | ${status} |`;
  });
  return `| Contract | Address | Status |\n|---|---|---|\n${rows.join("\n")}\n`;
}

const sourceLine = (source, sha) =>
  source.kind === "npm"
    ? `the published package \`${source.name}@${source.version}\` (book sha256 \`${sha.slice(0, 16)}\`)`
    : source.pending
      ? `a pinned copy of the chain's root book (\`${source.file}\`, sha256 \`${sha.slice(0, 16)}\`; it gives way to \`${source.pending}\` once that is published)`
      : `a frozen copy of the chain's archived book (\`${source.file}\`, sha256 \`${sha.slice(0, 16)}\`)`;

export function renderNetworkPage({ registry, net, book, snapshot, source, sha256: sha, slug }) {
  const archived = net.status === "archived";
  const current = registry.networks.find((n) => n.status === "current");
  const codeless = snapshot ? new Set(snapshot.codeless || []) : null;
  const app = bookAddresses(book).filter((a) => a.section !== "precompiles");
  const live = codeless ? app.filter((a) => !codeless.has(a.section === "membership" ? a.name : `${a.section}.${a.name}`)).length : null;
  const title = slug === "/chain/addresses" ? "Contract addresses" : `Contract addresses: ${net.id}${archived ? " (retired)" : ""}`;
  const navOrder = slug === "/chain/addresses" ? 5 : 6 + registry.networks.findIndex((n) => n.id === net.id);

  const banner = archived
    ? `> **Retired network.** ${net.id} is no longer the live chain${net.retiredAt ? ` (retired ${net.retiredAt})` : ""}. These addresses are a record. Do not send to them on the live chain: an address with no code accepts a value transfer and strands it. The live addresses are on [Contract addresses](/chain/addresses) (${current.id}).\n\n`
    : "";

  const probe = snapshot
    ? `At block ${snapshot.block} (${snapshot.probed_at}), ${live} of the ${app.length} application, membership and account-abstraction entries had code on ${net.id}; rows marked **not deployed** had none.`
    : `No getCode probe is recorded for this book.`;

  const networkLinks = registry.networks
    .map((n) => `- [${n.id}](/chain/addresses/${n.id}): ${n.status === "current" ? "current" : `retired${n.retiredAt ? ` ${n.retiredAt}` : ""}`}${n.genesisHash ? `, block 0 \`${n.genesisHash}\`` : ""}`)
    .join("\n");

  return `---
title: ${title}
codex_slug: ${slug}
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/${net.book.chainPath}
surfaces: [CHAIN-addresses]
network: ${net.id}
network_status: ${net.status}
book_sha256: ${sha}
book_deployed_at: ${book.deployedAt}
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: ${navOrder}
---

${banner}These are the contract addresses of network **${net.id}** on chain ${book.chainId} (${book.chainName}).
The page is rendered at build time from ${sourceLine(source, sha)}, which is the canonical federation address
book \`citrate-chain/${net.book.chainPath}\`. The addresses are not copied by hand.${book.genesisHash ? ` The book is for the chain whose block 0 is \`${book.genesisHash}\`. Before you trust any address, check that \`eth_getBlockByNumber("0x0", false)\` on your RPC returns that hash.` : ""}

${archived ? `${probe} The live RPC now serves ${current.id}, so a \`cast code\` check against it says nothing about these rows.` : `${probe} A call to an address with no code returns empty data, and a value transfer to one succeeds and strands the
value, so check the status column before you send anything. Re-check any address yourself with
\`cast code <address> --rpc-url ${book.rpcUrl}\`.`}

${archived ? (current.book.packagePending ? `Programs must not read this record. The live network is ${current.id}; its book ships in \`${current.book.packagePending}\`, which is not published yet, and the release on npm today still carries an older network, so until then read \`citrate-chain/${current.book.chainPath}\` directly and check its \`genesisHash\`.` : `Programs must not read this record. The live book is the current release of \`@citratelabs/chain-config\`.`) : source.pending ? `Programs should read the book, not this page. \`${source.pending}\` carries this network's book but is not published yet; the release on npm today is still the previous network's, so until then read \`citrate-chain/${net.book.chainPath}\` directly and check its \`genesisHash\`.` : `Programs should read the book, not this page: \`npm install @citratelabs/chain-config\` and import
\`contracts\`, \`aaStack\`, \`memberSBT\` and \`genesisHash\` from it.`} The RPC endpoint is \`${book.rpcUrl}\` and the
genesis deployer ${archived ? "was" : "is"} \`${book.deployer}\`.

## Networks

${networkLinks}

## Core contracts

${table(book, "contracts", codeless, archived ? net.id : null)}
## Membership

The membership soulbound token and stake vault are top-level entries in the book. They are deployed by
nonce rather than through the CREATE2 factory, so their addresses can change at every new genesis; always
read them from the book.

${table(book, "membership", codeless, archived ? net.id : null)}
## Account abstraction

The Citrate Keyring account stack (ERC-4337). See [the Keyring section](/aa/identity) for how these fit
together.

${table(book, "aaStack", codeless, archived ? net.id : null)}
## Precompiles

Precompiles are fixed genesis addresses. This table is the book's own \`precompiles\` block; the full set,
including the agent precompiles and which addresses contract code can reach, is on
[precompile addresses](/chain/precompile-addresses).

${table(book, "precompiles", codeless, archived ? net.id : null)}`;
}

// Every page: the stable /chain/addresses page for the current network, then one page per network.
export function buildPages(root) {
  const registry = loadRegistry(root);
  const pages = [];
  const render = (net, slug, outName) => {
    const r = resolveBook(net, root);
    const snapshot = loadSnapshot(net, root, r.book);
    const content = renderNetworkPage({ registry, net, book: r.book, snapshot, source: r.source, sha256: r.sha256, slug });
    pages.push({ outPath: path.join(root, OUT_DIR, outName), content, net: net.id });
  };
  const current = registry.networks.find((n) => n.status === "current");
  render(current, "/chain/addresses", "addresses.md");
  for (const net of registry.networks) render(net, `/chain/addresses/${net.id}`, `addresses-${net.id}.md`);
  return pages;
}

// Compare every registered book (and its getCode snapshot) with the citrate-chain checkout. A difference
// means the chain has moved on (a new genesis, a re-probe) and the registry has not.
export function chainCrossCheck(root, chainDir) {
  const registry = loadRegistry(root);
  const problems = [];
  for (const net of registry.networks) {
    const r = resolveBook(net, root);
    const chainFile = path.join(chainDir, net.book.chainPath);
    if (!fs.existsSync(chainFile)) {
      problems.push(`${net.id}: citrate-chain has no ${net.book.chainPath}`);
    } else {
      const theirs = sha256(fs.readFileSync(chainFile));
      if (theirs !== r.sha256) problems.push(`${net.id}: the book (${r.sha256.slice(0, 16)}) differs from citrate-chain ${net.book.chainPath} (${theirs.slice(0, 16)})`);
    }
    if (net.codeSnapshot) {
      const snapChain = path.join(chainDir, net.codeSnapshot.chainPath);
      if (!fs.existsSync(snapChain)) problems.push(`${net.id}: citrate-chain has no ${net.codeSnapshot.chainPath}`);
      else {
        const a = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, net.codeSnapshot.file), "utf8")));
        const b = JSON.stringify(JSON.parse(fs.readFileSync(snapChain, "utf8")));
        if (a !== b) problems.push(`${net.id}: the getCode snapshot ${net.codeSnapshot.file} differs from citrate-chain ${net.codeSnapshot.chainPath}`);
      }
    }
  }
  return problems;
}

// Refresh the vendored inputs from a chain checkout: every getCode snapshot, every frozen archived book,
// and the sha256 pins in the registry. The current network's book comes from the npm package, so its pin
// is set from the installed package and must equal the chain's bytes (chainCrossCheck says so).
export function syncFromChain(root, chainDir) {
  const file = path.join(root, REGISTRY);
  const registry = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const net of registry.networks) {
    if (net.codeSnapshot) fs.copyFileSync(path.join(chainDir, net.codeSnapshot.chainPath), path.join(root, net.codeSnapshot.file));
    if (net.book.package) {
      const req = createRequire(path.join(root, "package.json"));
      net.book.sha256 = sha256(fs.readFileSync(req.resolve(`${net.book.package}/${net.book.file || "40204.json"}`)));
    } else {
      fs.copyFileSync(path.join(chainDir, net.book.chainPath), path.join(root, net.book.file));
      net.book.sha256 = sha256(fs.readFileSync(path.join(root, net.book.file)));
    }
  }
  fs.writeFileSync(file, JSON.stringify(registry, null, 2) + "\n");
  return registry;
}

// Addresses of retired networks that are not in the current network's book: citing one on a hand-written
// page is citing a dead address.
export function retiredAddressIndex(root) {
  const registry = loadRegistry(root);
  const current = new Set();
  const retired = new Map();
  for (const net of registry.networks) {
    const { book } = resolveBook(net, root);
    for (const a of bookAddresses(book)) {
      const al = a.address.toLowerCase();
      if (net.status === "current") current.add(al);
      else if (!retired.has(al)) retired.set(al, { net: net.id, name: a.name });
    }
  }
  for (const a of current) retired.delete(a);
  return { current, retired };
}

export function staleAddressHits(text, current, retired) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const a of line.match(/0x[0-9a-fA-F]{40}/g) || []) {
      const al = a.toLowerCase();
      if (current.has(al)) continue;
      const r = retired.get(al);
      if (r) hits.push({ line: i + 1, address: a, net: r.net, name: r.name });
    }
  });
  return hits;
}
