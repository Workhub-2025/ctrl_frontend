"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LogOut, ShieldCheck, User, UserCircle } from "lucide-react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { PortalBreadcrumbs, type PortalBreadcrumb } from "@/components/dashboard/portal/portal-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import type { AccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

export type PortalNavItem = {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type PortalNavGroup = {
  label: string;
  items: PortalNavItem[];
};

function PortalHeaderBar({
  breadcrumbs,
  activeLabel,
  accessibilitySettings,
  updateAccessibilitySettings,
  resetAccessibilitySettings,
  accessibilityDescription,
  workspaceLabel,
}: {
  breadcrumbs: PortalBreadcrumb[];
  activeLabel: string;
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibilitySettings: () => void;
  accessibilityDescription: string;
  workspaceLabel: string;
}) {
  const { user, logout } = useAuth();
  const displayName =
    user?.name ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 min-w-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-5">
      <SidebarTrigger className="h-10 w-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground sm:hidden">{activeLabel}</p>
        <PortalBreadcrumbs crumbs={breadcrumbs} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AccessibilityDropdown
          settings={accessibilitySettings}
          updateSettings={updateAccessibilitySettings}
          resetSettings={resetAccessibilitySettings}
          description={accessibilityDescription}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-2 rounded-md border border-border bg-background px-2.5 sm:px-3"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden max-w-40 truncate text-sm font-semibold sm:inline">{displayName}</span>
              <span className="sr-only sm:hidden">Profile menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="break-all text-xs leading-snug text-muted-foreground">{user?.email}</p>
                <p className="pt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {workspaceLabel}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex cursor-pointer items-center">
                <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function CloseMobileSidebarOnNavigate() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  return null;
}

export function PortalShell({
  brandSubtitle,
  homeHref,
  navGroups,
  getBreadcrumbs,
  getActiveLabel,
  accessibilityDescription,
  maxWidthClass = "max-w-[1600px]",
  children,
}: {
  brandSubtitle: string;
  homeHref: string;
  navGroups: PortalNavGroup[];
  getBreadcrumbs: (pathname: string) => PortalBreadcrumb[];
  getActiveLabel: (pathname: string) => string;
  accessibilityDescription: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    themeClassName,
  } = useAccessibilitySettings({ enabled: true });

  const navItems = navGroups.flatMap((g) => g.items);

  return (
    <AuthProvider>
      <div className={cn("ctrl-portal min-h-screen selection:bg-primary/30", themeClassName)}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <SidebarProvider>
          <CloseMobileSidebarOnNavigate />
          <Sidebar className="border-r border-sidebar-border bg-sidebar">
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
              <Link
                href={homeHref}
                className="flex min-h-11 items-center gap-3 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <img
                  src="/assets/newlogo.svg"
                  width={36}
                  height={36}
                  className="logo-adaptive-filter h-9 w-9 object-contain object-center"
                  alt="CTRL"
                />
                <span className="group-data-[collapsible=icon]:hidden">
                  <span className="block text-sm font-bold tracking-[0.08em] text-sidebar-foreground">CTRL</span>
                  <span className="block text-xs font-medium text-muted-foreground">{brandSubtitle}</span>
                </span>
              </Link>
            </SidebarHeader>

            <SidebarContent className="gap-0 px-2 py-3 group-data-[collapsible=icon]:px-1">
              {navGroups.map((group, groupIndex) => (
                <SidebarGroup key={group.label} className="py-1">
                  {groupIndex > 0 ? <SidebarSeparator className="my-2 bg-sidebar-border" /> : null}
                  <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/90 group-data-[collapsible=icon]:sr-only">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={item.isActive(pathname)}
                            tooltip={item.label}
                            className="h-auto min-h-11 rounded-sm border-l-2 border-l-transparent px-2.5 py-2 data-[active=true]:border-l-sidebar-primary data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:overflow-visible [&>span:last-child]:whitespace-normal"
                          >
                            <Link
                              href={item.href}
                              aria-current={item.isActive(pathname) ? "page" : undefined}
                              className="flex items-start gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                            >
                              <item.icon
                                className="mt-0.5 h-[17px] w-[17px] shrink-0"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                                <span className="block text-sm leading-tight">{item.label}</span>
                                {item.hint ? (
                                  <span className="mt-0.5 block text-xs font-normal leading-snug text-muted-foreground">
                                    {item.hint}
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
              <div className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:hidden">
                  <span className="block text-xs font-semibold text-sidebar-foreground">Authenticated workspace</span>
                  <span className="block text-xs leading-snug">{brandSubtitle}</span>
                </span>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="min-w-0 bg-background">
            <PortalHeaderBar
              breadcrumbs={getBreadcrumbs(pathname)}
              activeLabel={getActiveLabel(pathname)}
              accessibilitySettings={accessibilitySettings}
              updateAccessibilitySettings={updateAccessibilitySettings}
              resetAccessibilitySettings={resetAccessibilitySettings}
              accessibilityDescription={accessibilityDescription}
              workspaceLabel={brandSubtitle}
            />
            <main
              id="main-content"
              tabIndex={-1}
              className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8", maxWidthClass)}
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </AuthProvider>
  );
}
