"use client";

import { PortalShell } from "@/components/dashboard/portal/portal-shell";
import {
  ADMIN_NAV_GROUPS,
  getActiveAdminNavItem,
  getAdminBreadcrumbs,
} from "@/lib/admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      brandSubtitle="Admin portal"
      homeHref="/admin"
      navGroups={ADMIN_NAV_GROUPS}
      getBreadcrumbs={getAdminBreadcrumbs}
      getActiveLabel={(pathname) => getActiveAdminNavItem(pathname)?.label ?? "Admin"}
      accessibilityDescription="Adjust the admin portal display."
    >
      {children}
    </PortalShell>
  );
}
