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
import { BrandLogo } from "@/components/brand-logo";
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
} from "lucide-react";
import Link from "next/link";
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
    <header className="flex h-14 items-center justify-between border-b bg-card px-2 sm:px-4 lg:px-6 transition-colors duration-300">
      <div className="text-foreground">
        <SidebarTrigger />
      </div>
      <div className="flex-1 text-center px-2">
        <h4
          className="text-xs sm:text-sm lg:text-sm font-semibold text-foreground leading-relaxed"
        >
          Admin Control Panel
        </h4>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <AccessibilityDropdown
          settings={accessibilitySettings}
          updateSettings={updateAccessibilitySettings}
          resetSettings={resetAccessibilitySettings}
          description="Adjust the admin portal display."
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5 text-blue-800 dark:text-blue-300" />
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
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
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

  return (
    <AuthProvider>
      <div className={cn("ctrl-portal selection:bg-primary/30 min-h-screen", themeClassName)}>
      <SidebarProvider>
        <Sidebar className="transition-colors duration-300">
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Link href="/admin" className="block">
                <BrandLogo className="w-[132px] text-slate-950 transition-transform hover:scale-[1.02] dark:text-white" />
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard Overview">
                  <Link href="/admin">
                    <LayoutDashboard />
                    <span className="font-medium text-foreground">
                      Overview
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Users">
                  <Link href="/admin/users">
                    <Users />
                    <span className="font-medium text-foreground">
                      Users
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Upgrades">
                  <Link href="/admin/upgrade-requests">
                    <ArrowUpRight />
                    <span className="font-medium text-foreground">
                      Upgrades
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Audit Logs">
                  <Link href="/admin/audit-logs">
                    <History />
                    <span className="font-medium text-foreground">
                      Audit Logs
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link href="/admin/settings">
                    <Settings />
                    <span className="font-medium text-foreground">
                      Settings
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Clients</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Client List">
                      <Link href="/admin/clients">
                        <Building2 />
                        <span className="font-medium text-foreground">
                          Client List
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Create Client">
                      <Link href="/admin/clients/create">
                        <PlusCircle />
                        <span className="font-medium text-foreground">
                          Create Client
                        </span>
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
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      </div>
    </AuthProvider>
  );
}
