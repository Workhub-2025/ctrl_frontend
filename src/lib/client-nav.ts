import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  Home,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";

export type ClientNavItem = {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type ClientNavGroup = {
  label: string;
  items: ClientNavItem[];
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
        hint: "Seats, approvals, activity",
        icon: Home,
        isActive: (pathname) => normalizePath(pathname) === "/client-dashboard",
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        href: "/client-dashboard/hiring-managers",
        label: "Hiring managers",
        hint: "Seats and invite codes",
        icon: Users,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/hiring-managers"),
      },
      {
        href: "/client-dashboard/progressed",
        label: "Approvals",
        hint: "Campaigns and candidates",
        icon: ClipboardCheck,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/progressed"),
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/client-dashboard/upgrade-requests",
        label: "Upgrade requests",
        hint: "Seats and features",
        icon: TrendingUp,
        isActive: (pathname) => pathname.startsWith("/client-dashboard/upgrade-requests"),
      },
      {
        href: "/client-dashboard/messages",
        label: "Messages",
        hint: "Support and hiring team",
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
  progressed: "Approvals",
  "upgrade-requests": "Upgrade requests",
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
    const label = SEGMENT_LABELS[segment] ?? segment;
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
