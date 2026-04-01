export const APP_ROLES = [
  "candidate",
  "recruiter",
  "client",
  "admin",
  "super_admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_ALIASES: Record<string, AppRole> = {
  candidate: "candidate",
  candidates: "candidate",
  recruiter: "recruiter",
  recruiting: "recruiter",
  client: "client",
  customer: "client",
  buyer: "client",
  admin: "admin",
  administrator: "admin",
  super_admin: "super_admin",
  superadmin: "super_admin",
  "super-admin": "super_admin",
};

const normalizeRoleLabel = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

export const normalizeRole = (role: unknown): AppRole => {
  if (typeof role === "string" && role.trim().length > 0) {
    const normalized = normalizeRoleLabel(role);
    return ROLE_ALIASES[normalized] ?? "candidate";
  }

  if (
    role &&
    typeof role === "object" &&
    "name" in role &&
    typeof (role as { name?: unknown }).name === "string"
  ) {
    return normalizeRole((role as { name: string }).name);
  }

  return "candidate";
};

export const isAdminRole = (role: unknown) => {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "super_admin";
};

export const routeForRole = (role: unknown): string => {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "admin":
    case "super_admin":
      return "/admin";
    case "recruiter":
      return "/recruiter-dashboard";
    case "client":
      return "/dashboard";
    case "candidate":
    default:
      return "/dashboard";
  }
};

