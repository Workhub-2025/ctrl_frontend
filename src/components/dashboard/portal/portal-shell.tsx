"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LogOut, User, UserCircle } from "lucide-react";
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
import { PortalClock } from "@/components/dashboard/portal/portal-clock";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
}: {
  breadcrumbs: PortalBreadcrumb[];
  activeLabel: string;
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibilitySettings: () => void;
  accessibilityDescription: string;
}) {
  const { user, logout } = useAuth();
  const displayName =
    user?.name ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";

  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 border-b border-border/70 bg-background/90 px-3 backdrop-blur-md dark:border-white/6 dark:bg-[#02040a]/75 sm:px-5">
      <SidebarTrigger className="shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <PortalBreadcrumbs crumbs={breadcrumbs} />
        <p className="truncate text-xs text-muted-foreground sm:hidden">{activeLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <PortalClock />
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
              size="icon"
              className="h-9 w-9 rounded-lg border border-border/60 dark:border-white/10"
            >
              <User className="h-4 w-4" />
              <span className="sr-only">Profile menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex cursor-pointer items-center">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
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
        <SidebarProvider>
          <CloseMobileSidebarOnNavigate />
          <Sidebar className="border-r border-border/60 bg-sidebar/95 backdrop-blur-xl dark:border-white/6 dark:bg-[#03060f]/90">
            <SidebarHeader className="border-b border-border/50 px-4 py-4 dark:border-white/6 group-data-[collapsible=icon]:px-2">
              <Link
                href={homeHref}
                className="flex items-center gap-3 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src="/assets/newlogo.svg"
                  className="logo-adaptive-filter h-9 w-9 scale-125 object-contain object-center"
                  alt="CTRL"
                />
                <p className="group-data-[collapsible=icon]:hidden text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                  {brandSubtitle}
                </p>
              </Link>
            </SidebarHeader>

            <SidebarContent className="gap-0 px-2 py-3 group-data-[collapsible=icon]:px-1">
              {navGroups.map((group, groupIndex) => (
                <SidebarGroup key={group.label} className="py-1">
                  {groupIndex > 0 ? <SidebarSeparator className="my-2" /> : null}
                  <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 group-data-[collapsible=icon]:sr-only">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={item.isActive(pathname)}
                            tooltip={item.label}
                            className="h-auto min-h-9 rounded-lg px-2.5 py-2 data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary dark:data-[active=true]:bg-primary/15"
                          >
                            <Link
                              href={item.href}
                              className="flex items-start gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <item.icon
                                className="mt-0.5 h-[17px] w-[17px] shrink-0"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                                <span className="block text-sm leading-tight">{item.label}</span>
                                {item.hint ? (
                                  <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground">
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
          </Sidebar>

          <SidebarInset className="min-w-0 bg-background">
            <PortalHeaderBar
              breadcrumbs={getBreadcrumbs(pathname)}
              activeLabel={getActiveLabel(pathname)}
              accessibilitySettings={accessibilitySettings}
              updateAccessibilitySettings={updateAccessibilitySettings}
              resetAccessibilitySettings={resetAccessibilitySettings}
              accessibilityDescription={accessibilityDescription}
            />
            <main
              id="main-content"
              className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 md:px-8", maxWidthClass)}
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </AuthProvider>
  );
}
