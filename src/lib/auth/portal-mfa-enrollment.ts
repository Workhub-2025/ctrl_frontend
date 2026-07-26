import { resolveAppRole } from "@/lib/auth/role-model";

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
