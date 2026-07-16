"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, LogOut, User, UserCircle } from "lucide-react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { PortalBreadcrumbs, type PortalBreadcrumb } from "@/components/dashboard/portal/portal-ui";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

const PortalBreadcrumbDetailContext = createContext<((label: string | null) => void) | null>(null);

export function usePortalBreadcrumbDetail(label?: string | null) {
  const setDetailLabel = useContext(PortalBreadcrumbDetailContext);

  useEffect(() => {
    if (!setDetailLabel) return;
    setDetailLabel(label?.trim() || null);
    return () => setDetailLabel(null);
  }, [label, setDetailLabel]);
}

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type PortalNavGroup = {
  label: string;
  items: PortalNavItem[];
  collapsible?: boolean;
};

function PortalHeaderBar({
  breadcrumbs,
  activeLabel,
  accessibilitySettings,
  updateAccessibilitySettings,
  resetAccessibilitySettings,
  accessibilityDescription,
  workspaceLabel,
  homeHref,
  compactNavItems,
}: {
  breadcrumbs: PortalBreadcrumb[];
  activeLabel: string;
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibilitySettings: () => void;
  accessibilityDescription: string;
  workspaceLabel: string;
  homeHref: string;
  compactNavItems?: PortalNavItem[];
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const displayName =
    user?.name ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 min-w-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-5">
      {compactNavItems ? (
        <Link
          href={homeHref}
          aria-label={`CTRL ${workspaceLabel} home`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src="/assets/newlogo.svg"
            width={32}
            height={32}
            className="logo-adaptive-filter h-8 w-8 object-contain"
            alt=""
          />
        </Link>
      ) : (
        <SidebarTrigger className="h-11 w-11 shrink-0 rounded-md" />
      )}

      {compactNavItems ? (
        <nav aria-label={`${workspaceLabel} navigation`} className="flex min-w-0 flex-1 items-center gap-1">
          {compactNavItems.map((item) => {
            const isActive = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3",
                  isActive && "bg-muted text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="sr-only lg:hidden">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground sm:hidden">{activeLabel}</p>
          <PortalBreadcrumbs crumbs={breadcrumbs} />
        </div>
      )}
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
              className="h-11 min-w-11 gap-2 rounded-md border border-border bg-background px-2.5 sm:px-3"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span className={cn("hidden max-w-40 truncate text-sm font-semibold", compactNavItems ? "xl:inline" : "sm:inline")}>
                {displayName}
              </span>
              <span className={cn("sr-only", compactNavItems ? "xl:hidden" : "sm:hidden")}>Profile menu</span>
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

function PortalSidebarGroup({
  group,
  pathname,
  showSeparator,
}: {
  group: PortalNavGroup;
  pathname: string;
  showSeparator: boolean;
}) {
  const containsActiveItem = group.items.some((item) => item.isActive(pathname));
  const [isOpen, setIsOpen] = useState(!group.collapsible || containsActiveItem);

  useEffect(() => {
    if (containsActiveItem) setIsOpen(true);
  }, [containsActiveItem]);

  const menu = (
    <SidebarGroupContent>
      <SidebarMenu className="gap-1">
        {group.items.map((item) => {
          const isActive = item.isActive(pathname);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.label}
                className="h-11 rounded-md border-l-2 border-l-transparent px-2.5 data-[active=true]:border-l-sidebar-primary data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
              >
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate text-sm group-data-[collapsible=icon]:hidden">
                    {item.label}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroupContent>
  );

  return (
    <SidebarGroup className="py-1">
      {showSeparator ? <SidebarSeparator className="my-2 bg-sidebar-border" /> : null}
      {group.collapsible ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-full items-center justify-between rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
            >
              <span>{group.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-150", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>{menu}</CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:sr-only">
            {group.label}
          </SidebarGroupLabel>
          {menu}
        </>
      )}
    </SidebarGroup>
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
  compactNavigation = false,
  children,
}: {
  brandSubtitle: string;
  homeHref: string;
  navGroups: PortalNavGroup[];
  getBreadcrumbs: (pathname: string) => PortalBreadcrumb[];
  getActiveLabel: (pathname: string) => string;
  accessibilityDescription: string;
  maxWidthClass?: string;
  compactNavigation?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [breadcrumbDetail, setBreadcrumbDetail] = useState<{
    pathname: string;
    label: string;
  } | null>(null);
  const registerBreadcrumbDetail = useCallback((label: string | null) => {
    setBreadcrumbDetail(label ? { pathname, label } : null);
  }, [pathname]);
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    themeClassName,
  } = useAccessibilitySettings({ enabled: true });

  const navItems = navGroups.flatMap((g) => g.items);
  const breadcrumbs = getBreadcrumbs(pathname);
  if (breadcrumbDetail?.pathname === pathname && breadcrumbs.length > 0) {
    breadcrumbs[breadcrumbs.length - 1] = {
      ...breadcrumbs[breadcrumbs.length - 1],
      label: breadcrumbDetail.label,
    };
  }

  return (
    <AuthProvider>
      <PortalBreadcrumbDetailContext.Provider value={registerBreadcrumbDetail}>
      <div className={cn("ctrl-portal min-h-screen selection:bg-primary/30", themeClassName)}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <SidebarProvider>
          {!compactNavigation ? <CloseMobileSidebarOnNavigate /> : null}
          {!compactNavigation ? (
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
                      <span className="block text-sm font-bold tracking-[0.08em] text-sidebar-foreground">
                        CTRL
                      </span>
                      <span className="block text-xs font-medium text-muted-foreground">
                        {brandSubtitle}
                      </span>
                    </span>
                  </Link>
                </SidebarHeader>

                <SidebarContent className="gap-0 px-2 py-3 group-data-[collapsible=icon]:px-1">
                  {navGroups.map((group, groupIndex) => (
                    <PortalSidebarGroup
                      key={group.label}
                      group={group}
                      pathname={pathname}
                      showSeparator={groupIndex > 0}
                    />
                  ))}
                </SidebarContent>
              </Sidebar>
          ) : null}

          <SidebarInset className="min-w-0 bg-background">
            <PortalHeaderBar
              breadcrumbs={breadcrumbs}
              activeLabel={getActiveLabel(pathname)}
              accessibilitySettings={accessibilitySettings}
              updateAccessibilitySettings={updateAccessibilitySettings}
              resetAccessibilitySettings={resetAccessibilitySettings}
              accessibilityDescription={accessibilityDescription}
              workspaceLabel={brandSubtitle}
              homeHref={homeHref}
              compactNavItems={compactNavigation ? navItems : undefined}
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
      </PortalBreadcrumbDetailContext.Provider>
    </AuthProvider>
  );
}
