import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  FolderKanban,
  Headset,
  LayoutDashboard,
  Users,
  ScrollText,
} from "lucide-react";

export type HmNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type HmNavGroup = { label: string; items: HmNavItem[]; collapsible?: boolean };

const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const HM_NAV_GROUPS: HmNavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/hiring-manager-dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        isActive: (p) => normalizePath(p) === "/hiring-manager-dashboard",
      },
      {
        href: "/hiring-manager-dashboard/campaigns",
        label: "Campaigns",
        icon: FolderKanban,
        isActive: (p) =>
          p.startsWith("/hiring-manager-dashboard/campaigns") ||
          p.startsWith("/hiring-manager-dashboard/sessions"),
      },
      {
        href: "/hiring-manager-dashboard/candidates",
        label: "Candidates",
        icon: Users,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/candidates"),
      },
      {
        href: "/hiring-manager-dashboard/support",
        label: "Help & support",
        icon: Headset,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/support"),
      },
    ],
  },
  {
    label: "Account & records",
    collapsible: true,
    items: [
      {
        href: "/hiring-manager-dashboard/activity-logs",
        label: "Activity logs",
        icon: ScrollText,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/activity-logs"),
      },
    ],
  },
  {
    label: "Reference",
    collapsible: true,
    items: [
      {
        href: "/hiring-manager-dashboard/assessments",
        label: "Assessment library",
        icon: BookOpenCheck,
        isActive: (p) => p.startsWith("/hiring-manager-dashboard/assessments"),
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
  const segments = path.split("/").filter(Boolean);
  const hmIndex = segments.indexOf("hiring-manager-dashboard");
  const routeSegments = hmIndex >= 0 ? segments.slice(hmIndex + 1) : segments;

  const labels: Record<string, string> = {
    campaigns: "Campaigns",
    sessions: "Campaigns",
    candidates: "Candidates",
    assessments: "Assessments",
    "assessment-recovery": "Assessment recovery",
    support: "Help & support",
    "activity-logs": "Activity logs",
    create: "Create campaign",
    edit: "Edit campaign",
  };

  if (routeSegments.length === 0) {
    crumbs.push({ label: "Overview" });
    return crumbs;
  }

  const [section, detailId] = routeSegments;
  const sectionLabel = labels[section] ?? section;

  if (detailId && (section === "sessions" || section === "campaigns" || section === "candidates")) {
    crumbs.push({
      label: sectionLabel,
      href:
        section === "sessions"
          ? "/hiring-manager-dashboard/campaigns"
          : `/hiring-manager-dashboard/${section}`,
    });
    crumbs.push({
      label:
        section === "sessions"
          ? "Session detail"
          : section === "campaigns"
            ? "Campaign detail"
            : "Candidate report",
    });
    return crumbs;
  }

  crumbs.push({ label: labels[section] ?? section });
  return crumbs;
}

export function getActiveHmNavItem(pathname: string) {
  return HM_NAV_ITEMS.find((item) => item.isActive(pathname));
}
