#!/usr/bin/env node
// Public-truth lint. Fails the content gate when a page claims something the code or the live chain
// contradicts, or when it names an internal audit finding. Runs before content-lint in `npm run content-lint`.
//
// Text is normalised before matching: markdown emphasis, inline HTML and code ticks are dropped, a hyphen
// split across a line break is joined, and every run of whitespace (including line breaks) collapses to one
// space. Rules then run per sentence, so a re-wrapped, bolded or reworded claim is still caught.
//
// Finality: while citrate-chain/verification/claims.json says checkpoint finality is not running (the
// default when the sibling repo is absent), a finality claim passes only if a status qualifier sits in the
// same clause, next to the claim ("specified, not running", "target design", "heuristic"...). A trailing
// "as specified" is not a qualifier.
//
// Usage: node scripts/truth-lint.mjs [--root DIR] [--no-fetch]
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const argRoot = argv.indexOf("--root");
const ROOT = argRoot >= 0
  ? path.resolve(argv[argRoot + 1])
  : path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const NO_FETCH = argv.includes("--no-fetch");

const FINALITY_RUNNING_DEFAULT = false;
function finalityRunning() {
  const claims = path.resolve(ROOT, "..", "citrate-chain", "verification", "claims.json");
  if (!fs.existsSync(claims)) return FINALITY_RUNNING_DEFAULT;
  const c = JSON.parse(fs.readFileSync(claims, "utf8")).claims?.deterministic_checkpoint_finality;
  return Boolean(c?.value?.running) && c?.verification_status !== "specified-not-running";
}

// The Tier-1 row both the org SECURITY.md and /security/posture must carry verbatim.
export const TIER1_ROW =
  "| **Tier 1**: consensus, value, keys, identity | `citrate-chain` (node, contracts, ZK), `citrate-core`, `citrate-identity`, `citrate-inference-gateway`, `citrate-compute-pool`, `citrate-coop`, `citrate-agent-runtime`, `citrate-sdk-js`, `citrate-sdk-python` |";

export function normalise(text) {
  let t = text.replace(/^﻿?---\n[\s\S]*?\n---\n/, " ");      // frontmatter
  t = t.replace(/-\s*\n\s*/g, "-");                                // "Human-in-\n the-loop"
  t = t.replace(/<[^>\n]{1,200}>/g, " ");                          // inline HTML / JSX tags
  t = t.replace(/[*_`~]+/g, "");                                   // emphasis, code ticks
  t = t.replace(/\]\([^)]*\)/g, "]");                              // link targets
  return t.replace(/\s+/g, " ");
}
const sentences = (t) => t.split(/(?<=[.!?|])\s+/);

const FINALITY_CURRENT = [
  /can ?not be reorg|can never be reorg|never be reorg/i,
  /past depth 100/i,
  /final at depth 100/i,
  /deterministic (bft )?(checkpoint )?finality/i,
  /checkpoint finality lands/i,
  /\bfinality (in|within|after|of) (about |around |roughly |~)?\d/i,
  /\b\d+\s*(s|sec|seconds?) (of|to) (bft )?finality/i,
  /\bfinali[sz]ed (after|at|within|in) (about |~)?\d/i,
  /reorgani[sz]ation that would rewrite a finali[sz]ed block is refused/i,
  /\bconfirm finality\b/i,
  /\bfinality (on citrate )?is depth-based/i,
  /\bfinality by depth\b/i,
  /\birreversib\w*\b.{0,30}\b(finality|finali[sz]ed|blocks?|state root)\b|\b(blocks?|finality|checkpoints?|state root)\b.{0,40}\birreversib/i,
  /\[Implemented\].{0,120}\b(finality|checkpoint)/i,
  /it is final under depth-based finality/i,
  /signed, deterministic guarantee/i,
];
const FINALITY_QUALIFIER = /specified, not running|specified but not|is specified|\(specified|\[Specified\]|not running|not yet running|not wired|target design|designed to|as designed|once (it|they|checkpoints|checkpoint finality) runs?|tests only|no protocol finality|heuristic|not a protocol guarantee|not protocol finality/i;
const QUAL_WINDOW = 90;

const ALWAYS = [
  [/proof of correct execution/i, "overclaims the ZK tier"],
  [/slashes the party at fault/i, "slashing is not enforceable end to end today"],
  [/\blive Halo2/i, "the Halo2 verifier is a research preview"],
  [/\bH\.?I\.?T\.?L(s|'s)?\b/, "owner rule: use HIC (Human In Control), never HITL"],
  [/human[\s\-‐-―]*in[\s\-‐-―]*(the[\s\-‐-―]*)?loop/i, "owner rule: use HIC, never human-in-the-loop"],
  [/\b(about |over |all )?76\+? (contracts )?(are )?(deployed|live)|\b76\+? deployed contracts|\ball 76 contracts/i, "57 of 76 book entries have code; say so"],
  [/14,555/, "no public derivation for 14,555 tests"],
  [/(npm (i|install)|pnpm add|yarn add|bun add)\s+citrate-js\b|from ['"]citrate-js['"]/i, "citrate-js is a stale personal-account package; use @citratelabs/sdk"],
  [/(npm (i|install)|pnpm add|yarn add|bun add)\s+@citratelabs\/chain-config/i, "@citratelabs/chain-config is not on npm"],
  [/\b(VERI|KYC|identity|verification)\b.{0,80}\bserver[\s-]?blind\b|\bserver[\s-]?blind\b.{0,80}\b(VERI|KYC|identity|verification)\b/i, "VERI processes evidence server-side; it is not server-blind"],
  [/\bdual[\s-]?control\b|\btwo administrators\b/i, "do not claim dual control for identity data"],
  [/every (node )?(operator|machine|node|person)\b.{0,80}\bidentity[\s-]verified|\bidentity[\s-]verified through VERI\b|\boperators are identity[\s-]verified/i, "node and consensus code do not check operator identity"],
  [/registry and (its )?activation height/i, "stake gating turns on with the registry alone (activation height defaults to 0)"],
  [/scan\.citrate\.ai|wss?:\/\/ws\.citrate\.ai|rpc2\.citrate\.ai|mirror\.citrate\.ai/i, "dead host"],
  [/Saul Loveman|Claude Opus lineage/, "the author byline is Larry Klosowski"],
  [/is the production marketplace path/i, "the gateway binary does not mount the paid router"],
  [/(x402|pay[\s-]per[\s-]call|paid (routes|calls|inference))\b(?!.{0,60}\bnot (yet )?(deployed|live|mounted))[^.]{0,60}\b(is |are )?(live|available now)\b/i, "paid rails are not deployed"],
  [/Block target time is about one second|\b1s target \(testnet\)|\b1s testnet block time/i, "measured block time is about 2 s"],
  [/keys\s*\.\s*openpgp\s*\.\s*org|PGP on request/i, "no PGP key is published for security@citrate.ai"],
  [/earns? a yield/i, "owner rule: SALT has no cash value until mainnet; no yield language"],
  [/\bPBA-[A-Za-z0-9]+-\d+\b/, "names an internal audit finding; public docs must not describe open findings"],
];

// Pages that must keep a product-status statement while the underlying feature is not live.
const MUST_SAY = [
  ["content/compute/gateway.md", /paid routes are not deployed/i, "keep the 'paid routes are not deployed' banner until the gateway binary mounts the paid router"],
  ["content/sdks/js.md", /MAINNET: 1, which is Ethereum mainnet's chain id/, "keep the CHAIN_IDS.MAINNET=1 warning while the SDK ships it"],
  ["public/llms.txt", /checkpoint finality is specified, not running/i, "llms.txt must state that checkpoint finality is specified, not running"],
  ["public/llms.txt", /paid inference and x402 rails are not deployed/i, "llms.txt must state that the paid rails are not deployed"],
  ["content/aa/passkeys.md", /passkey-only accounts are not yet available on chain 40204/, "keep the passkey status banner until passkey-only accounts work on 40204"],
  ["content/chain/consensus.md", /## Current status/, "keep the consensus current-status section"],
];

// Pre-re-roll money-contract addresses that have no code on 40204.
const KNOWN_STALE = ["0x1f73bb47", "0x4cba0234", "0x02f03ac1", "0x6003ad27", "0xe701d736", "0xcdb76eb5", "0x05209fe1", "0x61e324cf", "0x3e0c2b1c"];

function walk(dir, out, pred) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, pred);
    else if (pred(p)) out.push(p);
  }
}

function addressStatus(root) {
  const page = path.join(root, "content/chain/_generated/addresses.md");
  const status = new Map();
  if (!fs.existsSync(page)) return { status, deployedAt: null };
  const text = fs.readFileSync(page, "utf8");
  for (const m of text.matchAll(/^\| `([^`]+)` \| `(0x[0-9a-fA-F]{40})` \| ([^|]+) \|/gm)) {
    status.set(m[2].toLowerCase(), { name: m[1], deployed: !/not deployed/.test(m[3]) });
  }
  const deployedAt = (text.match(/^book_deployed_at: (.+)$/m) || [])[1] || null;
  return { status, deployedAt };
}

async function currentBookDeployedAt(root) {
  const sibling = path.resolve(root, "..", "citrate-chain", "contracts", "addresses", "40204.json");
  if (fs.existsSync(sibling)) return { at: JSON.parse(fs.readFileSync(sibling, "utf8")).deployedAt, src: "sibling citrate-chain" };
  if (NO_FETCH) return { at: null, src: "skipped (--no-fetch)" };
  try {
    const r = await fetch("https://raw.githubusercontent.com/CitrateNetwork/citrate-chain/main/contracts/addresses/40204.json", { signal: AbortSignal.timeout(10000) });
    if (r.ok) return { at: (await r.json()).deployedAt, src: "citrate-chain main" };
  } catch { /* fall through */ }
  return { at: null, src: "unavailable" };
}

export async function lint(root = ROOT) {
  const errors = [];
  const notes = [];
  const running = finalityRunning();
  const files = [];
  walk(path.join(root, "content"), files, (p) => p.endsWith(".md") && !p.includes(`${path.sep}_generated${path.sep}`));
  walk(path.join(root, "public"), files, (p) => /llms[^/]*\.txt$/.test(p));
  for (const extra of ["STYLE_GUIDE.md", "README.md", "SECURITY.md"]) if (fs.existsSync(path.join(root, extra))) files.push(path.join(root, extra));
  walk(path.join(root, "gradient_papers_v3"), files, (p) => p.endsWith(".md"));

  const { status, deployedAt } = addressStatus(root);

  for (const f of files) {
    const rel = path.relative(root, f);
    const isPaper = rel.startsWith("gradient_papers_v3");
    const raw = fs.readFileSync(f, "utf8");
    for (const s of sentences(normalise(raw))) {
      if (!running) {
        for (const re of FINALITY_CURRENT) {
          const m = s.match(re);
          if (!m) continue;
          const near = s.slice(Math.max(0, m.index - QUAL_WINDOW), m.index + m[0].length + QUAL_WINDOW);
          if (!FINALITY_QUALIFIER.test(near)) {
            errors.push(`${rel}: finality described as current while checkpoint finality is not running: ...${s.slice(Math.max(0, m.index - 40), m.index + 100)}...`);
          }
          break;
        }
      }
      for (const [re, why] of ALWAYS) {
        const m = s.match(re);
        if (m) errors.push(`${rel}: ${why}: ...${s.slice(Math.max(0, m.index - 40), m.index + 100)}...`);
      }
    }
    if (isPaper) {
      if (/`0x[0-9a-fA-F]{8}…`/.test(raw) && !raw.includes("**Addresses.** Contract addresses cited")) {
        errors.push(`${rel}: paper cites hand-copied addresses without the stale-address note`);
      }
      continue;
    }
    raw.split("\n").forEach((line, i) => {
      for (const a of line.match(/0x[0-9a-fA-F]{40}/g) || []) {
        const al = a.toLowerCase();
        const st = status.get(al);
        if (st && !st.deployed) errors.push(`${rel}:${i + 1}: ${a} (${st.name}) has no code on 40204`);
        if (KNOWN_STALE.some((k) => al.startsWith(k))) errors.push(`${rel}:${i + 1}: ${a} is a stale, codeless pre-re-roll address`);
      }
    });
  }

  for (const [rel, re, why] of MUST_SAY) {
    const f = path.join(root, rel);
    if (fs.existsSync(f) && !re.test(normalise(fs.readFileSync(f, "utf8")))) errors.push(`${rel}: ${why}`);
  }

  if (status.size === 0) errors.push("content/chain/_generated/addresses.md: no Status column; regenerate with npm run docs:addresses");
  const book = await currentBookDeployedAt(root);
  if (book.at === null) notes.push(`address-page drift check not run: current book ${book.src}`);
  else if (deployedAt !== book.at) errors.push(`content/chain/_generated/addresses.md: generated from book ${deployedAt}, current book (${book.src}) is ${book.at}; run npm run docs:addresses`);

  const posture = path.join(root, "content/security/posture.md");
  if (fs.existsSync(posture) && !fs.readFileSync(posture, "utf8").includes(TIER1_ROW)) {
    errors.push("content/security/posture.md: Tier 1 row differs from the org SECURITY.md table (scripts/truth-lint.mjs TIER1_ROW)");
  }
  return { errors, notes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, notes } = await lint(ROOT);
  for (const n of notes) console.log(`[truth-lint] NOTE: ${n}`);
  if (errors.length) {
    for (const e of errors) console.error(`[truth-lint] ${e}`);
    console.error(`[truth-lint] FAIL (${errors.length})`);
    process.exit(1);
  }
  console.log("[truth-lint] OK (public claims agree with claims.json, the address page and the owner rules)");
}
