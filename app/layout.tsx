import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

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

export const metadata: Metadata = {
  title: "Citrate Atlas",
  description: "Gated, agentic documentation for the Citrate Network.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
