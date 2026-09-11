import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// On-brand social/link card (1200x630): warm near-black, Citrate green, the C-mark, Space Grotesk.
// Used for og:image and (absent a twitter-image) twitter:image. Generated at build, served statically.
export const runtime = "nodejs";
export const alt = "Citrate Almanac, gated, agentic documentation for the Citrate Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK_PATHS = [
  "M40.05,65c2.21-.14,4.02-.63,5.3-1.1-1.94-2.21-3.88-4.41-5.82-6.62l-4.27,7.4c1.23.24,2.87.43,4.79.31Z",
  "M41.7,73.61c4.34-.04,7.98-.72,10.68-1.44-2.03-2.28-4.06-4.56-6.1-6.84-1.4.54-3.41,1.14-5.88,1.35-2.41.2-4.45-.04-5.9-.32l-3.47,6.01c2.71.66,6.35,1.28,10.68,1.24Z",
  "M53.37,74.02c-2.94.76-6.87,1.48-11.53,1.53-4.65.05-8.58-.59-11.53-1.28-.86,1.5-1.73,2.99-2.59,4.49-1.03,1.78.26,4.01,2.32,4.01h30.93c-2.53-2.92-5.06-5.83-7.59-8.75Z",
  "M62.58,47.91c.69-.85,1.4-1.69,2.13-2.51,1.49-1.69,3.08-3.3,4.81-4.74.92-.76,1.98-1.39,3.04-1.95.16-.08.32-.16.48-.25l-8.79-15.22c-1.03-1.78-3.6-1.78-4.63,0l-8.62,14.93c3.86,3.25,7.72,6.49,11.57,9.74Z",
  "M75.24,58.35c.44-.33.9-.66,1.37-.96,1.4-.89,2.8-1.77,4.27-2.56.5-.27,1.01-.53,1.52-.78l-8-13.85c-.86.42-1.69.9-2.48,1.43-.94.63-1.78,1.4-2.6,2.17-1.62,1.53-3.09,3.2-4.51,4.91-.17.2-.33.41-.5.61,3.64,3.01,7.29,6.02,10.93,9.03Z",
  "M79.77,57.69c-1.14.7-2.12,1.42-2.94,2.1,6.07,5.26,12.14,10.51,18.21,15.77l-11.43-19.8c-1.14.46-2.45,1.09-3.84,1.93Z",
  "M75.19,61.37s-.01.01-.02.01c-2.22,1.74-3.69,3.28-4.22,3.82-1.88,1.93-2.99,3.07-4.71,4.26-2.4,1.66-4.66,2.49-6.6,3.21-1.3.48-2.41.82-3.23,1.04,2.62,3.04,5.25,6.07,7.87,9.11h29.33c1.77,0,2.96-1.64,2.61-3.23-7.01-6.07-14.02-12.15-21.03-18.22Z",
  "M55.03,71.84c.12-.03.3-.07.51-.12,1.32-.33,3.76-.93,5.99-1.92,2.95-1.31,5-3.05,5.84-3.82,1.21-1.1,1.45-1.58,3.58-3.65,1.16-1.12,2.15-2,2.82-2.59-3.57-2.95-7.14-5.89-10.71-8.84-2.36,2.93-4.65,5.92-7.3,8.61-2.08,2.1-4.39,3.99-7.03,5.26l6.29,7.07Z",
  "M47.12,63.06c3.38-1.53,6.18-4.17,8.64-6.92,1.95-2.18,3.73-4.49,5.56-6.76-3.81-3.2-7.61-6.4-11.42-9.6l-9.21,15.96c2.14,2.44,4.29,4.88,6.43,7.32Z",
];

export default async function Image() {
  const sg700 = readFileSync(join(process.cwd(), "app/_og/SpaceGrotesk-700.ttf"));
  const sg500 = readFileSync(join(process.cwd(), "app/_og/SpaceGrotesk-500.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: "#0d0f0b", color: "#f4f5f0",
          padding: "76px 84px", fontFamily: "Space Grotesk",
          backgroundImage: "radial-gradient(#1c2418 1.2px, transparent 1.2px)",
          backgroundSize: "34px 34px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="84" height="84" viewBox="21.69 16.46 79.88 71.36">
            <g fill="#8ecc09" stroke="#8ecc09" strokeWidth="0.75">
              {MARK_PATHS.map((d, i) => <path key={i} d={d} />)}
            </g>
          </svg>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, letterSpacing: 6, color: "#8ecc09", textTransform: "uppercase" }}>
            Citrate Network
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 130, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
            Citrate Almanac
          </div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 500, color: "#a8b0a0", marginTop: 28, maxWidth: 900, lineHeight: 1.35 }}>
            A handbook you can run. Every surface in the federation, mapped, searchable, and live.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 500, color: "#a8b0a0" }}>
          <div style={{ display: "flex", width: 12, height: 12, borderRadius: 12, background: "#8ecc09" }} />
          <div style={{ display: "flex" }}>docs.citrate.ai</div>
          <div style={{ display: "flex", color: "#3a4234" }}>·</div>
          <div style={{ display: "flex" }}>Documentation</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: sg700, weight: 700, style: "normal" },
        { name: "Space Grotesk", data: sg500, weight: 500, style: "normal" },
      ],
    }
  );
}
