/**
 * Testnet reset notice (r1007). Owner-approved developer notice, 2026-11-07.
 *
 * DATA SOURCE: the reset date is a deploy config value,
 * NEXT_PUBLIC_TESTNET_RESET_DATE (YYYY-MM-DD, UTC), inlined at build. Unset or
 * malformed means "to be announced". The full notice is the public page
 * content/start/testnet-reset.md. Nothing here reads the chain.
 *
 * Copy rules (owner): no em-dashes, no overstatement, no rewards language.
 * test/testnet-reset.test.ts enforces them.
 */

export const TESTNET_RESET_SLUG = "/start/testnet-reset";

/** Sections whose pages are for developers building on the testnet. */
const DEVELOPER_SECTIONS = new Set(["chain", "contracts", "sdks", "aa", "compute"]);

export function showsTestnetResetNotice(slug: string): boolean {
  if (slug === TESTNET_RESET_SLUG) return false;
  const parts = slug.replace(/^\//, "").split("/");
  return DEVELOPER_SECTIONS.has(parts[0] ?? "") || parts.includes("tutorials");
}

function dateLabel(raw: string | undefined | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw ?? "").trim());
  if (!m) return "to be announced";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "to be announced";
  return dt.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

export interface TestnetResetCallout {
  title: string;
  body: string;
  dateLabel: string;
  href: string;
  linkLabel: string;
}

export function testnetResetCallout(rawDate: string | undefined | null): TestnetResetCallout {
  return {
    title: "The testnet will reset",
    body:
      "The current testnet (chain ID 40204) will restart from a fresh genesis block before mainnet. The chain ID stays the same. " +
      "Contracts, balances and transaction history will not carry over, so keep your source code and deploy scripts to redeploy.",
    dateLabel: dateLabel(rawDate),
    href: TESTNET_RESET_SLUG,
    linkLabel: "Read the notice",
  };
}
