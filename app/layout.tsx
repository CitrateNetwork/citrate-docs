import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CookieConsent } from "@/components/cookie-consent";

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

const SITE_URL = "https://citrate-atlas.vercel.app";
const DESCRIPTION =
  "Citrate Atlas is the gated, agentic documentation for the Citrate Network: every surface in the federation, the chain, contracts, RPC, SDKs, CLIs, and apps, mapped, searchable, and live.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Citrate Atlas",
    template: "%s · Citrate Atlas",
  },
  description: DESCRIPTION,
  applicationName: "Citrate Atlas",
  authors: [{ name: "Citrate Network", url: "https://citrate.ai" }],
  creator: "Citrate Network",
  publisher: "Citrate Network",
  keywords: [
    "Citrate", "Citrate Network", "Citrate Atlas", "documentation", "BlockDAG", "GhostDAG",
    "AI compute", "substrate", "federated learning", "smart contracts", "SDK", "RPC", "SALT",
  ],
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Citrate Atlas",
    title: "Citrate Atlas",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Citrate Atlas",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
