import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  Mail,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import type { AdminPermission } from "@/lib/auth/admin-portal-permissions";
import { hasAdminPermission } from "@/lib/auth/admin-portal-permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: AdminPermission;
  isActive: (pathname: string) => boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
  collapsible?: boolean;
};

const normalizePath = (pathname: string) =>
  pathname.replace(/\/+$/, "") || "/";

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: LayoutDashboard,
        permission: "platform.overview",
        isActive: (pathname) => normalizePath(pathname) === "/admin",
      },
      {
        href: "/admin/clients",
        label: "Clients",
        icon: Building2,
        permission: "clients.read",
        isActive: (pathname) => normalizePath(pathname).startsWith("/admin/clients"),
      },
      {
        href: "/admin/billing",
        label: "Pricing & invoices",
        icon: CreditCard,
        permission: "billing.read",
        isActive: (pathname) =>
          pathname.startsWith("/admin/billing") && !pathname.startsWith("/admin/billing/requests"),
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        permission: "users.read",
        isActive: (pathname) => pathname.startsWith("/admin/users"),
      },
      {
        href: "/admin/tickets",
        label: "Support",
        icon: Ticket,
        permission: "tickets.read",
        isActive: (pathname) => pathname.startsWith("/admin/tickets"),
      },
    ],
  },
  {
    label: "More tools",
    collapsible: true,
    items: [
      {
        href: "/admin/billing/requests",
        label: "Upgrade requests",
        icon: TrendingUp,
        permission: "billing.read",
        isActive: (pathname) => pathname.startsWith("/admin/billing/requests"),
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: "analytics.read",
        isActive: (pathname) => pathname.startsWith("/admin/analytics"),
      },
      {
        href: "/admin/upgrade-requests",
        label: "Entitlements",
        icon: ArrowUpRight,
        permission: "entitlements.write",
        isActive: (pathname) => pathname.startsWith("/admin/upgrade-requests"),
      },
      {
        href: "/admin/comms",
        label: "Operational email",
        icon: Mail,
        permission: "comms.send",
        isActive: (pathname) => pathname.startsWith("/admin/comms"),
      },
      {
        href: "/admin/erasure-requests",
        label: "Data erasure queue",
        icon: ShieldOff,
        permission: "privacy.read",
        isActive: (pathname) => pathname.startsWith("/admin/erasure-requests"),
      },
      {
        href: "/admin/assessment-recovery",
        label: "Assessment recovery",
        icon: RotateCcw,
        permission: "recovery.read",
        isActive: (pathname) => pathname.startsWith("/admin/assessment-recovery"),
      },
      {
        href: "/admin/settings",
        label: "Security",
        icon: ShieldCheck,
        permission: "security.manage",
        isActive: (pathname) => pathname.startsWith("/admin/settings"),
      },
      {
        href: "/admin/audit-logs",
        label: "Audit log",
        icon: History,
        permission: "audit.read",
        isActive: (pathname) => pathname.startsWith("/admin/audit-logs"),
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function filterAdminNavGroups(role: unknown): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasAdminPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: AdminPermission; exact?: boolean }> = [
  { prefix: "/admin/users/invite", permission: "admins.manage" },
  { prefix: "/admin/clients/create", permission: "clients.write" },
  { prefix: "/admin/billing/requests", permission: "billing.read" },
  { prefix: "/admin/analytics", permission: "analytics.read" },
  { prefix: "/admin/upgrade-requests", permission: "entitlements.write" },
  { prefix: "/admin/comms", permission: "comms.send" },
  { prefix: "/admin/erasure-requests", permission: "privacy.read" },
  { prefix: "/admin/tickets", permission: "tickets.read" },
  { prefix: "/admin/assessment-recovery", permission: "recovery.read" },
  { prefix: "/admin/settings", permission: "security.manage" },
  { prefix: "/admin/audit-logs", permission: "audit.read" },
  { prefix: "/admin/users", permission: "users.read" },
  { prefix: "/admin/billing", permission: "billing.read" },
  { prefix: "/admin/clients", permission: "clients.read" },
  { prefix: "/admin", permission: "platform.overview", exact: true },
];

export function getAdminRoutePermission(pathname: string): AdminPermission | null {
  const path = normalizePath(pathname);
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.exact) {
      if (path === rule.prefix) return rule.permission;
      continue;
    }
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.permission;
    }
  }
  return null;
}

export function getDefaultAdminRoute(role: unknown): string {
  const groups = filterAdminNavGroups(role);
  return groups[0]?.items[0]?.href ?? "/admin/tickets";
}

export type AdminBreadcrumb = {
  label: string;
  href?: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  clients: "Clients",
  create: "Add client",
  billing: "Pricing & invoices",
  analytics: "Analytics",
  requests: "Upgrade requests",
  "upgrade-requests": "Entitlements",
  users: "Users",
  invite: "Invite admin",
  comms: "Operational email",
  tickets: "Support",
  "erasure-requests": "Data erasure queue",
  "assessment-recovery": "Assessment recovery",
  settings: "Security",
  "audit-logs": "Audit log",
};

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  const path = normalizePath(pathname);
  const segments = path.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return [{ label: "Overview" }];
  }

  const crumbs: AdminBreadcrumb[] = [{ label: "Admin", href: "/admin" }];

  if (path.startsWith("/admin/clients/create")) {
    crumbs.push({ label: "Clients", href: "/admin/clients" });
    crumbs.push({ label: "Add client" });
    return crumbs;
  }

  if (path.startsWith("/admin/users/invite")) {
    crumbs.push({ label: "Users", href: "/admin/users" });
    crumbs.push({ label: "Invite admin" });
    return crumbs;
  }

  if (path.startsWith("/admin/billing/requests")) {
    crumbs.push({ label: "Billing & access", href: "/admin/billing" });
    crumbs.push({ label: "Upgrade requests" });
    return crumbs;
  }

  if (path.startsWith("/admin/analytics")) {
    crumbs.push({ label: "Billing & access", href: "/admin/billing" });
    crumbs.push({ label: "Analytics" });
    return crumbs;
  }

  if (path.match(/^\/admin\/clients\/[^/]+$/)) {
    crumbs.push({ label: "Clients", href: "/admin/clients" });
    crumbs.push({ label: "Client details" });
    return crumbs;
  }

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    const label = SEGMENT_LABELS[segment] ?? segment;
    const isLast = index === segments.length - 1;
    const href = isLast ? undefined : `/admin/${segments.slice(1, index + 1).join("/")}`;
    crumbs.push({ label, href });
  }

  return crumbs;
}

export function getActiveAdminNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.isActive(pathname));
}
