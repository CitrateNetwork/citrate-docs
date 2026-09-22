import { describe, it, expect } from "vitest";
import { authorizeConfidentialRead, CONFIDENTIAL_DOCS } from "@/lib/content/confidential-store";
import { VIEWERS_BY_ID } from "@/prototype/fixtures";

const NOW = Date.now();
const auditor = VIEWERS_BY_ID.auditor.session; // confidential, citrateRole "auditor_tob"
const admin = VIEWERS_BY_ID.admin.session; // confidential, citrateRole "admin"
const funding = CONFIDENTIAL_DOCS["/internal/funding"];
const audit = CONFIDENTIAL_DOCS["/internal/audit"];

// CIT-DOCS-004 per-doc RBAC lives in the PRIVATE deployment overlay: this OSS repo ships
// CONFIDENTIAL_DOCS = {} and a deny-all `authorizeConfidentialRead` stub (fail-closed), so the
// real allow/deny behavior can only be exercised where the overlay populates the store. Skip
// here when the store is empty (public build); these run in the private overlay's CI.
const overlayPresent = Object.keys(CONFIDENTIAL_DOCS).length > 0;

describe.skipIf(!overlayPresent)("confidential per-doc scoping (CIT-DOCS-004)", () => {
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
