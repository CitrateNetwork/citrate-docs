import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

it("scans paths containing spaces and permits only the status wording", () => {
  const root = mkdtempSync(join(tmpdir(), "citrate lint spaces "));
  try {
    mkdirSync(join(root, "scripts")); mkdirSync(join(root, "content"));
    const script = join(root, "scripts/content-lint.mjs");
    copyFileSync(resolve("scripts/content-lint.mjs"), script);
    const run = () => spawnSync(process.execPath, [script, "--strict"], { encoding: "utf8" });
    writeFileSync(join(root, "content/status.md"), "Launch tokenomics: TBD before launch.");
    expect(run().status).toBe(0);
    writeFileSync(join(root, "content/status.md"), "Revolutionary tokenomics.");
    const failed = run(); expect(failed.status).toBe(1);
    expect(failed.stdout).toContain("scanned 1 source files");
    rmSync(join(root, "content/status.md"));
    expect(run().status).not.toBe(0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
