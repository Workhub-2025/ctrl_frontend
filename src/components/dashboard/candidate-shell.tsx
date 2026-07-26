"use client";

import { PortalShell } from "@/components/dashboard/portal/portal-shell";
import {
  CANDIDATE_NAV_GROUPS,
  getActiveCandidateNavItem,
  getCandidateBreadcrumbs,
} from "@/lib/candidate-nav";

export function CandidateShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      brandSubtitle="Candidate portal"
      homeHref="/candidate-dashboard"
      navGroups={CANDIDATE_NAV_GROUPS}
      getBreadcrumbs={getCandidateBreadcrumbs}
      getActiveLabel={(pathname) => getActiveCandidateNavItem(pathname)?.label ?? "Candidate"}
      accessibilityDescription="Adjust the candidate portal display."
      maxWidthClass="max-w-[1600px]"
      compactNavigation
    >
      {children}
    </PortalShell>
  );
}
