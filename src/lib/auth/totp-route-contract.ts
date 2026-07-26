export function accountTotpUpstreamPath(
  path: string,
  isAdmin: boolean,
): string {
  if (!path.startsWith("/auth/totp/")) {
    throw new Error("Account TOTP path is outside the shared contract");
  }
  return isAdmin
    ? path.replace("/auth/totp/", "/auth/admin/totp/")
    : path;
}
