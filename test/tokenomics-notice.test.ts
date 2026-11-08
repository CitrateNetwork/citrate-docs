import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
// @ts-expect-error -- plain ESM helper shared with scripts/build-content.mjs tooling
import { tokenomicsTermsIn, tokenomicsProse, hasTokenomicsNoticeFlag } from "@/scripts/lib/tokenomics-terms.mjs";
import { CONTENT_DOCS } from "@/content/_generated/content";
import {
  TokenomicsNotice,
  TOKENOMICS_NOTICE_TEXT,
  TOKENOMICS_STATUS_SLUG,
} from "@/components/tokenomics-notice";

// Owner decision 2026-10-27: SALT and rewards content stays in the docs, but every page that discusses
// network economics must say that tokenomics are not yet determined. This is the tripwire: a page whose
// prose mentions the terms in scripts/lib/tokenomics-terms.mjs must set `tokenomics_notice: true`, which
// makes the reader render the shared TokenomicsNotice. New pages cannot skip it.

const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");

/**
 * Pages whose prose trips the classifier in a sense that is not network economics. Each entry needs a
 * reason, and the "exemptions stay honest" test fails once an entry no longer matches or carries the flag.
 */
const EXEMPT: Record<string, string> = {
  "apps/learning-center.md": "\"reward\" is a verb about routing learning, not a token reward",
  "methodology/sops.md": "a link label to /operators/rewards in an SOP index; the linked page carries the notice",
  "chain/precompiles.md": "\"gas economics\" names a gated topic; no economic figures on the page",
  "enterprise/procurement.md": "enterprise license fees and deal terms, not network economics",
};

function authoredPages(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "_generated") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) out.push(p);
    }
  };
  walk(CONTENT);
  return out.sort();
}

const rel = (p: string) => path.relative(CONTENT, p).split(path.sep).join("/");
const read = (p: string) => fs.readFileSync(p, "utf8");
const slugOf = (raw: string, file: string) =>
  /^codex_slug:\s*(\S+)\s*$/m.exec(raw)?.[1] ?? "/" + rel(file).replace(/\.md$/, "");

describe("tokenomics notice tripwire", () => {
  const pages = authoredPages();

  it("finds the content corpus", () => {
    expect(pages.length).toBeGreaterThan(50);
  });

  it("every page that mentions network-economics terms sets tokenomics_notice: true", () => {
    const missing = pages
      .filter((f) => !EXEMPT[rel(f)])
      .filter((f) => tokenomicsTermsIn(read(f)).length > 0 && !hasTokenomicsNoticeFlag(read(f)))
      .map((f) => `${rel(f)} (${tokenomicsTermsIn(read(f)).join(", ")})`);
    expect(missing).toEqual([]);
  });

  it("exemptions stay honest: each exists, still matches a term, and has no flag", () => {
    for (const p of Object.keys(EXEMPT)) {
      const f = path.join(CONTENT, p);
      expect(fs.existsSync(f), p).toBe(true);
      expect(tokenomicsTermsIn(read(f)).length, p).toBeGreaterThan(0);
      expect(hasTokenomicsNoticeFlag(read(f)), p).toBe(false);
    }
  });

  it("the generated content module carries the flag through to the reader", () => {
    const flagged = pages.filter((f) => hasTokenomicsNoticeFlag(read(f)));
    expect(flagged.length).toBeGreaterThan(40);
    for (const f of flagged) {
      const slug = slugOf(read(f), f);
      expect(CONTENT_DOCS[slug]?.tokenomicsNotice, slug).toBe(true);
    }
  });

  it("the doc reader renders the notice for flagged pages, before the body", () => {
    const src = read(path.join(ROOT, "components/doc-view.tsx"));
    const notice = src.indexOf("{doc.tokenomicsNotice && <TokenomicsNotice />}");
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(src.indexOf("<Markdown source={doc.body}"));
  });
});

describe("TokenomicsNotice", () => {
  const html = renderToStaticMarkup(React.createElement(TokenomicsNotice));

  it("states the owner wording once, identically", () => {
    expect(TOKENOMICS_NOTICE_TEXT).toBe(
      "Tokenomics are not yet determined. Figures on this page describe the current testnet and may change " +
        "before mainnet. Nothing here is an offer or a promise of value.",
    );
    expect(html).toContain(TOKENOMICS_NOTICE_TEXT);
    expect(html).toContain('role="note"');
  });

  it("links to the tokenomics status page, which exists and is public", () => {
    expect(html).toContain(`href="${TOKENOMICS_STATUS_SLUG}"`);
    const status = CONTENT_DOCS[TOKENOMICS_STATUS_SLUG];
    expect(status?.tier).toBe("public");
    expect(status?.tokenomicsNotice).toBe(true);
  });
});

describe("tokenomics status page", () => {
  it("states plainly what is and is not decided", () => {
    const file = path.join(CONTENT, "start/tokenomics.md");
    expect(fs.existsSync(file)).toBe(true);
    const prose = tokenomicsProse(read(file));
    expect(prose).toMatch(/not yet determined/);
    for (const t of ["supply", "distribution", "rewards", "emissions", "fees"]) expect(prose).toContain(t);
    expect(prose).toMatch(/testnet SALT has no cash value/i);
    expect(prose).toMatch(/finalized and published before mainnet/i);
  });
});

/** Sentences that present proposed economics as final, or promise value. None may appear in prose. */
const FINAL_CLAIMS: [string, RegExp][] = [
  ["APY", /\bAPY\b/],
  ["you will earn", /\byou will (?:earn|receive|be paid)\b/i],
  ["guaranteed return", /\bguaranteed? (?:rewards?|income|returns?|yield)\b/i],
  ["supply is fixed", /\bsupply is fixed\b|\bfixed (?:one trillion )?supply\b/i],
  ["never more", /\bnever more\b/i],
  ["project earnings", /\bproject (?:your )?earnings\b/i],
  ["what does not move", /\bwhat does not move\b/i],
];

describe("no final-sounding economics claims", () => {
  it("no authored page states proposed economics as final", () => {
    const hits: string[] = [];
    for (const f of authoredPages()) {
      const prose = tokenomicsProse(read(f));
      for (const [label, re] of FINAL_CLAIMS) if (re.test(prose)) hits.push(`${rel(f)}: ${label}`);
    }
    expect(hits).toEqual([]);
  });
});

describe("tokenomics term classifier", () => {
  const page = (body: string) => `---\ntitle: t\n---\n${body}\n`;

  it("matches the economics vocabulary in prose", () => {
    expect(tokenomicsTermsIn(page("Fees settle in SALT."))).toEqual(expect.arrayContaining(["SALT", "fee"]));
    expect(tokenomicsTermsIn(page("A one trillion supply cap."))).toContain("supply");
    expect(tokenomicsTermsIn(page("The base reward halves every 2,100,000 blocks."))).toEqual(
      expect.arrayContaining(["reward", "halving"]),
    );
    expect(tokenomicsTermsIn(page("A node earns SALT for sealing blocks."))).toContain("earn");
    expect(tokenomicsTermsIn(page("An APY figure."))).toContain("APY");
    expect(tokenomicsTermsIn(page("Your grant lands and bonds into stake."))).toEqual(
      expect.arrayContaining(["grant (economic)", "stake"]),
    );
  });

  it("ignores code, link targets, frontmatter, and the non-economic senses", () => {
    expect(tokenomicsTermsIn(page("Read `core/economics/src/lib.rs` and the `SALT` symbol."))).toEqual([]);
    expect(tokenomicsTermsIn(page("See the [economic state](/chain/economics)."))).toEqual([]);
    expect(tokenomicsTermsIn(page("```rust\nlet fee = reward + stake;\n```"))).toEqual([]);
    expect(tokenomicsTermsIn("---\ntitle: Rewards\nsource: core/economics\n---\nNothing here.\n")).toEqual([]);
    expect(tokenomicsTermsIn(page("A CREATE2 salt and a password salt."))).toEqual([]);
    expect(tokenomicsTermsIn(page("A supply chain review. Supply the key. The certification was earned."))).toEqual([]);
    expect(tokenomicsTermsIn(page("Membership grants it a capability."))).toEqual([]);
  });

  it("reads the flag from frontmatter only", () => {
    expect(hasTokenomicsNoticeFlag("---\ntitle: t\ntokenomics_notice: true\n---\nbody\n")).toBe(true);
    expect(hasTokenomicsNoticeFlag("---\ntitle: t\n---\ntokenomics_notice: true\n")).toBe(false);
    expect(hasTokenomicsNoticeFlag("---\ntitle: t\ntokenomics_notice: false\n---\nbody\n")).toBe(false);
  });
});
