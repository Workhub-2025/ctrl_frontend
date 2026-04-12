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
  LayoutDashboard,
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
  children: React.ReactNode;
}>;

function RoleDashboardHeader({
  title,
  subtitle,
}: Pick<RoleDashboardShellProps, "title" | "subtitle">) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-background/80 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
      <div className="text-foreground">
        <SidebarTrigger />
      </div>
      <div className="flex-1 px-3 text-center">
        <p className="text-sm font-semibold tracking-[0.04em] text-foreground">
          {title}
        </p>
        <p className="hidden text-xs text-muted-foreground/90 sm:block">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </div>
    </header>
  );
}

function RoleDashboardFrame({
  title,
  subtitle,
  navItems,
  children,
}: RoleDashboardShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.08),transparent_22%),linear-gradient(180deg,#08101c_0%,#0b1220_45%,#0d1422_100%)]">
      <Sidebar className="border-r border-white/10 bg-[#0b1320]/88 backdrop-blur-xl">
        <SidebarHeader>
          <Link
            href="/"
            className="mx-1 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
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
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="rounded-xl data-[active=true]:bg-white/10 data-[active=true]:text-white hover:bg-white/6"
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
                className="rounded-xl hover:bg-white/6"
              >
                <Link href="/profile">
                  <UserCircle />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Home"
                className="rounded-xl hover:bg-white/6"
              >
                <Link href="/">
                  <LayoutDashboard />
                  <span>Landing page</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
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
