import { describe, it, expect } from "vitest";
import { recordAccess, setAccessSink } from "@/lib/content/access-log";

const entry = (sub: string) => ({
  sub, docSlug: "/internal/funding", tier: "confidential", orgId: null, disclosureAck: true, at: Date.now(),
});

describe("recordAccess durability contract (DOC-B-010)", () => {
  it("returns false when the sink cannot durably record the read (→ route fails closed)", () => {
    setAccessSink(() => false);
    expect(recordAccess(entry("uuid:auditor"))).toBe(false);
  });

  it("returns false when the sink throws", () => {
    setAccessSink(() => {
      throw new Error("db down");
    });
    expect(recordAccess(entry("uuid:auditor"))).toBe(false);
  });

  it("returns true and records on a healthy sink", () => {
    const seen: string[] = [];
    setAccessSink((e) => {
      seen.push(e.sub);
      return true;
    });
    expect(recordAccess(entry("uuid:admin"))).toBe(true);
    expect(seen).toContain("uuid:admin");
  });
});
