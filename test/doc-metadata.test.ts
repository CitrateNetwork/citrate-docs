import { describe, it, expect } from "vitest";
import { docDescription } from "@/lib/seo/doc-metadata";

const SECRET_BODY =
  "This is the machine-checked half of how Citrate establishes that its protocol is correct: a body of TLA+ specifications proving the safety property under adversarial scheduling.";

describe("docDescription (DOC-B-008)", () => {
  it("never derives a gated doc's description from its body", () => {
    // Even if a body were (re)embedded for a gated tier, the metadata must not leak its prose.
    const d = docDescription({ tier: "academic", body: SECRET_BODY });
    expect(d).not.toContain("machine-checked");
    expect(d).not.toContain("TLA+ specifications");
    // No 40+ char run of the body may appear in the description.
    expect(SECRET_BODY.length).toBeGreaterThan(40);
    for (let i = 0; i + 40 <= SECRET_BODY.length; i += 20) {
      expect(d).not.toContain(SECRET_BODY.slice(i, i + 40));
    }
  });

  it("uses an authored summary for gated docs when present", () => {
    const d = docDescription({ tier: "commercial", body: SECRET_BODY, summary: "Paid SDK reference." });
    expect(d).toBe("Paid SDK reference.");
  });

  it("still derives public descriptions from the body", () => {
    const d = docDescription({ tier: "public", body: SECRET_BODY });
    expect(d).toContain("machine-checked");
  });
});
