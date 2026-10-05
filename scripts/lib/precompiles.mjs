// Pure logic behind scripts/gen-precompiles.mjs, kept free of I/O so test/gen-precompiles.test.ts can
// drive it with fixtures. Inputs:
//   - citrate-chain core/execution/src/precompiles/mod.rs: PURE_PRECOMPILE_ADDRESSES (bridged into the EVM
//     at every height) and AGENT_FORK_PRECOMPILE_ADDRESSES (bridged from the agent fork height). Each
//     element line reads `module::path::NAME, // 0xNNNN`.
//   - citrate-chain core/execution/src/agent_fork.rs: AGENT_PRECOMPILES_PINS, the release pin per chain id.
//   - the address book's `precompiles` block (name -> padded address), which also lists the hosted
//     inference family that is not bridged.
//   - the docs-owned description map (scripts/lib/precompile-descriptions.mjs).

export const ARRAYS = {
  PURE_PRECOMPILE_ADDRESSES: "pure",
  AGENT_FORK_PRECOMPILE_ADDRESSES: "agent",
};

const shortOf = (n) => "0x" + n.toString(16).toUpperCase().padStart(4, "0");
const paddedOf = (n) => "0x" + n.toString(16).padStart(40, "0");

// Parse one `pub const NAME: [[u8; 20]; N] = [ ... ];` array. Returns null when the array is absent.
export function parseArray(src, arrayName) {
  const re = new RegExp(`pub const ${arrayName}\\s*:\\s*\\[\\[u8;\\s*20\\];\\s*(\\d+)\\]\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = re.exec(src);
  if (!m) return null;
  const declared = Number(m[1]);
  const entries = [];
  const errors = [];
  for (const raw of m[2].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    const em = /^([A-Za-z_][\w:]*)\s*,\s*\/\/\s*0x([0-9A-Fa-f]{1,4})\b/.exec(line);
    if (!em) {
      errors.push(`${arrayName}: cannot read element line "${line}" (expected \`path::NAME, // 0xNNNN\`)`);
      continue;
    }
    const name = em[1].split("::").pop();
    entries.push({ name, value: parseInt(em[2], 16) });
  }
  if (entries.length !== declared && errors.length === 0) {
    errors.push(`${arrayName}: declares ${declared} elements but ${entries.length} were read`);
  }
  return { entries, errors };
}

// The release pin for `chainId`: undefined when absent (no pin table, or the chain id is not in it),
// null for `None`, a number for `Some(h)`.
export function parseAgentPin(src, chainId) {
  if (!src) return undefined;
  const m = /AGENT_PRECOMPILES_PINS\s*:[^=]*=\s*&\[([\s\S]*?)\];/.exec(src);
  if (!m) return undefined;
  const re = /\(\s*(\d+)\s*,\s*(None|Some\(\s*(\d+)\s*\))\s*\)/g;
  let e;
  while ((e = re.exec(m[1]))) {
    if (Number(e[1]) === Number(chainId)) return e[3] === undefined ? null : Number(e[3]);
  }
  return undefined;
}

function activation(kind, pin) {
  if (kind === "pure") return { reachable: "yes", active: "bridged at every height" };
  if (kind === "hosted") return { reachable: "no, not bridged into the EVM", active: "node-hosted only" };
  if (pin === 0) return { reachable: "yes", active: "**active from genesis** (pinned at height 0)" };
  if (typeof pin === "number") return { reachable: "yes, from the fork height", active: `from block ${pin} (pinned)` };
  if (pin === null) return { reachable: "no, fork not activated", active: "not activated (pin is None)" };
  return { reachable: "no, fork not pinned", active: "no pin for this chain at this chain ref" };
}

// Join the sources into table rows. Throws one Error listing every inconsistency.
export function buildPrecompileRows({ modRs, agentForkRs, bookPrecompiles, descriptions, chainId }) {
  const errors = [];
  const chain = new Map(); // name -> { value, kind }
  for (const [arrayName, kind] of Object.entries(ARRAYS)) {
    const parsed = parseArray(modRs, arrayName);
    if (!parsed) {
      errors.push(`chain mod.rs has no ${arrayName}`);
      continue;
    }
    errors.push(...parsed.errors);
    for (const { name, value } of parsed.entries) {
      if (chain.has(name)) errors.push(`chain lists ${name} twice`);
      chain.set(name, { value, kind });
    }
  }
  const pin = parseAgentPin(agentForkRs, chainId);

  const book = bookPrecompiles || {};
  const byBookName = new Map();
  for (const [key, d] of Object.entries(descriptions)) if (d.book) byBookName.set(d.book, key);

  for (const name of chain.keys()) {
    if (!descriptions[name]) errors.push(`chain precompile ${name} (${shortOf(chain.get(name).value)}) has no entry in the description map`);
  }
  for (const bookName of Object.keys(book)) {
    if (!byBookName.has(bookName)) errors.push(`book precompile ${bookName} (${book[bookName]}) has no entry in the description map`);
  }

  const rows = [];
  for (const [name, d] of Object.entries(descriptions)) {
    const c = chain.get(name);
    const inBook = d.book !== undefined && Object.prototype.hasOwnProperty.call(book, d.book);
    if (d.book !== undefined && !inBook) {
      errors.push(`description map entry ${name} names book key ${d.book}, which the book does not carry`);
    }
    if (!c && !inBook) {
      errors.push(`description map entry ${name} is in neither the chain arrays nor the book`);
      continue;
    }
    let value;
    if (inBook) {
      const addr = String(book[d.book]).toLowerCase();
      if (!/^0x0{36}[0-9a-f]{4}$/.test(addr)) {
        errors.push(`book precompile ${d.book} has a non-canonical address ${book[d.book]}`);
        continue;
      }
      value = parseInt(addr.slice(-4), 16);
      if (c && c.value !== value) {
        errors.push(`${name}: chain says ${shortOf(c.value)}, book ${d.book} says ${shortOf(value)}`);
      }
    }
    if (c) value = c.value;
    const kind = c ? c.kind : "hosted";
    rows.push({ name, short: shortOf(value), padded: paddedOf(value), value, family: d.family, does: d.does, kind, book: inBook ? d.book : null, ...activation(kind, pin) });
  }
  const seen = new Map();
  for (const r of rows) {
    if (seen.has(r.value)) errors.push(`${r.name} and ${seen.get(r.value)} share ${r.short}`);
    seen.set(r.value, r.name);
  }
  if (errors.length) {
    const err = new Error(`precompile sources disagree:\n  - ${errors.join("\n  - ")}`);
    err.problems = errors;
    throw err;
  }
  rows.sort((a, b) => a.value - b.value);
  return { rows, pin };
}

export function renderPrecompilesMd({ rows, pin, chainId, chainName, sha }) {
  const agent = rows.filter((r) => r.kind === "agent");
  const pinText =
    pin === 0
      ? `The ${agent.length} agent precompiles are **active from genesis** on ${chainId}: the release pin \`AGENT_PRECOMPILES_PINS\` sets their fork height to 0.`
      : typeof pin === "number"
        ? `The ${agent.length} agent precompiles activate at block ${pin} on ${chainId} (release pin \`AGENT_PRECOMPILES_PINS\`).`
        : `The ${agent.length} agent precompiles are not activated on ${chainId} at this chain ref (release pin \`AGENT_PRECOMPILES_PINS\` is ${pin === null ? "`None`" : "absent"}); until they are, a contract call to them does not reach the precompile.`;
  const table = rows
    .map((r) => `| \`${r.short}\` | \`${r.padded}\` | \`${r.name}\` | ${r.family} | ${r.does} | ${r.reachable} | ${r.active} |`)
    .join("\n");
  return `---
title: Precompile addresses
codex_slug: /chain/precompile-addresses
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/execution/src/precompiles/mod.rs
surfaces: [CHAIN-precompile-addresses]
audited_against_sha: ${sha}
status: Implemented
created: 2026-10-04T00:00:00Z
author: Citrate team
nav_order: 6
---

This is the canonical list of Citrate precompile addresses on chain ${chainId} (${chainName}). It is generated
from the chain source at commit \`${sha}\`: the bridged sets \`PURE_PRECOMPILE_ADDRESSES\` and
\`AGENT_FORK_PRECOMPILE_ADDRESSES\` in \`core/execution/src/precompiles/mod.rs\`, the release pin in
\`core/execution/src/agent_fork.rs\`, and the \`precompiles\` block of the address book
(\`contracts/addresses/40204.json\`). Only the one-line descriptions are written by hand. Precompiles are fixed
addresses and do not move across re-rolls.

${pinText}

"From contracts" says whether contract code can call the address. The hosted inference family is served by the
node and is not bridged into the EVM, so a contract call to it does not reach the model runtime. The standard
Ethereum precompiles at \`0x01\` to \`0x09\` are unchanged and not listed. For how to call these, see
[precompiles](/chain/precompiles).

| Address | Padded address | Name | Family | What it does | From contracts | Activation on ${chainId} |
|---|---|---|---|---|---|---|
${table}
`;
}
