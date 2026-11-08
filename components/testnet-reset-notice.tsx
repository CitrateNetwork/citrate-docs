import Link from "next/link";
import { testnetResetCallout } from "@/lib/testnet-reset";
import { Icon } from "./icons";

/** Callout at the top of developer pages: the r1007 testnet reset (lib/testnet-reset.ts). */
export function TestnetResetNotice() {
  const c = testnetResetCallout(process.env.NEXT_PUBLIC_TESTNET_RESET_DATE);
  return (
    <aside
      aria-label="Testnet reset notice"
      className="mb-5 flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-amber)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-amber)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-fg)]"
    >
      <span className="mt-0.5 shrink-0 text-[var(--color-amber)]" aria-hidden="true">
        <Icon name="clock" size={14} />
      </span>
      <p className="m-0">
        <strong>{c.title}.</strong> {c.body} Reset date: <strong>{c.dateLabel}</strong>.{" "}
        <Link href={c.href} className="font-medium underline underline-offset-2">
          {c.linkLabel}
        </Link>
      </p>
    </aside>
  );
}
