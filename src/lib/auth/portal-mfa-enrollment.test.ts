import { describe, expect, it } from "vitest";
import {
  isPortalMfaEnrollmentPath,
  portalMfaEnrollmentRequired,
} from "./portal-mfa-enrollment";

describe("portal MFA enrolment gate", () => {
  it("gates unenrolled client and hiring-manager accounts only when enabled", () => {
    expect(portalMfaEnrollmentRequired({ enabled: true, role: "client", totpEnabled: false })).toBe(true);
    expect(portalMfaEnrollmentRequired({ enabled: true, role: "hiring_manager", totpEnabled: undefined })).toBe(true);
    expect(portalMfaEnrollmentRequired({ enabled: false, role: "client", totpEnabled: false })).toBe(false);
  });

  it("does not gate candidates, administrators, or enrolled staff", () => {
    expect(portalMfaEnrollmentRequired({ enabled: true, role: "candidate", totpEnabled: false })).toBe(false);
    expect(portalMfaEnrollmentRequired({ enabled: true, role: "admin", totpEnabled: false })).toBe(false);
    expect(portalMfaEnrollmentRequired({ enabled: true, role: "client", totpEnabled: true })).toBe(false);
  });

  it("keeps only the working enrolment surface available", () => {
    expect(isPortalMfaEnrollmentPath("/profile")).toBe(true);
    expect(isPortalMfaEnrollmentPath("/api/account/totp/complete-setup")).toBe(true);
    expect(isPortalMfaEnrollmentPath("/api/user/profile")).toBe(false);
    expect(isPortalMfaEnrollmentPath("/client-dashboard")).toBe(false);
    expect(isPortalMfaEnrollmentPath("/api/client/overview")).toBe(false);
  });
});
