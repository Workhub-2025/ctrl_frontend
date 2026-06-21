/**
 * Scoped admin portal roles and permission matrix.
 * Keep in sync with BackEnd/ctrl_backend/src/lib/admin-portal-permissions.ts
 */

export const ADMIN_ASSIGNABLE_GROUPS = [
  "admin_support",
  "admin_ops",
  "admin_billing",
] as const;

export type AdminAssignableGroup = (typeof ADMIN_ASSIGNABLE_GROUPS)[number];

export const COMPOSITE_ADMIN_ROLE_TYPES = [
  "admin_support_ops",
  "admin_support_billing",
  "admin_ops_billing",
  "admin_support_ops_billing",
] as const;

export type CompositeAdminRoleType = (typeof COMPOSITE_ADMIN_ROLE_TYPES)[number];

export const ADMIN_PORTAL_ROLE_TYPES = [
  "admin",
  "admin_support",
  "admin_ops",
  "admin_billing",
  ...COMPOSITE_ADMIN_ROLE_TYPES,
] as const;

export type AdminPortalRoleType = (typeof ADMIN_PORTAL_ROLE_TYPES)[number];

export const ADMIN_PERMISSIONS = [
  "platform.overview",
  "clients.read",
  "clients.write",
  "billing.read",
  "billing.write",
  "entitlements.write",
  "analytics.read",
  "users.read",
  "users.write",
  "comms.send",
  "tickets.read",
  "tickets.write",
  "tickets.escalate",
  "recovery.read",
  "recovery.write",
  "audit.read",
  "security.manage",
  "admins.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const BASE_GROUP_PERMISSIONS: Record<AdminAssignableGroup, readonly AdminPermission[]> = {
  admin_support: [
    "platform.overview",
    "tickets.read",
    "tickets.write",
    "tickets.escalate",
    "users.read",
  ],
  admin_ops: [
    "platform.overview",
    "clients.read",
    "clients.write",
    "users.read",
    "tickets.read",
    "tickets.write",
    "recovery.read",
    "recovery.write",
  ],
  admin_billing: [
    "platform.overview",
    "billing.read",
    "billing.write",
    "entitlements.write",
    "analytics.read",
    "clients.read",
  ],
};

export const ADMIN_ASSIGNABLE_GROUP_LABELS: Record<AdminAssignableGroup, string> = {
  admin_support: "Support",
  admin_ops: "Operations",
  admin_billing: "Billing",
};

export const ADMIN_ROLE_LABELS: Record<AdminPortalRoleType, string> = {
  admin: "Super admin",
  admin_support: "Support",
  admin_ops: "Operations",
  admin_billing: "Billing",
  admin_support_ops: "Support + Operations",
  admin_support_billing: "Support + Billing",
  admin_ops_billing: "Operations + Billing",
  admin_support_ops_billing: "Support + Operations + Billing",
};

function mergePermissions(
  groups: readonly AdminAssignableGroup[],
): AdminPermission[] {
  const merged = new Set<AdminPermission>();
  for (const group of groups) {
    for (const permission of BASE_GROUP_PERMISSIONS[group]) {
      merged.add(permission);
    }
  }
  return [...merged];
}

function buildCompositePermissions(): Record<CompositeAdminRoleType, readonly AdminPermission[]> {
  return {
    admin_support_ops: mergePermissions(["admin_support", "admin_ops"]),
    admin_support_billing: mergePermissions(["admin_support", "admin_billing"]),
    admin_ops_billing: mergePermissions(["admin_ops", "admin_billing"]),
    admin_support_ops_billing: mergePermissions(["admin_support", "admin_ops", "admin_billing"]),
  };
}

const COMPOSITE_PERMISSIONS = buildCompositePermissions();

export const ADMIN_ROLE_PERMISSIONS: Record<AdminPortalRoleType, readonly AdminPermission[]> = {
  admin: ADMIN_PERMISSIONS,
  admin_support: BASE_GROUP_PERMISSIONS.admin_support,
  admin_ops: BASE_GROUP_PERMISSIONS.admin_ops,
  admin_billing: BASE_GROUP_PERMISSIONS.admin_billing,
  ...COMPOSITE_PERMISSIONS,
};

const OPS_ESCALATION_ROLES: AdminPortalRoleType[] = [
  "admin",
  "admin_ops",
  "admin_support_ops",
  "admin_ops_billing",
  "admin_support_ops_billing",
];

const BILLING_ESCALATION_ROLES: AdminPortalRoleType[] = [
  "admin",
  "admin_billing",
  "admin_support_billing",
  "admin_ops_billing",
  "admin_support_ops_billing",
];

export const ESCALATION_TARGET_ROLES: Record<"ops" | "billing", AdminPortalRoleType[]> = {
  ops: OPS_ESCALATION_ROLES,
  billing: BILLING_ESCALATION_ROLES,
};

/** Admin roles that receive new-ticket notifications when no inbox env is set. */
export const SUPPORT_TRIAGE_ROLE_TYPES: AdminPortalRoleType[] = [
  "admin",
  "admin_support",
  "admin_support_ops",
  "admin_support_billing",
  "admin_support_ops_billing",
];

export function normalizeAdminAssignableGroup(value: unknown): AdminAssignableGroup | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (ADMIN_ASSIGNABLE_GROUPS as readonly string[]).includes(normalized)
    ? (normalized as AdminAssignableGroup)
    : null;
}

export function normalizeAdminAssignableGroups(value: unknown): AdminAssignableGroup[] {
  if (!Array.isArray(value)) return [];
  const groups = new Set<AdminAssignableGroup>();
  for (const item of value) {
    const normalized = normalizeAdminAssignableGroup(item);
    if (normalized) groups.add(normalized);
  }
  return ADMIN_ASSIGNABLE_GROUPS.filter((group) => groups.has(group));
}

export function resolveCompositeAdminRole(
  groups: readonly AdminAssignableGroup[],
): AdminPortalRoleType | null {
  if (groups.length === 0) return null;
  if (groups.length === 1) return groups[0];
  const ordered = ADMIN_ASSIGNABLE_GROUPS.filter((group) => groups.includes(group));
  const compositeKey = ordered.join("_");
  return (ADMIN_PORTAL_ROLE_TYPES as readonly string[]).includes(compositeKey)
    ? (compositeKey as AdminPortalRoleType)
    : null;
}

export function formatAdminRoleLabels(roleType: AdminPortalRoleType): string {
  return ADMIN_ROLE_LABELS[roleType] ?? roleType;
}

export function normalizeAdminPortalRoleType(value: unknown): AdminPortalRoleType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "administrator" || normalized === "ctrl_admin" || normalized === "super_admin") {
    return "admin";
  }
  return (ADMIN_PORTAL_ROLE_TYPES as readonly string[]).includes(normalized)
    ? (normalized as AdminPortalRoleType)
    : null;
}

export function isAdminPortalRoleType(value: unknown): boolean {
  return normalizeAdminPortalRoleType(value) !== null;
}

export function hasAdminPermission(
  role: unknown,
  permission: AdminPermission,
): boolean {
  const roleType = normalizeAdminPortalRoleType(
    typeof role === "object" && role !== null && "type" in role
      ? (role as { type?: unknown }).type
      : role,
  );
  if (!roleType) return false;
  return ADMIN_ROLE_PERMISSIONS[roleType].includes(permission);
}

export function isSuperAdminRoleType(value: unknown): boolean {
  return normalizeAdminPortalRoleType(value) === "admin";
}
