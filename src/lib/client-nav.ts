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
        href: "/client-dashboard/hiring-managers",
        label: "Hiring managers",
        icon: Users,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/hiring-managers"),
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
        href: "/client-dashboard/client-approved-candidates",
        label: "Candidate reviews",
        icon: UserCheck,
        isActive: (pathname) =>
          pathname.startsWith("/client-dashboard/client-approved-candidates"),
      },
    ],
  },
  {
    label: "Account & records",
    collapsible: true,
    items: [
      {
        href: "/client-dashboard/activity-logs",
        label: "Activity logs",
        icon: ScrollText,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/activity-logs"),
      },
      {
        href: "/client-dashboard/upgrade-requests",
        label: "Upgrade requests",
        icon: TrendingUp,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/upgrade-requests"),
      },
      {
        href: "/client-dashboard/messages",
        label: "Messages",
        icon: MessageSquare,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/messages"),
      },
    ],
  },
];

export const CLIENT_NAV_ITEMS = CLIENT_NAV_GROUPS.flatMap((group) => group.items);

export type ClientBreadcrumb = { label: string; href?: string };

const SEGMENT_LABELS: Record<string, string> = {
  "client-dashboard": "Client",
  "hiring-managers": "Hiring managers",
  campaigns: "Campaigns",
  "campaign-approvals": "Campaigns",
  "client-approved-candidates": "Candidate reviews",
  "candidate-approvals": "Candidate reviews",
  progressed: "Campaigns",
  "upgrade-requests": "Upgrade requests",
  "assessment-recovery": "Assessment recovery",
  "activity-logs": "Activity logs",
  messages: "Messages",
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
