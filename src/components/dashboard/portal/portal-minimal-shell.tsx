"use client";

import Link from "next/link";
import { LogOut, User, UserCircle } from "lucide-react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PortalClock } from "@/components/dashboard/portal/portal-clock";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import type { AccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

type PortalMinimalShellProps = Readonly<{
  homeHref: string;
  title?: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}>;

function PortalMinimalHeader({
  homeHref,
  title,
  subtitle,
  accessibilitySettings,
  updateAccessibilitySettings,
  resetAccessibilitySettings,
}: Pick<PortalMinimalShellProps, "homeHref" | "title" | "subtitle"> & {
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibilitySettings: () => void;
}) {
  const { user, logout } = useAuth();

  const displayName =
    user?.name ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";

  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 border-b border-border/70 bg-background/90 px-3 backdrop-blur-md dark:border-white/6 dark:bg-[#02040a]/75 sm:px-5">
      <Link
        href={homeHref}
        className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="CTRL home"
      >
        <img
          src="/assets/newlogo.svg"
          className="logo-adaptive-filter h-8 w-8 scale-125 object-contain object-center"
          alt="CTRL"
        />
      </Link>

      {title ? (
        <div className="min-w-0 flex-1 px-1 text-center sm:px-3">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {subtitle ? (
            <p className="hidden truncate text-xs text-muted-foreground md:block">{subtitle}</p>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <PortalClock />
        <AccessibilityDropdown
          settings={accessibilitySettings}
          updateSettings={updateAccessibilitySettings}
          resetSettings={resetAccessibilitySettings}
          description="Adjust the portal display."
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

function PortalMinimalFrame({
  homeHref,
  title,
  subtitle,
  maxWidthClass = "max-w-7xl",
  children,
}: PortalMinimalShellProps) {
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    themeClassName,
  } = useAccessibilitySettings({ enabled: true });

  return (
    <div className={cn("ctrl-portal flex min-h-screen w-full flex-col selection:bg-primary/30", themeClassName)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      <PortalMinimalHeader
        homeHref={homeHref}
        title={title}
        subtitle={subtitle}
        accessibilitySettings={accessibilitySettings}
        updateAccessibilitySettings={updateAccessibilitySettings}
        resetAccessibilitySettings={resetAccessibilitySettings}
      />
      <main id="main-content" className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 md:px-8">
        <div className={cn("mx-auto w-full", maxWidthClass)}>{children}</div>
      </main>
    </div>
  );
}

export function PortalMinimalShell(props: PortalMinimalShellProps) {
  return (
    <AuthProvider>
      <PortalMinimalFrame {...props} />
    </AuthProvider>
  );
}
