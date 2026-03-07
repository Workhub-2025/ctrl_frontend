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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui";
import {
  Users,
  BarChart3,
  FileText,
  User,
  LogOut,
  UserCircle,
  Shield,
  Database,
  ChartNoAxesColumn,
  Text,
  FileAudio,
  LucideFileQuestion,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth";

function AdminHeader() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-2 sm:px-4 lg:px-6">
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
  return (
    <AuthProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
                {/* <Link href="/admin"> */}
              <img
                      alt="CTRL"
                      className="h-15 w-15 logo-adaptive cursor-pointer transition-transform hover:scale-105"
                      src="../icon1.png"
                    />
                {/* </Link> */}

            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard Overview">
                  <Link href="/admin">
                    <BarChart3 />
                    <span className="font-medium text-foreground">
                      Dashboard
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Candidate Results">
                  <Link href="/admin/candidates">
                    <Users />
                    <span className="font-medium text-foreground">
                      Candidates
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Texts for tiping tests">
                  <Link href="/admin/texts">
                    <Text />
                    <span className="font-medium text-foreground">
                      Texts for typing
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Call's audios">
                  <Link href="/admin/calls">
                    <FileAudio />
                    <span className="font-medium text-foreground">
                      Call's audios
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Situational-judgement test's questions"
                >
                  <Link href="/admin/questions">
                    <LucideFileQuestion />
                    <span className="font-medium text-foreground">
                      Situational questions
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSeparator />
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Assessment Reports">
                  <Link href="/admin/reports">
                    <FileText />
                    <span className="font-medium text-foreground">Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Analytics & Statistics">
                  <Link href="/admin/analytics">
                    <ChartNoAxesColumn />
                    <span className="font-medium text-foreground">
                      Analytics
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="System Management">
                  <Link href="/admin/system">
                    <Database />
                    <span className="font-medium text-foreground">System</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <AdminHeader />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
