import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  Mail,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  /** Short helper shown under the label in the sidebar */
  hint?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

const normalizePath = (pathname: string) =>
  pathname.replace(/\/+$/, "") || "/";

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/admin",
        label: "Overview",
        hint: "Metrics and alerts",
        icon: LayoutDashboard,
        isActive: (pathname) => normalizePath(pathname) === "/admin",
      },
    ],
  },
  {
    label: "Clients",
    items: [
      {
        href: "/admin/clients",
        label: "All clients",
        hint: "Contracts and invites",
        icon: Building2,
        isActive: (pathname) => {
          const path = normalizePath(pathname);
          return (
            path === "/admin/clients" ||
            (path.startsWith("/admin/clients/") && path !== "/admin/clients/create")
          );
        },
      },
      {
        href: "/admin/clients/create",
        label: "Add client",
        hint: "New organisation setup",
        icon: PlusCircle,
        isActive: (pathname) => normalizePath(pathname) === "/admin/clients/create",
      },
    ],
  },
  {
    label: "Billing & access",
    items: [
      {
        href: "/admin/billing",
        label: "Pricing & invoices",
        hint: "Stripe pricing and renewals",
        icon: CreditCard,
        isActive: (pathname) =>
          pathname.startsWith("/admin/billing") && !pathname.startsWith("/admin/billing/requests"),
      },
      {
        href: "/admin/billing/requests",
        label: "Upgrade requests",
        hint: "Requested · invoiced · paid",
        icon: TrendingUp,
        isActive: (pathname) => pathname.startsWith("/admin/billing/requests"),
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        hint: "Revenue and pipeline",
        icon: BarChart3,
        isActive: (pathname) => pathname.startsWith("/admin/analytics"),
      },
      {
        href: "/admin/upgrade-requests",
        label: "Entitlements",
        hint: "Manual seats and features",
        icon: ArrowUpRight,
        isActive: (pathname) => pathname.startsWith("/admin/upgrade-requests"),
      },
    ],
  },
  {
    label: "People & support",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        hint: "Directory across all roles",
        icon: Users,
        isActive: (pathname) => pathname.startsWith("/admin/users"),
      },
      {
        href: "/admin/comms",
        label: "Operational email",
        hint: "Broadcast platform updates",
        icon: Mail,
        isActive: (pathname) => pathname.startsWith("/admin/comms"),
      },
      {
        href: "/admin/tickets",
        label: "Support tickets",
        hint: "IT and platform issues",
        icon: Ticket,
        isActive: (pathname) => pathname.startsWith("/admin/tickets"),
      },
      {
        href: "/admin/assessment-recovery",
        label: "Assessment recovery",
        hint: "Abandoned attempts and unlocks",
        icon: RotateCcw,
        isActive: (pathname) => pathname.startsWith("/admin/assessment-recovery"),
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/settings",
        label: "Security",
        hint: "Admin two-factor authentication",
        icon: ShieldCheck,
        isActive: (pathname) => pathname.startsWith("/admin/settings"),
      },
      {
        href: "/admin/audit-logs",
        label: "Audit log",
        hint: "Platform activity history",
        icon: History,
        isActive: (pathname) => pathname.startsWith("/admin/audit-logs"),
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

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
  comms: "Operational email",
  tickets: "Support tickets",
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
