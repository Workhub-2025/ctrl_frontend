import {
  hasAdminPermission,
  isAdminPortalRoleType,
  isSuperAdminRoleType,
  normalizeAdminPortalRoleType,
  type AdminPermission,
  type AdminPortalRoleType,
} from "@/lib/auth/admin-portal-permissions";

export const APP_ROLES = [
  "candidate",
  "hiring_manager",
  "client",
  "admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_ALIASES: Record<string, AppRole | AdminPortalRoleType> = {
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
  admin_ops: "admin_ops",
  admin_billing: "admin_billing",
  admin_support: "admin_support",
  admin_support_ops: "admin_support_ops",
  admin_support_billing: "admin_support_billing",
  admin_ops_billing: "admin_ops_billing",
  admin_support_ops_billing: "admin_support_ops_billing",
};

export const normalizeRoleLabel = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

function roleFromString(value: string): AppRole | AdminPortalRoleType | null {
  const normalized = normalizeRoleLabel(value);
  return ROLE_ALIASES[normalized] ?? null;
}

/** Returns null when the role cannot be mapped to a known portal role. */
export const resolveAppRole = (role: unknown): AppRole | AdminPortalRoleType | null => {
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

export const normalizeRole = (role: unknown): AppRole | AdminPortalRoleType => {
  return resolveAppRole(role) ?? "candidate";
};

/** Session/login role — preserves scoped admin types. */
export const resolveSessionRole = (role: unknown): string => {
  const portalAdmin = normalizeAdminPortalRoleType(role);
  if (portalAdmin) return portalAdmin;
  return normalizeRole(role);
};

export const isAdminPortalRole = (role: unknown) => {
  return isAdminPortalRoleType(role);
};

export const isAdminRole = (role: unknown) => {
  return isAdminPortalRole(role);
};

export const isSuperAdminRole = (role: unknown) => {
  return isSuperAdminRoleType(role);
};

export const hasAdminPortalPermission = (
  role: unknown,
  permission: AdminPermission,
) => hasAdminPermission(role, permission);

const DEV_SEEDED_ROLE_BY_EMAIL: Record<string, AppRole | AdminPortalRoleType> = {
  "candidate.demo@ctrl.local": "candidate",
  "recruiter.demo@ctrl.local": "hiring_manager",
  "client.demo@ctrl.local": "client",
  "admin.demo@ctrl.local": "admin",
};

export const inferDevSeededRole = (email?: string | null): AppRole | AdminPortalRoleType | null => {
  if (process.env.NODE_ENV === "production") return null;
  if (!email) return null;
  return DEV_SEEDED_ROLE_BY_EMAIL[email.trim().toLowerCase()] ?? null;
};

export const routeForRole = (role: unknown): string => {
  if (isAdminPortalRole(role)) {
    return "/admin";
  }

  const normalized = normalizeRole(role);

  switch (normalized) {
    case "hiring_manager":
      return "/hiring-manager-dashboard";
    case "client":
      return "/client-dashboard";
    case "candidate":
    default:
      return "/candidate-dashboard/";
  }
};

export { type AdminPermission, type AdminPortalRoleType };
