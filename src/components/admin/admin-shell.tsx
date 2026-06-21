"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal/portal-shell";
import {
  filterAdminNavGroups,
  getActiveAdminNavItem,
  getAdminBreadcrumbs,
  getAdminRoutePermission,
  getDefaultAdminRoute,
} from "@/lib/admin-nav";
import { hasAdminPermission } from "@/lib/auth/admin-portal-permissions";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const role = session?.user?.role;

  const navGroups = useMemo(
    () => filterAdminNavGroups(role),
    [role],
  );

  useEffect(() => {
    if (status !== "authenticated" || !role) return;

    const requiredPermission = getAdminRoutePermission(pathname);
    if (
      requiredPermission &&
      !hasAdminPermission(role, requiredPermission)
    ) {
      router.replace(getDefaultAdminRoute(role));
    }
  }, [pathname, role, router, status]);

  return (
    <PortalShell
      brandSubtitle="Admin portal"
      homeHref={getDefaultAdminRoute(role)}
      navGroups={navGroups}
      getBreadcrumbs={getAdminBreadcrumbs}
      getActiveLabel={(currentPath) => getActiveAdminNavItem(currentPath)?.label ?? "Admin"}
      accessibilityDescription="Adjust the admin portal display."
    >
      {children}
    </PortalShell>
  );
}
