import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, HelpCircle } from "lucide-react";

export type CandidateNavItem = {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type CandidateNavGroup = { label: string; items: CandidateNavItem[] };

const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const CANDIDATE_NAV_GROUPS: CandidateNavGroup[] = [
  {
    label: "Assessments",
    items: [
      {
        href: "/candidate-dashboard",
        label: "My assessments",
        hint: "Tasks and sessions",
        icon: BriefcaseBusiness,
        isActive: (p) =>
          normalizePath(p) === "/candidate-dashboard" ||
          p.startsWith("/candidate-dashboard/my-assessments"),
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        href: "/candidate-dashboard/help-support",
        label: "Help & support",
        hint: "Tickets and guidance",
        icon: HelpCircle,
        isActive: (p) => p.startsWith("/candidate-dashboard/help-support"),
      },
    ],
  },
];

export const CANDIDATE_NAV_ITEMS = CANDIDATE_NAV_GROUPS.flatMap((g) => g.items);

export function getCandidateBreadcrumbs(pathname: string) {
  const path = normalizePath(pathname);
  if (path === "/candidate-dashboard") return [{ label: "My assessments" }];
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Candidate", href: "/candidate-dashboard" },
  ];
  if (path.includes("my-assessments")) crumbs.push({ label: "My assessments" });
  else if (path.includes("help-support")) crumbs.push({ label: "Help & support" });
  return crumbs;
}

export function getActiveCandidateNavItem(pathname: string) {
  return CANDIDATE_NAV_ITEMS.find((item) => item.isActive(pathname));
}
