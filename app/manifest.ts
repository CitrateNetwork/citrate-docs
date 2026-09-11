import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Citrate Almanac",
    short_name: "Almanac",
    description: "Gated, agentic documentation for the Citrate Network.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0f0b",
    theme_color: "#0d0f0b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
