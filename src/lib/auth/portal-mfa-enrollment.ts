import { resolveAppRole } from "@/lib/auth/role-model";

/**
 * Optional hard gate when REQUIRE_PORTAL_MFA_ENROLLMENT=true.
 * Product default is skippable enrolment plus PortalMfaNudge.
 * Candidates stay out of this hard gate so in-person sessions are not blocked.
 */
export function portalMfaEnrollmentRequired(input: {
  enabled: boolean;
  role: unknown;
  totpEnabled: unknown;
}) {
  if (!input.enabled || input.totpEnabled === true) return false;
  const role = resolveAppRole(input.role);
  return (
    role === "client" ||
    role === "hiring_manager" ||
    (typeof role === "string" && role.startsWith("admin"))
  );
}

export function isPortalMfaEnrollmentPath(pathname: string) {
  return (
    pathname === "/profile" ||
    pathname.startsWith("/api/account/totp/")
  );
}
