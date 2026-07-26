const ALLOWED_PREFIXES = [
  "support-tickets",
  "candidate-sessions",
  "users-permissions",
];
const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export function isAllowedProxyPath(pathSegments: string[]) {
  if (
    pathSegments.length === 0 ||
    pathSegments.some((segment) => !SAFE_PATH_SEGMENT.test(segment))
  ) {
    return false;
  }

  const normalized = pathSegments.join("/");
  return ALLOWED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
