"use client";

import { PortalShell } from "@/components/dashboard/portal/portal-shell";
import {
  HM_NAV_GROUPS,
  getActiveHmNavItem,
  getHmBreadcrumbs,
} from "@/lib/hm-nav";

export function HiringManagerShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      brandSubtitle="Hiring manager"
      homeHref="/hiring-manager-dashboard"
      navGroups={HM_NAV_GROUPS}
      getBreadcrumbs={getHmBreadcrumbs}
      getActiveLabel={(pathname) => getActiveHmNavItem(pathname)?.label ?? "Hiring manager"}
      accessibilityDescription="Adjust the hiring manager portal display."
      maxWidthClass="max-w-[1600px]"
    >
      {children}
    </PortalShell>
  );
}
