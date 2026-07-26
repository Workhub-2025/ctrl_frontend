"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { SessionAccessCodeForm } from "@/components/auth/session-access-code-form";
import { BrandLogo } from "@/components/brand-logo";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { useAuth } from "@/hooks/use-auth";
import { normalizeRole } from "@/lib/auth/role-model";
import { candidateDashboardPathWithAccessCode } from "@/lib/public-app-urls";
import { cn } from "@/lib/utils";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    settings,
    updateSettings,
    resetSettings,
    themeClassName,
  } = useAccessibilitySettings();
  const isLightTheme =
    settings.theme === "soft-cream" || settings.theme === "light-blue";
  const panelVariant = isLightTheme ? "light-panel" : "dark-panel";
  const initialCode =
    searchParams.get("accessCode") ?? searchParams.get("code") ?? "";

  const continueWithCode = useCallback(
    async (accessCode: string) => {
      const destination = candidateDashboardPathWithAccessCode(accessCode);
      const role = normalizeRole(user?.role);
      if (role === "candidate") {
        router.push(destination);
        return;
      }
      if (user) {
        throw new Error(
          "Session codes are for candidates. Sign out, then join with this code."
        );
      }
      const login = new URL("/auth/login", window.location.origin);
      login.searchParams.set("mode", "code");
      login.searchParams.set("accessCode", accessCode);
      login.searchParams.set("callbackUrl", destination);
      router.push(`${login.pathname}${login.search}`);
    },
    [router, user]
  );

  return (
    <div className={cn("ctrl-landing-page relative flex min-h-[100svh] w-full", themeClassName)}>
      <AuthBrandingPane isLightTheme={isLightTheme} variant="join" />
      <main className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12 xl:px-24">
        <div className="absolute right-6 top-6 z-50 lg:right-8 lg:top-8">
          <AccessibilityDropdown
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
          />
        </div>

        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-10 flex justify-center lg:hidden">
            <Link href="/" aria-label="CTRL home">
              <BrandLogo layout="stacked" className="h-16 w-[7.125rem]" />
            </Link>
          </div>

          <div className="mb-8 space-y-2">
            <p
              className={cn(
                "font-mono text-[11px] font-semibold uppercase tracking-[0.22em]",
                isLightTheme ? "text-amber-800" : "text-amber-400/90"
              )}
            >
              Candidate entry
            </p>
            <h1
              className={cn(
                "text-balance font-display text-3xl font-semibold tracking-tight",
                isLightTheme ? "text-slate-950" : "text-white"
              )}
            >
              Enter your session code
            </h1>
            <p
              className={cn(
                "text-pretty text-sm leading-6",
                isLightTheme ? "text-slate-600" : "text-slate-400"
              )}
            >
              Use the one-time access code from your invitation or hiring manager
              to open your assessment session.
            </p>
          </div>

          <SessionAccessCodeForm
            initialCode={initialCode}
            panelVariant={panelVariant}
            inputVariant={isLightTheme ? "light" : "dark"}
            onSubmit={continueWithCode}
          />

          <p
            className={cn(
              "mt-8 text-center text-sm",
              isLightTheme ? "text-slate-600" : "text-slate-400"
            )}
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className={cn(
                "font-medium underline-offset-4 hover:underline",
                isLightTheme ? "text-slate-900" : "text-white"
              )}
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-background" />}>
      <JoinContent />
    </Suspense>
  );
}
