"use client";

import { ClientPortalProvider } from "@/context/client-portal-provider";
import { PortalShell } from "@/components/dashboard/portal/portal-shell";
import {
  CLIENT_NAV_GROUPS,
  getActiveClientNavItem,
  getClientBreadcrumbs,
} from "@/lib/client-nav";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <ClientPortalProvider>
      <PortalShell
        brandSubtitle="Client portal"
        homeHref="/client-dashboard"
        navGroups={CLIENT_NAV_GROUPS}
        getBreadcrumbs={getClientBreadcrumbs}
        getActiveLabel={(pathname) => getActiveClientNavItem(pathname)?.label ?? "Client"}
        accessibilityDescription="Adjust the client portal display."
        maxWidthClass="max-w-[1600px]"
      >
        {children}
      </PortalShell>
    </ClientPortalProvider>
  );
}
