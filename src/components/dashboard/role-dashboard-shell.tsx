"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { useAuth } from "@/hooks/use-auth";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import type { AccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { useAuthStore } from "@/store/auth.store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  User,
  UserCircle,
  LogOut,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type RoleDashboardShellProps = Readonly<{
  title: string;
  subtitle: string;
  navItems: NavItem[];
  hideSidebar?: boolean;
  contentWidth?: "default" | "wide" | "full";
  children: React.ReactNode;
}>;

// --- Header Component ---
function RoleDashboardHeader({
  title,
  subtitle,
  hideSidebar,
  accessibilitySettings,
  updateAccessibilitySettings,
  resetAccessibilitySettings,
}: Pick<RoleDashboardShellProps, "title" | "subtitle" | "hideSidebar"> & {
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibilitySettings: () => void;
}) {
  const { user, logout } = useAuth();
  const { userProfile } = useAuthStore();
  const displayName =
    userProfile
      ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || userProfile.email || "CTRL User"
      : user?.name || `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim() || "CTRL User";
  const displayEmail = userProfile?.email || user?.email;

  return (
    <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md transition-all duration-300 dark:border-white/5 dark:bg-[#02040a]/60 sm:px-6 lg:px-8 shadow-sm">
      {/* Sidebar Trigger & Title */}
      <div className="flex items-center gap-3 text-foreground">
        {!hideSidebar && <SidebarTrigger />}
        {hideSidebar && (
          <Link href="#" className="flex items-center gap-2">
            <img src="/icon1.png" className="h-8 w-8 logo-adaptive-filter" alt="CTRL Logo" />
            <span className="font-semibold tracking-[0.12em] hidden sm:inline-block">CTRL</span>
          </Link>
        )}
      </div>
      <div className="min-w-0 flex-1 px-3 text-center">
        <p className="truncate text-sm font-semibold text-foreground">
          {title}
        </p>
        <p className="hidden truncate text-xs text-muted-foreground/90 md:block">
          {subtitle}
        </p>
      </div>

      {/* User Actions & Settings */}
      <div className="flex items-center gap-2">
        <AccessibilityDropdown
          settings={accessibilitySettings}
          updateSettings={updateAccessibilitySettings}
          resetSettings={resetAccessibilitySettings}
          description="Adjust the portal display."
        />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full border border-border dark:border-white/10 hover:!bg-muted dark:hover:!bg-white/10 hover:!text-foreground dark:hover:!text-white transition-colors">
              <User className="h-5 w-5" />
              <span className="sr-only">Open account menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}

// --- Main Shell Frame ---
function RoleDashboardFrame({
  title,
  subtitle,
  navItems,
  hideSidebar,
  contentWidth = "default",
  children,
}: RoleDashboardShellProps) {
  const pathname = usePathname();
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    themeClassName: accessibilityThemeClassName,
  } = useAccessibilitySettings({ enabled: true });
  const contentWidthClass =
    contentWidth === "full"
      ? "max-w-none"
      : contentWidth === "wide"
        ? "max-w-[1800px]"
        : "max-w-7xl";

  if (hideSidebar) {
    return (
      <div
        className={cn(
          "flex min-h-screen w-full flex-col selection:bg-primary/30 transition-colors duration-300",
          "ctrl-portal", accessibilityThemeClassName
        )}
      >
        <RoleDashboardHeader
          title={title}
          subtitle={subtitle}
          hideSidebar={true}
          accessibilitySettings={accessibilitySettings}
          updateAccessibilitySettings={updateAccessibilitySettings}
          resetAccessibilitySettings={resetAccessibilitySettings}
        />
        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-5">
          <div className={cn("mx-auto w-full", contentWidthClass)}>{children}</div>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div
        className={cn(
          "flex min-h-screen w-full flex-1 relative selection:bg-primary/30 transition-colors duration-300",
          "ctrl-portal", accessibilityThemeClassName
        )}
      >
      {/* Sidebar Section */}
      <Sidebar className="border-r border-border dark:border-white/5 bg-white/70 dark:bg-[#02040a]/40 backdrop-blur-md transition-all duration-300">
        <SidebarHeader className="px-4 pt-4 group-data-[collapsible=icon]:px-2">
          {/* Sidebar Branding */}
          <Link
            href={navItems[0]?.href || "#"}
            className="flex items-center gap-3 rounded-2xl border border-border dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] px-3 py-3 transition-all hover:bg-slate-100/50 dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 shadow-sm"
          >
            <img
              src="/assets/newlogo.png"
              className="h-10 w-10 object-contain object-center mix-blend-screen scale-125 pointer-events-none hue-rotate-[60deg]"
              alt="CTRL Logo"
            />
            <div>
              <p className="text-sm font-semibold tracking-[0.12em] text-foreground">
                CTRL
              </p>
              <p className="text-xs text-muted-foreground/90">{title}</p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-4 pb-4 group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            {/* Sidebar Navigation Links */}
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || pathname === `${item.href}/`}
                  tooltip={item.label}
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-muted dark:hover:bg-white/5 transition-all duration-300 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:pl-3"
                >
                  <Link
                    href={item.href}
                    className={cn("font-medium")}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
        <RoleDashboardHeader
          title={title}
          subtitle={subtitle}
          accessibilitySettings={accessibilitySettings}
          updateAccessibilitySettings={updateAccessibilitySettings}
          resetAccessibilitySettings={resetAccessibilitySettings}
        />
        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-5">
          <div className={cn("mx-auto w-full", contentWidthClass)}>{children}</div>
        </main>
      </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function RoleDashboardShell(props: RoleDashboardShellProps) {
  return (
    <AuthProvider>
      <RoleDashboardFrame {...props} />
    </AuthProvider>
  );
}
