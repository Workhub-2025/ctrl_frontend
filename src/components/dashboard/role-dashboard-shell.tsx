"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth";
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
  children: React.ReactNode;
}>;

// --- Header Component ---
function RoleDashboardHeader({
  title,
  subtitle,
  hideSidebar,
}: Pick<RoleDashboardShellProps, "title" | "subtitle" | "hideSidebar">) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border dark:border-white/5 bg-background/95 dark:bg-[#04070d]/95 px-3 backdrop-blur-xl sm:px-5 lg:px-6 transition-colors duration-300">
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
      <div className="flex-1 px-3 text-center">
        <p className="text-sm font-semibold tracking-[0.04em] text-foreground">
          {title}
        </p>
        <p className="hidden text-xs text-muted-foreground/90 sm:block">
          {subtitle}
        </p>
      </div>

      {/* User Actions & Settings */}
      <div className="flex items-center gap-2">
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
              <span className="sr-only">Open account menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name ||
                    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                    "CTRL User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
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
  children,
}: RoleDashboardShellProps) {
  const pathname = usePathname();

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/30 dark:bg-[#04070d] selection:bg-primary/30 transition-colors duration-300">
        <RoleDashboardHeader title={title} subtitle={subtitle} hideSidebar={true} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-1 relative bg-muted/30 dark:bg-[#04070d] selection:bg-primary/30 transition-colors duration-300">
      {/* Sidebar Section */}
      <Sidebar className="border-r border-border dark:border-white/5 bg-background dark:bg-[#080c16] transition-colors duration-300">
        <SidebarHeader>
          {/* Sidebar Branding */}
          <Link
            href={navItems[0]?.href || "#"}
            className="mx-1 flex items-center gap-3 rounded-2xl border border-border dark:border-white/5 bg-muted/50 dark:bg-white/[0.02] px-3 py-3 transition-colors hover:bg-muted dark:hover:bg-white/[0.04]"
          >
            <img
              src="/icon1.png"
              className="h-10 w-10 logo-adaptive-filter"
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
        <SidebarContent>
          <SidebarMenu>
            {/* Sidebar Navigation Links */}
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || pathname === `${item.href}/`}
                  tooltip={item.label}
                  className="rounded-xl data-[active=true]:bg-primary/10 dark:data-[active=true]:bg-primary/15 data-[active=true]:text-primary hover:bg-muted dark:hover:bg-white/5 transition-colors duration-300"
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Profile"
                className="rounded-xl hover:bg-muted dark:hover:bg-white/5 transition-colors duration-300"
              >
                <Link href="/profile">
                  <UserCircle />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
        <RoleDashboardHeader title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
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
