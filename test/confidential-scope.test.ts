import { describe, it, expect } from "vitest";
import { authorizeConfidentialRead, CONFIDENTIAL_DOCS } from "@/lib/content/confidential-store";
import { VIEWERS_BY_ID } from "@/prototype/fixtures";

const NOW = Date.now();
const auditor = VIEWERS_BY_ID.auditor.session; // confidential, citrateRole "auditor_tob"
const admin = VIEWERS_BY_ID.admin.session; // confidential, citrateRole "admin"
const funding = CONFIDENTIAL_DOCS["/internal/funding"];
const audit = CONFIDENTIAL_DOCS["/internal/audit"];

describe("confidential per-doc scoping (CIT-DOCS-004)", () => {
  it("denies the funding/data-room to a confidential auditor outside the named-principal set", () => {
    expect(authorizeConfidentialRead(auditor, funding, NOW)).toBe(false);
  });

  it("still lets the auditor read the engagement's audit reports", () => {
    expect(authorizeConfidentialRead(auditor, audit, NOW)).toBe(true);
  });

  it("lets the admin (named principal) read funding", () => {
    expect(authorizeConfidentialRead(admin, funding, NOW)).toBe(true);
  });

  it("funding actually carries a role allowlist (the scoping is present, not cosmetic)", () => {
    expect(funding.allowedRoles).toEqual(["admin", "exec"]);
  });
});
