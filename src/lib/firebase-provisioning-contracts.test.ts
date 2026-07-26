import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseDisplayName,
  parseInvitationEmail,
  parseInvitationLinkType,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";

describe("Firebase provisioning contracts", () => {
  it("normalizes bounded display names and invitation tokens", () => {
    expect(parseDisplayName("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(parseDisplayName("A")).toBeNull();
    expect(parseInvitationToken("x".repeat(32))).toBe("x".repeat(32));
    expect(parseInvitationToken("short")).toBeNull();
  });

  it("strictly classifies invitation links and normalizes their email", () => {
    expect(parseInvitationLinkType(null)).toBe("organization");
    expect(parseInvitationLinkType("organization")).toBe("organization");
    expect(parseInvitationLinkType("candidate")).toBe("candidate");
    expect(parseInvitationLinkType("admin")).toBeNull();
    expect(parseInvitationEmail("  Candidate@Example.TEST ")).toBe(
      "candidate@example.test",
    );
    expect(parseInvitationEmail("not-an-email")).toBeNull();
    expect(parseInvitationEmail(`${"a".repeat(250)}@example.test`)).toBeNull();
  });

  it("ships both destinations used by pre-provisioning redirects", () => {
    const bootstrap = readFileSync(
      join(process.cwd(), "src/app/auth/bootstrap/page.tsx"),
      "utf8",
    );
    const bootstrapDialog = readFileSync(
      join(process.cwd(), "src/components/auth/admin-first-login-security-dialog.tsx"),
      "utf8",
    );
    const invitation = readFileSync(
      join(process.cwd(), "src/app/auth/accept-invitation/page.tsx"),
      "utf8",
    );
    expect(bootstrap).toContain("AdminFirstLoginSecurityDialog");
    expect(bootstrap).toContain("/api/bootstrap/status");
    expect(bootstrapDialog).toContain("/api/bootstrap/administrator");
    expect(invitation).toContain("/api/onboarding/firebase-account");
    expect(invitation).toContain("/api/onboarding/candidate-account");
    expect(invitation).toContain("loginWithFirebase");
    expect(invitation).toContain("/api/invitations/accept");
    expect(invitation).toContain("/api/assignments/invitations/accept");
    expect(invitation).toContain('invitationType === "candidate"');
    expect(invitation).toContain("readOnly={Boolean(linkedEmail)}");
    expect(invitation).toContain('role="alert"');
    expect(invitation).toContain("requiresExistingSignIn");
    expect(invitation).toContain('mode === "existing"');
    expect(invitation).toContain("/api/auth/session");
  });
});
