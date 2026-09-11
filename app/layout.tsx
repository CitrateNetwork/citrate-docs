import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CookieConsent } from "@/components/cookie-consent";
import { LanguageBoot } from "@/components/language-boot";

// Space Grotesk, the brand display font, is packaged WITH the app (next/font/local reads the bundled
// woff2) so every title and header loads reliably with no runtime CDN dependency. Variable weight
// 300..700, exposed as the --font-space-grotesk CSS variable that --font-display consumes in globals.css.
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-space-grotesk",
  fallback: ["Geist", "system-ui", "sans-serif"],
  preload: true,
});

const SITE_URL = "https://docs.citrate.ai";
const DESCRIPTION =
  "Citrate Almanac is the gated, agentic documentation for the Citrate Network: every surface in the federation, the chain, contracts, RPC, SDKs, CLIs, and apps, mapped, searchable, and live.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Citrate Almanac",
    template: "%s · Citrate Almanac",
  },
  description: DESCRIPTION,
  applicationName: "Citrate Almanac",
  authors: [{ name: "Citrate Network", url: "https://citrate.ai" }],
  creator: "Citrate Network",
  publisher: "Citrate Network",
  keywords: [
    "Citrate", "Citrate Network", "Citrate Almanac", "documentation", "BlockDAG", "GhostDAG",
    "AI compute", "substrate", "federated learning", "smart contracts", "SDK", "RPC", "SALT",
  ],
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Citrate Almanac",
    title: "Citrate Almanac",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Citrate Almanac",
    description: DESCRIPTION,
    site: "@citratenetwork",
    creator: "@citratenetwork",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0b" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
  ],
  colorScheme: "dark light",
};

// Structured data (SEO/AEO): identify the publisher and the docs site so answer
// engines and search can attribute Citrate Almanac to the Citrate Network.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Citrate Network",
      url: "https://citrate.ai",
      sameAs: ["https://docs.citrate.ai", "https://explorer.citrate.ai"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      name: "Citrate Almanac",
      description:
        "Documentation for the Citrate Network: chain, contracts, SDKs, identity, the Citrate Core desktop app, and running a node.",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Providers>{children}</Providers>
        <LanguageBoot />
        <CookieConsent />
      </body>
    </html>
  );
}
