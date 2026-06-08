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
};

const normalizeRoleLabel = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const DEV_SEEDED_ROLE_BY_EMAIL: Record<string, AppRole> = {
  "candidate.demo@ctrl.local": "candidate",
  "recruiter.demo@ctrl.local": "hiring_manager",
  "client.demo@ctrl.local": "client",
  "admin.demo@ctrl.local": "admin",
};

export const normalizeRole = (role: unknown): AppRole => {
  if (typeof role === "string" && role.trim().length > 0) {
    const normalized = normalizeRoleLabel(role);
    return ROLE_ALIASES[normalized] ?? "candidate";
  }

  if (
    role &&
    typeof role === "object" &&
    "type" in role &&
    typeof (role as { type?: unknown }).type === "string"
  ) {
    return normalizeRole((role as { type: string }).type);
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
  return normalized === "admin";
};

export const inferDevSeededRole = (email?: string | null): AppRole | null => {
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
