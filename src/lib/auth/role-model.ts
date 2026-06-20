export const APP_ROLES = [
  "candidate",
  "hiring_manager",
  "client",
  "admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_ALIASES: Record<string, AppRole> = {
  candidate: "candidate",
  candidates: "candidate",
  recruiter: "hiring_manager",
  recruiting: "hiring_manager",
  hiring_manager: "hiring_manager",
  "hiring-manager": "hiring_manager",
  hiringmanager: "hiring_manager",
  client: "client",
  customer: "client",
  buyer: "client",
  admin: "admin",
  administrator: "admin",
  ctrl_admin: "admin",
  super_admin: "admin",
};

export const normalizeRoleLabel = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

function roleFromString(value: string): AppRole | null {
  const normalized = normalizeRoleLabel(value);
  return ROLE_ALIASES[normalized] ?? null;
}

/** Returns null when the role cannot be mapped to a known portal role. */
export const resolveAppRole = (role: unknown): AppRole | null => {
  if (typeof role === "string" && role.trim().length > 0) {
    return roleFromString(role);
  }

  if (
    role &&
    typeof role === "object" &&
    "type" in role &&
    typeof (role as { type?: unknown }).type === "string"
  ) {
    return resolveAppRole((role as { type: string }).type);
  }

  if (
    role &&
    typeof role === "object" &&
    "name" in role &&
    typeof (role as { name?: unknown }).name === "string"
  ) {
    return resolveAppRole((role as { name: string }).name);
  }

  return null;
};

export const normalizeRole = (role: unknown): AppRole => {
  return resolveAppRole(role) ?? "candidate";
};

export const isAdminRole = (role: unknown) => {
  const normalized = normalizeRole(role);
  return normalized === "admin";
};

const DEV_SEEDED_ROLE_BY_EMAIL: Record<string, AppRole> = {
  "candidate.demo@ctrl.local": "candidate",
  "recruiter.demo@ctrl.local": "hiring_manager",
  "client.demo@ctrl.local": "client",
  "admin.demo@ctrl.local": "admin",
};

export const inferDevSeededRole = (email?: string | null): AppRole | null => {
  // Demo email → role mapping is a local dev convenience only. In production we
  // must trust the role Strapi returns, never a hardcoded email, to prevent
  // privilege escalation if a demo account ever exists in a prod database.
  if (process.env.NODE_ENV === "production") return null;
  if (!email) return null;
  return DEV_SEEDED_ROLE_BY_EMAIL[email.trim().toLowerCase()] ?? null;
};

export const routeForRole = (role: unknown): string => {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "admin":
      return "/admin";
    case "hiring_manager":
      return "/hiring-manager-dashboard";
    case "client":
      return "/client-dashboard";
    case "candidate":
    default:
      return "/candidate-dashboard/";
  }
};
