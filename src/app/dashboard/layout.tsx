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
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Keyboard,
  Phone,
  ClipboardCheck,
  User,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function DashboardHeader() {
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
        <h1
          className="text-sm sm:text-base lg:text-lg font-semibold text-foreground leading-relaxed"
        >
          Candidate Dashboard
        </h1>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-foreground"
            >
              <User className="h-5 w-5" />
              <span className="sr-only leading-relaxed">
                User Profile
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name ||
                    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                    "User"}
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
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default function DashboardLayout({
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
              <Button
                variant="ghost"
                size="icon"
                className="h-auto w-15"
                asChild
              >
                <Link href="/">
                  <div className="flex flex-col items-center gap-1 p-2">
                    <img
                      src="/icon1.png"
                      className="h-15 w-15 cursor-pointer transition-transform hover:scale-105 logo-adaptive-filter"
                      alt="CTRL Logo"
                    />
                    <span className="font-semibold text-sm sm:text-base lg:text-lg text-foreground">
                      Assessments
                    </span>
                  </div>
                </Link>
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Typing Speed & Accuracy Test"
                >
                  <Link href="/assessment/typing">
                    <Keyboard />
                    <span>Typing Test</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Simulated Emergency Call Handling"
                >
                  <Link href="/assessment/call-simulation">
                    <Phone />
                    <span>Call Simulation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Decision-Making Scenarios">
                  <Link href="/assessment/situational-judgement">
                    <ClipboardCheck />
                    <span>Situational Judgement</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <DashboardHeader />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
