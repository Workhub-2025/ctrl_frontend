"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui";
import {
  User,
  LogOut,
  UserCircle,
  LayoutDashboard,
  ArrowUpRight,
  Settings,
  Users,
  History,
  Building2,
  PlusCircle,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import type { AccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

function AdminHeader({
  accessibilitySettings,
  updateAccessibilitySettings,
  resetAccessibilitySettings,
}: {
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibilitySettings: () => void;
}) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md transition-all duration-300 dark:border-white/5 dark:bg-[#02040a]/60 sm:px-6 lg:px-8 shadow-sm">
      <div className="text-foreground">
        <SidebarTrigger />
      </div>
      <div className="min-w-0 flex-1 px-3 text-center">
        <p className="truncate text-sm font-semibold text-foreground font-display">
          Admin Control Panel
        </p>
        <p className="hidden truncate text-xs text-muted-foreground/90 md:block">
          System administration and client configuration
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AccessibilityDropdown
          settings={accessibilitySettings}
          updateSettings={updateAccessibilitySettings}
          resetSettings={resetAccessibilitySettings}
          description="Adjust the admin portal display."
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full border border-border dark:border-white/10 hover:!bg-muted dark:hover:!bg-white/10 hover:!text-foreground dark:hover:!text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              <User className="h-5 w-5" />
              <span className="sr-only">Admin Profile</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name ||
                    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                    "Admin"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="flex items-center cursor-pointer"
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span className="font-medium text-foreground">Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-medium text-foreground">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    themeClassName,
  } = useAccessibilitySettings({ enabled: true });
  const pathname = usePathname();

  return (
    <AuthProvider>
      <div className={cn("ctrl-portal selection:bg-primary/30 min-h-screen", themeClassName)}>
      <SidebarProvider>
        <Sidebar className="border-r border-border/60 dark:border-white/5 bg-slate-50/90 dark:bg-[#03060f]/75 backdrop-blur-xl transition-all duration-300">
          <SidebarHeader className="px-4 pt-5 pb-3 group-data-[collapsible=icon]:px-2">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-2 py-1.5 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <img
                src="/assets/newlogo.svg"
                className="h-9 w-9 object-contain object-center scale-125 pointer-events-none transition-transform duration-300 hover:rotate-6 logo-adaptive-filter"
                alt="CTRL Logo"
              />
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-foreground font-display">
                  CTRL
                </p>
                <p className="text-[10px] text-muted-foreground/80 font-medium tracking-wide uppercase">Admin</p>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-3 pb-4 group-data-[collapsible=icon]:px-2">
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/admin" || pathname === "/admin/"}
                  tooltip="Dashboard Overview"
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                >
                  <Link
                    href="/admin"
                    className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                  >
                    <LayoutDashboard className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin/users")}
                  tooltip="Users"
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                >
                  <Link
                    href="/admin/users"
                    className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                  >
                    <Users className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                    <span>Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin/upgrade-requests")}
                  tooltip="Upgrades"
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                >
                  <Link
                    href="/admin/upgrade-requests"
                    className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                  >
                    <ArrowUpRight className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                    <span>Upgrades</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin/audit-logs")}
                  tooltip="Audit Logs"
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                >
                  <Link
                    href="/admin/audit-logs"
                    className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                  >
                    <History className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                    <span>Audit Logs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin/tickets")}
                  tooltip="Tickets"
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                >
                  <Link
                    href="/admin/tickets"
                    className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                  >
                    <Ticket className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                    <span>Tickets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin/settings")}
                  tooltip="Settings"
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                >
                  <Link
                    href="/admin/settings"
                    className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                  >
                    <Settings className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSeparator />
              <SidebarGroup className="px-1">
                <SidebarGroupLabel className="px-2">Clients</SidebarGroupLabel>
                <SidebarGroupContent className="space-y-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/admin/clients" || (pathname.startsWith("/admin/clients/") && !pathname.endsWith("/create"))}
                      tooltip="Client List"
                      className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                    >
                      <Link
                        href="/admin/clients"
                        className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                      >
                        <Building2 className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                        <span>Client List</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/admin/clients/create" || pathname === "/admin/clients/create/"}
                      tooltip="Create Client"
                      className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3.5"
                    >
                      <Link
                        href="/admin/clients/create"
                        className="font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg text-sm flex items-center gap-3 py-2"
                      >
                        <PlusCircle className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                        <span>Create Client</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <AdminHeader
            accessibilitySettings={accessibilitySettings}
            updateAccessibilitySettings={updateAccessibilitySettings}
            resetAccessibilitySettings={resetAccessibilitySettings}
          />
          <main className="mx-auto w-full max-w-7xl p-4 sm:p-5 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      </div>
    </AuthProvider>
  );
}
