import { describe, expect, it } from "vitest";
import { CONTENT_DOCS } from "../content/_generated/content";

describe("published launch economics", () => {
  it("keeps historical economics URLs as current status notices", () => {
    for (const slug of ["/chain/economics", "/contracts/economics", "/operators/rewards"]) {
      const doc = CONTENT_DOCS[slug];
      expect(doc.tier).toBe("public");
      expect(doc.body).toMatch(/to be determined before launch/i);
      expect(doc.body).toContain("support@citrate.ai");
      expect(doc.body).toContain("More announcements coming soon");
    }
  });
  it("removes old supply and reward schedules from the served corpus", () => {
    const text = Object.values(CONTENT_DOCS).map(d => d.body ?? "").join("\n");
    expect(text).not.toMatch(/one.trillion|1T cap|1,000,000,000,000|2,100,000 blocks|150 SALT per month|32,000 SALT/i);
  });
  it("preserves legal rights in the current notice", () => {
    expect(CONTENT_DOCS["/chain/economics"].body).toContain("does not amend any signed agreement");
  });
});
