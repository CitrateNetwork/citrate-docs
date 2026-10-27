import React from "react";
import Link from "next/link";
import { Icon } from "./icons";

/** Route of the single page that states the status of network economics. */
export const TOKENOMICS_STATUS_SLUG = "/start/tokenomics";

/** The notice text, shared by every page so the wording stays identical everywhere. */
export const TOKENOMICS_NOTICE_TEXT =
  "Tokenomics are not yet determined. Figures on this page describe the current testnet and may change " +
  "before mainnet. Nothing here is an offer or a promise of value.";

/**
 * Network-economics notice (owner decision 2026-10-27). Rendered by the doc reader at the top of every page
 * whose frontmatter sets `tokenomics_notice: true`; test/tokenomics-notice.test.ts requires that flag on
 * every page whose prose mentions SALT, rewards, staking, supply, fees, or related terms.
 */
export function TokenomicsNotice() {
  return (
    <aside
      role="note"
      aria-label="Tokenomics status"
      data-tokenomics-notice=""
      className="mb-6 flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-amber)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-amber)_8%,transparent)] px-3 py-2 text-sm"
    >
      <span className="mt-0.5 shrink-0 text-[var(--color-amber)]">
        <Icon name="info" size={15} />
      </span>
      <p className="m-0">
        {TOKENOMICS_NOTICE_TEXT}{" "}
        <Link href={TOKENOMICS_STATUS_SLUG} className="underline">
          Read the tokenomics status
        </Link>
        .
      </p>
    </aside>
  );
}
