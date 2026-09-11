import type { Metadata } from "next";
import Link from "next/link";
import { CitrateMark } from "@/components/icons";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Cookies policy",
  description: "How Citrate Almanac uses cookies, the essential cookies it sets, and how to manage your consent.",
  alternates: { canonical: "/cookies" },
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display mt-10 mb-3 text-xl font-semibold">{children}</h2>;
}

export default function CookiesPolicy() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center border-b bg-[var(--color-canvas)] px-4">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold">
          <CitrateMark size={18} color="var(--accent-text)" /> Citrate Almanac
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="eyebrow mb-2">Legal</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Cookies policy</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Last updated 17 June 2026.</p>

        <p className="mt-6 text-[var(--color-fg)]">
          This policy explains how Citrate Almanac, the documentation site for the Citrate Network, uses cookies
          and similar storage, and how you control them. We keep this short and honest: the site runs on a
          small number of essential cookies, and we ask for consent before anything beyond that.
        </p>

        <H>What cookies are</H>
        <p className="text-[var(--color-muted)]">
          A cookie is a small file a site stores in your browser. Some are strictly necessary for the site to
          work, others are optional. Browser local storage works the same way and is covered by this policy.
        </p>

        <H>Essential cookies we set</H>
        <p className="text-[var(--color-muted)]">
          These are always on, because the site cannot function without them. They carry no advertising and
          are not shared.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-[var(--color-muted)]">
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Retention</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-fg)]">
              <tr className="border-b">
                <td className="py-2 pr-4 align-top"><code>citrate_session</code></td>
                <td className="py-2 pr-4 align-top">Keeps you signed in after authentication so the site can show the content your access allows.</td>
                <td className="py-2 align-top">Session / short-lived</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 align-top"><code>citrate-atlas-consent</code></td>
                <td className="py-2 pr-4 align-top">Remembers your cookie choice so we do not ask again.</td>
                <td className="py-2 align-top">12 months</td>
              </tr>
            </tbody>
          </table>
        </div>

        <H>Optional cookies</H>
        <p className="text-[var(--color-muted)]">
          We do not load any non-essential or third-party tracking cookies unless you choose “Accept all”. If
          we add usage analytics in the future, they will run only with that consent, and never before it.
        </p>

        <H>Your choices</H>
        <p className="text-[var(--color-muted)]">
          On your first visit a banner lets you accept all cookies or keep only the essential ones. You can
          change your mind at any time by clearing this site’s cookies and local storage in your browser
          settings, which brings the banner back on your next visit. You can also block cookies entirely in
          your browser, though the sign-in features will then not work.
        </p>

        <H>Contact</H>
        <p className="text-[var(--color-muted)]">
          Questions about this policy can go to the Citrate Network team at{" "}
          <a href="https://citrate.ai" target="_blank" rel="noopener noreferrer" className="text-[var(--color-fg)] underline underline-offset-2">citrate.ai</a>.
        </p>

        <div className="mt-10">
          <Link href="/" className="text-sm text-[var(--color-citrate)] hover:underline">← Back to Citrate Almanac</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
