// Shared CLI plumbing for the generators that read a citrate-chain checkout
// (scripts/gen-addresses.mjs, scripts/gen-precompiles.mjs).
//
//   --chain <dir>   the citrate-chain checkout to read (default: the sibling ../citrate-chain)
//   --check         regenerate in memory and compare with the committed output; exit non-zero on drift
//                   and never write. A missing chain checkout is an error under --check (CI must not pass
//                   by reading nothing).
import fs from "node:fs";
import path from "node:path";

export function parseGenArgs(argv, root) {
  let chain = null;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") check = true;
    else if (a === "--chain") {
      const v = argv[++i];
      if (!v) throw new Error("--chain needs a directory");
      chain = v;
    } else if (a.startsWith("--chain=")) chain = a.slice("--chain=".length);
    else throw new Error(`unknown argument: ${a}`);
  }
  const chainDir = chain ? path.resolve(process.cwd(), chain) : path.resolve(root, "..", "citrate-chain");
  return { chainDir, check };
}

// A minimal line diff for the --check report: the first differing lines, enough to see what moved.
export function firstDiff(expected, actual, max = 12) {
  const a = expected.split("\n");
  const b = actual.split("\n");
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && out.length < max; i++) {
    if (a[i] !== b[i]) {
      if (a[i] !== undefined) out.push(`  line ${i + 1} committed: ${a[i]}`);
      if (b[i] !== undefined) out.push(`  line ${i + 1} generated: ${b[i]}`);
    }
  }
  return out.join("\n");
}

// Write `content` to `outPath`, or under --check compare it with the committed file. Returns the exit code.
export function writeOrCheck({ outPath, content, check, tag, root }) {
  const rel = path.relative(root, outPath);
  if (check) {
    const committed = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
    if (committed === content) {
      console.log(`[${tag}] --check: ${rel} is up to date.`);
      return 0;
    }
    console.error(`[${tag}] --check: ${rel} has drifted from the chain sources. Regenerate it and commit.`);
    console.error(firstDiff(committed, content));
    return 1;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
  return 0;
}
