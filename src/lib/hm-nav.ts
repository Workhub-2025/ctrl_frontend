import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  FolderKanban,
  Headset,
  LayoutDashboard,
  Layers3,
  Users,
} from "lucide-react";

export type HmNavItem = {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type HmNavGroup = { label: string; items: HmNavItem[] };

const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const HM_NAV_GROUPS: HmNavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/hiring-manager-dashboard",
        label: "Overview",
        hint: "Campaigns and candidates",
        icon: LayoutDashboard,
        isActive: (p) => normalizePath(p) === "/hiring-manager-dashboard",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/hiring-manager-dashboard/campaigns",
        label: "Campaigns",
        hint: "Create and manage campaigns",
        icon: FolderKanban,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/campaigns"),
      },
      {
        href: "/hiring-manager-dashboard/sessions",
        label: "Sessions",
        hint: "Assessment sessions",
        icon: Layers3,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/sessions"),
      },
      {
        href: "/hiring-manager-dashboard/candidates",
        label: "Candidates",
        hint: "Review and share candidates",
        icon: Users,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/candidates"),
      },
      {
        href: "/hiring-manager-dashboard/assessments",
        label: "Assessments",
        hint: "Assessment library",
        icon: BookOpenCheck,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/assessments"),
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        href: "/hiring-manager-dashboard/support",
        label: "Help & support",
        hint: "Tickets and guidance",
        icon: Headset,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/support"),
      },
    ],
  },
];

export const HM_NAV_ITEMS = HM_NAV_GROUPS.flatMap((g) => g.items);

export function getHmBreadcrumbs(pathname: string) {
  const path = normalizePath(pathname);
  if (path === "/hiring-manager-dashboard") return [{ label: "Overview" }];
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Hiring manager", href: "/hiring-manager-dashboard" },
  ];
  const segment = path.split("/").pop() ?? "";
  const labels: Record<string, string> = {
    campaigns: "Campaigns",
    sessions: "Sessions",
    candidates: "Candidates",
    assessments: "Assessments",
    "assessment-recovery": "Assessment recovery",
    support: "Help & support",
    create: "Create campaign",
  };
  crumbs.push({ label: labels[segment] ?? segment });
  return crumbs;
}

export function getActiveHmNavItem(pathname: string) {
  return HM_NAV_ITEMS.find((item) => item.isActive(pathname));
}
