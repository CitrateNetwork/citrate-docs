/**
 * Testnet reset notice (r1007, owner-approved developer notice 2026-11-07).
 * A callout at the top of the developer pages plus one public notice page.
 * The reset date is a config value (NEXT_PUBLIC_TESTNET_RESET_DATE), "to be
 * announced" until set. Owner copy rules: no em-dashes, no overstatement, no
 * rewards language, never "dogfood".
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  showsTestnetResetNotice,
  testnetResetCallout,
  TESTNET_RESET_SLUG,
} from "@/lib/testnet-reset";
import { CONTENT_DOCS } from "@/content/_generated/content";

describe("which pages carry the callout", () => {
  it("shows on developer sections", () => {
    for (const s of ["/chain/rpc", "/contracts/reference", "/sdks/js", "/aa/paymaster", "/compute/gateway"]) {
      expect(showsTestnetResetNotice(s)).toBe(true);
    }
  });
  it("shows on every tutorial", () => {
    expect(showsTestnetResetNotice("/start/tutorials/first-transaction")).toBe(true);
    expect(showsTestnetResetNotice("/apps/tutorials/anything")).toBe(true);
  });
  it("does not show on non-developer pages or on the notice page itself", () => {
    for (const s of ["/start/primer", "/research/nat", "/enterprise/overview", TESTNET_RESET_SLUG, "/chainlink"]) {
      expect(showsTestnetResetNotice(s)).toBe(false);
    }
  });
});

describe("callout copy and date", () => {
  it("says 'to be announced' without a configured date", () => {
    expect(testnetResetCallout(undefined).dateLabel).toBe("to be announced");
    expect(testnetResetCallout("not-a-date").dateLabel).toBe("to be announced");
  });
  it("shows a configured YYYY-MM-DD date in UTC", () => {
    expect(testnetResetCallout("2026-12-01").dateLabel).toBe("December 1, 2026");
  });
  it("keeps the approved facts and links the notice page", () => {
    const c = testnetResetCallout(undefined);
    expect(c.body).toContain("40204");
    expect(c.body).toMatch(/fresh genesis/i);
    expect(c.body).toMatch(/will not carry over/i);
    expect(c.href).toBe(TESTNET_RESET_SLUG);
  });
  it("follows the owner copy rules", () => {
    const c = testnetResetCallout("2026-12-01");
    const all = `${c.title} ${c.body} ${c.linkLabel}`;
    expect(all).not.toMatch(/[—–!]/);
    expect(all).not.toMatch(/\b(reward|rewards|earn|earnings|airdrop|dogfood|guarantee)\b/i);
  });
});

describe("the notice page", () => {
  const file = path.resolve(__dirname, "../content/start/testnet-reset.md");
  it("exists, is public and is in the generated content", () => {
    expect(fs.existsSync(file)).toBe(true);
    const doc = CONTENT_DOCS[TESTNET_RESET_SLUG];
    expect(doc).toBeTruthy();
    expect(doc.tier).toBe("public");
  });
  it("carries the approved facts and follows the copy rules", () => {
    const md = fs.readFileSync(file, "utf8");
    for (const s of ["40204", "fresh genesis", "will not carry over", "https://faucet.citrate.ai", "10 test SALT", "https://x.com/citratenetwork", "https://github.com/CitrateNetwork"]) {
      expect(md).toContain(s);
    }
    expect(md).not.toMatch(/[—–!]/);
    expect(md).not.toMatch(/\b(reward|rewards|earn|earnings|airdrop|dogfood|guarantee)\b/i);
  });
});
