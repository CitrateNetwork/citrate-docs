import { defineConfig } from "vitest/config";
import path from "node:path";

// Test harness for the Tier-1 access-control chokepoint (HYG-MOCK-B-015: the repo shipped with
// zero tests). `@/…` mirrors the tsconfig path alias; `server-only` is stubbed to a no-op so the
// server-only lib modules (memory/corpus/access-log) can be unit-tested under Node.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
