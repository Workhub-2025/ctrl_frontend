import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  Home,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
  ScrollText,
} from "lucide-react";

export type ClientNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type ClientNavGroup = {
  label: string;
  items: ClientNavItem[];
  collapsible?: boolean;
};

const normalizePath = (pathname: string) =>
  pathname.replace(/\/+$/, "") || "/";

export const CLIENT_NAV_GROUPS: ClientNavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/client-dashboard",
        label: "Overview",
        icon: Home,
        isActive: (pathname) => normalizePath(pathname) === "/client-dashboard",
      },
      {
        href: "/client-dashboard/team",
        label: "Team",
        icon: Users,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/team") ||
          pathname.startsWith("/client-dashboard/hiring-managers"),
      },
      {
        href: "/client-dashboard/campaigns",
        label: "Campaigns",
        icon: FolderKanban,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/campaigns") ||
          pathname.startsWith("/client-dashboard/campaign-approvals"),
      },
      {
        href: "/client-dashboard/candidates",
        label: "Candidates",
        icon: UserCheck,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/candidates") ||
          pathname.startsWith("/client-dashboard/client-approved-candidates") ||
          pathname.startsWith("/client-dashboard/candidate-approvals"),
      },
    ],
  },
  {
    label: "Account & records",
    collapsible: true,
    items: [
      {
        href: "/client-dashboard/activity",
        label: "Activity",
        icon: ScrollText,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/activity") ||
          pathname.startsWith("/client-dashboard/activity-logs"),
      },
      {
        href: "/client-dashboard/billing",
        label: "Billing",
        icon: TrendingUp,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/billing") ||
          pathname.startsWith("/client-dashboard/upgrade-requests"),
      },
      {
        href: "/client-dashboard/support",
        label: "Support",
        icon: MessageSquare,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/support") ||
          pathname.startsWith("/client-dashboard/messages"),
      },
    ],
  },
];

export const CLIENT_NAV_ITEMS = CLIENT_NAV_GROUPS.flatMap((group) => group.items);

export type ClientBreadcrumb = { label: string; href?: string };

const SEGMENT_LABELS: Record<string, string> = {
  "client-dashboard": "Client",
  team: "Team",
  "hiring-managers": "Team",
  campaigns: "Campaigns",
  "campaign-approvals": "Campaigns",
  candidates: "Candidates",
  "client-approved-candidates": "Candidates",
  "candidate-approvals": "Candidates",
  progressed: "Campaigns",
  billing: "Billing",
  "upgrade-requests": "Billing",
  "assessment-recovery": "Assessment recovery",
  activity: "Activity",
  "activity-logs": "Activity",
  support: "Support",
  messages: "Support",
};

export function getClientBreadcrumbs(pathname: string): ClientBreadcrumb[] {
  const path = normalizePath(pathname);
  const segments = path.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return [{ label: "Overview" }];
  }

  const crumbs: ClientBreadcrumb[] = [
    { label: "Client", href: "/client-dashboard" },
  ];

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    const isDetail = index > 1 && segments[index - 1] === "campaigns";
    const label = isDetail ? "Campaign detail" : SEGMENT_LABELS[segment] ?? segment;
    const isLast = index === segments.length - 1;
    const href = isLast
      ? undefined
      : `/client-dashboard/${segments.slice(1, index + 1).join("/")}`;
    crumbs.push({ label, href });
  }

  return crumbs;
}

export function getActiveClientNavItem(pathname: string): ClientNavItem | undefined {
  return CLIENT_NAV_ITEMS.find((item) => item.isActive(pathname));
}
