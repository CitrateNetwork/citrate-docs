/**
 * The contract-address pages on docs.citrate.ai are rendered at build time from the canonical
 * address book (citrate-chain/contracts/addresses/40204.json, published byte for byte as
 * @citratelabs/chain-config), one page per network, listed in content/chain/networks.json.
 * These tests pin the tripwires: a book whose bytes or genesis hash differ from the registry pin
 * is refused, a getCode snapshot for another book is refused, every book address reaches its page,
 * a retired network is marked as retired, the committed pages are exactly what the generator
 * renders, the chain cross-check catches a moved book, and hand-written pages citing a retired
 * network's address fail the lint.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  loadRegistry,
  resolveBook,
  loadSnapshot,
  bookAddresses,
  renderNetworkPage,
  buildPages,
  chainCrossCheck,
  staleAddressHits,
  // @ts-expect-error -- plain ESM helper shared with scripts/gen-addresses.mjs
} from "@/scripts/lib/addresses.mjs";

const ROOT = path.resolve(__dirname, "..");
const sha = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");

type Net = { id: string; status: string; book: { package?: string; file: string; sha256: string; chainPath: string }; genesisHash?: string | null };
type Registry = { chainId: number; current: string; networks: Net[] };

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gen-addr-"));
}

const BOOK = {
  chainId: 40204,
  chainName: "Citrate Network",
  rpcUrl: "https://rpc.citrate.ai",
  deployer: "0x1111111111111111111111111111111111111111",
  deployedAt: "2026-01-01T00:00:00Z",
  genesisHash: "0x" + "ab".repeat(32),
  contracts: { ModelRegistry: "0x2222222222222222222222222222222222222222" },
  aaStack: { EntryPoint: "0x3333333333333333333333333333333333333333" },
  CitrateMemberSBT: "0x4444444444444444444444444444444444444444",
  MembershipStakeVault: "0x5555555555555555555555555555555555555555",
  precompiles: { ModelDeploy: "0x0000000000000000000000000000000000000100" },
};

function vendoredNet(root: string, book: object, over: Partial<Net> = {}): Net {
  const text = JSON.stringify(book, null, 2) + "\n";
  fs.mkdirSync(path.join(root, "books"), { recursive: true });
  fs.writeFileSync(path.join(root, "books/b.json"), text);
  return {
    id: "rX",
    status: "archived",
    book: { file: "books/b.json", sha256: sha(text), chainPath: "contracts/addresses/rX/40204.json" },
    genesisHash: (book as { genesisHash?: string }).genesisHash ?? null,
    ...over,
  };
}

describe("network registry", () => {
  const reg: Registry = loadRegistry(ROOT);

  it("names exactly one current network, and it is the one `current` points at", () => {
    const cur = reg.networks.filter((n) => n.status === "current");
    expect(cur).toHaveLength(1);
    expect(cur[0].id).toBe(reg.current);
    expect(new Set(reg.networks.map((n) => n.id)).size).toBe(reg.networks.length);
  });

  it("sources the current network from the published package, or a pinned copy while its release is pending", () => {
    const cur = reg.networks.find((n) => n.status === "current")! as Net & { book: { packagePending?: string } };
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (cur.book.package) {
      expect(deps[cur.book.package]).toMatch(/^npm:@citratelabs\/chain-config@\d+\.\d+\.\d+$/);
    } else {
      // Until the release is published the page renders from a pinned copy of the chain's root book,
      // and the registry must name the release that will replace it.
      expect(cur.book.packagePending).toMatch(/^@citratelabs\/chain-config@\d+\.\d+\.\d+$/);
      expect(cur.book.file).toMatch(/^content\/chain\/address-books\//);
    }
  });

  it("the live network is r1007, and r1006 is archived from its published package", () => {
    expect(reg.current).toBe("r1007");
    const r7 = reg.networks.find((n) => n.id === "r1007")!;
    expect(r7.genesisHash).toBe("0xcf68634502b4fca1e977ac8dd35aa006bb40c04208d5cd55f1c2b508bba96631");
    expect(r7.book.chainPath).toBe("contracts/addresses/40204.json");
    const r6 = reg.networks.find((n) => n.id === "r1006")!;
    expect(r6.status).toBe("archived");
    expect(r6.book.package).toBe("citrate-book-r1006");
    expect(r6.book.chainPath).toBe("contracts/addresses/r1006/40204.root.json");
  });

  it("refuses a current network that has neither a package nor a pending release", () => {
    const root = tmpRoot();
    fs.mkdirSync(path.join(root, "content/chain"), { recursive: true });
    const bad = JSON.parse(JSON.stringify(reg));
    const cur = bad.networks.find((n: Net) => n.status === "current");
    delete cur.book.package;
    delete cur.book.packagePending;
    cur.book.file = "x.json";
    fs.writeFileSync(path.join(root, "content/chain/networks.json"), JSON.stringify(bad));
    expect(() => loadRegistry(root)).toThrow(/published package/);
  });

  it("refuses a registry with two current networks", () => {
    const root = tmpRoot();
    fs.mkdirSync(path.join(root, "content/chain"), { recursive: true });
    const bad = { ...reg, networks: reg.networks.map((n) => ({ ...n, status: "current" })) };
    if (bad.networks.length < 2) bad.networks.push({ ...bad.networks[0], id: "rZ" });
    fs.writeFileSync(path.join(root, "content/chain/networks.json"), JSON.stringify(bad));
    expect(() => loadRegistry(root)).toThrow(/exactly one current network/);
  });
});

describe("book resolution", () => {
  it("resolves every registered network and the bytes match the registry pin", () => {
    const reg: Registry = loadRegistry(ROOT);
    for (const net of reg.networks) {
      const r = resolveBook(net, ROOT);
      expect(r.sha256).toBe(net.book.sha256);
      expect(r.book.chainId).toBe(reg.chainId);
      if (net.genesisHash) expect(r.book.genesisHash).toBe(net.genesisHash);
    }
  });

  it("names the fix when a network's npm alias is not installed (a stale node_modules)", () => {
    const root = tmpRoot();
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "x", dependencies: {} }));
    const net = { id: "rX", status: "archived", book: { package: "citrate-book-rX", file: "40204.json", sha256: "0".repeat(64), chainPath: "c" } };
    expect(() => resolveBook(net, root)).toThrow(/citrate-book-rX is not installed: run npm ci/);
  });

  it("refuses a book whose bytes differ from the sha256 pin", () => {
    const root = tmpRoot();
    const net = vendoredNet(root, BOOK);
    net.book.sha256 = "0".repeat(64);
    expect(() => resolveBook(net, root)).toThrow(/sha256/);
  });

  it("refuses a book whose genesis hash is not the network's", () => {
    const root = tmpRoot();
    const net = vendoredNet(root, BOOK, { genesisHash: "0x" + "cd".repeat(32) });
    expect(() => resolveBook(net, root)).toThrow(/genesisHash/);
  });

  it("refuses a getCode snapshot taken for another book", () => {
    const root = tmpRoot();
    const net = vendoredNet(root, BOOK);
    const snapFile = path.join(root, "books/snap.json");
    fs.writeFileSync(snapFile, JSON.stringify({ chainId: 40204, block: 1, probed_at: "x", book_deployedAt: "2025-01-01T00:00:00Z", codeless: [] }));
    const withSnap = { ...net, codeSnapshot: { file: "books/snap.json", chainPath: "x" } };
    expect(() => loadSnapshot(withSnap, root, BOOK)).toThrow(/snapshot is for book/);
    fs.writeFileSync(snapFile, JSON.stringify({ chainId: 40204, genesisHash: "0x" + "ef".repeat(32), block: 1, probed_at: "x", book_deployedAt: BOOK.deployedAt, codeless: [] }));
    expect(() => loadSnapshot(withSnap, root, BOOK)).toThrow(/genesis/);
  });
});

describe("page rendering", () => {
  const snapshot = { chainId: 40204, block: 9, probed_at: "2026-01-02T00:00:00Z", book_deployedAt: BOOK.deployedAt, codeless: ["aaStack.EntryPoint"] };
  const registry = {
    chainId: 40204,
    current: "rB",
    networks: [
      { id: "rB", status: "current", book: { package: "p", file: "40204.json", sha256: "a".repeat(64), chainPath: "c" } },
      { id: "rA", status: "archived", retiredAt: "2026-11-10", book: { file: "f", sha256: "b".repeat(64), chainPath: "c" } },
    ],
  };
  const source = { kind: "npm", package: "p", name: "@citratelabs/chain-config", version: "9.9.9" };

  it("puts every address in the book on the page, with its getCode status", () => {
    const md = renderNetworkPage({ registry, net: registry.networks[0], book: BOOK, snapshot, source, sha256: "a".repeat(64), slug: "/chain/addresses" });
    for (const a of bookAddresses(BOOK)) expect(md).toContain(a.address);
    expect(md).toMatch(/\| `EntryPoint` \| `0x3333333333333333333333333333333333333333` \| \*\*not deployed\*\* \(no code\) \|/);
    expect(md).toMatch(/^codex_slug: \/chain\/addresses$/m);
    expect(md).toMatch(/^book_deployed_at: 2026-01-01T00:00:00Z$/m);
    expect(md).toContain("@citratelabs/chain-config@9.9.9");
    expect(md).toContain("/chain/addresses/rA");
    expect(md).not.toMatch(/retired network/i);
    expect(md).not.toMatch(/—/);
  });

  it("a current page rendered from a pinned copy says the published package is not this network yet", () => {
    const net = { id: "rB", status: "current", book: { file: "f", sha256: "a".repeat(64), chainPath: "c", packagePending: "@citratelabs/chain-config@9.9.9" } };
    const md = renderNetworkPage({ registry, net, book: BOOK, snapshot, source: { kind: "vendored", file: "f", pending: "@citratelabs/chain-config@9.9.9" }, sha256: "a".repeat(64), slug: "/chain/addresses" });
    expect(md).toContain("@citratelabs/chain-config@9.9.9");
    expect(md).toMatch(/not published yet/);
    expect(md).toMatch(/citrate-chain\/c/);
    expect(md).not.toMatch(/retired network/i);
  });

  it("marks a retired network as retired and warns against sending to it", () => {
    const md = renderNetworkPage({ registry, net: registry.networks[1], book: BOOK, snapshot, source: { kind: "vendored", file: "f" }, sha256: "b".repeat(64), slug: "/chain/addresses/rA" });
    expect(md).toMatch(/retired network/i);
    expect(md).toMatch(/do not send/i);
    expect(md).toContain("/chain/addresses");
    expect(md).toMatch(/^codex_slug: \/chain\/addresses\/rA$/m);
  });
});

describe("build-time generation", () => {
  it("the committed pages are exactly what the generator renders from the books", () => {
    const pages = buildPages(ROOT);
    const reg: Registry = loadRegistry(ROOT);
    // one stable page for the current network plus one page per registered network
    expect(pages).toHaveLength(reg.networks.length + 1);
    for (const p of pages) {
      expect(fs.existsSync(p.outPath)).toBe(true);
      expect(fs.readFileSync(p.outPath, "utf8")).toBe(p.content);
    }
  });

  it("the stable /chain/addresses page lists the current network's book", () => {
    const reg: Registry = loadRegistry(ROOT);
    const cur = reg.networks.find((n) => n.status === "current")!;
    const { book } = resolveBook(cur, ROOT);
    const page = fs.readFileSync(path.join(ROOT, "content/chain/_generated/addresses.md"), "utf8");
    for (const a of bookAddresses(book)) expect(page).toContain(a.address);
  });

  it("the build regenerates the pages before the content index (prebuild and predev)", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    for (const s of ["prebuild", "predev"]) {
      const cmd: string = pkg.scripts[s];
      const gen = cmd.indexOf("scripts/gen-addresses.mjs");
      expect(gen).toBeGreaterThanOrEqual(0);
      expect(gen).toBeLessThan(cmd.indexOf("scripts/build-content.mjs"));
    }
  });
});

describe("chain cross-check (--check --chain)", () => {
  function fakeChain(reg: Registry): string {
    const chain = tmpRoot();
    for (const net of reg.networks) {
      const src = resolveBook(net, ROOT);
      fs.mkdirSync(path.dirname(path.join(chain, net.book.chainPath)), { recursive: true });
      fs.writeFileSync(path.join(chain, net.book.chainPath), src.bytes);
      const n = net as Net & { codeSnapshot?: { file: string; chainPath: string } };
      if (n.codeSnapshot) {
        fs.mkdirSync(path.dirname(path.join(chain, n.codeSnapshot.chainPath)), { recursive: true });
        fs.copyFileSync(path.join(ROOT, n.codeSnapshot.file), path.join(chain, n.codeSnapshot.chainPath));
      }
    }
    return chain;
  }

  it("passes against a chain that carries the same books and snapshots", () => {
    const reg: Registry = loadRegistry(ROOT);
    expect(chainCrossCheck(ROOT, fakeChain(reg))).toEqual([]);
  });

  it("fails when the chain's book for the current network has moved (the re-genesis tripwire)", () => {
    const reg: Registry = loadRegistry(ROOT);
    const chain = fakeChain(reg);
    const cur = reg.networks.find((n) => n.status === "current")!;
    fs.writeFileSync(path.join(chain, cur.book.chainPath), JSON.stringify({ ...BOOK, genesisHash: "0x" + "99".repeat(32) }));
    const problems: string[] = chainCrossCheck(ROOT, chain);
    expect(problems.join("\n")).toMatch(new RegExp(`${cur.id}: .*differs from citrate-chain`));
  });

  it("the CLI fails --check against that chain and leaves the pages alone", () => {
    const reg: Registry = loadRegistry(ROOT);
    const chain = fakeChain(reg);
    const cur = reg.networks.find((n) => n.status === "current")!;
    fs.writeFileSync(path.join(chain, cur.book.chainPath), "{}");
    const before = fs.readFileSync(path.join(ROOT, "content/chain/_generated/addresses.md"), "utf8");
    const r = spawnSync(process.execPath, ["scripts/gen-addresses.mjs", "--chain", chain, "--check"], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/differs from citrate-chain/);
    expect(fs.readFileSync(path.join(ROOT, "content/chain/_generated/addresses.md"), "utf8")).toBe(before);
  });
});

describe("hand-written pages", () => {
  it("flags an address that belongs to a retired network and not to the current one", () => {
    const current = new Set(["0x2222222222222222222222222222222222222222"]);
    const retired = new Map([["0x6666666666666666666666666666666666666666", { net: "rA", name: "OldThing" }]]);
    const text = "use `0x2222222222222222222222222222222222222222`\nnot 0x6666666666666666666666666666666666666666 any more\n";
    expect(staleAddressHits(text, current, retired)).toEqual([{ line: 2, address: "0x6666666666666666666666666666666666666666", net: "rA", name: "OldThing" }]);
  });

  it("no hand-written content page cites a retired network's address", () => {
    const r = spawnSync(process.execPath, ["scripts/truth-lint.mjs", "--no-fetch"], { cwd: ROOT, encoding: "utf8" });
    expect(r.stderr).not.toMatch(/retired network/);
  });
});
