"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { SessionJoinForm } from "@/components/auth/session-join-form";
import { BrandLogo } from "@/components/brand-logo";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

function JoinContent() {
  const searchParams = useSearchParams();
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
  const startOnVerify = searchParams.get("verified") === "1";

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
              Join your assessment
            </h1>
            <p
              className={cn(
                "text-pretty text-sm leading-6",
                isLightTheme ? "text-slate-600" : "text-slate-400"
              )}
            >
              Enter your session code and create a login you can reuse if you get
              signed out during assessment day.
            </p>
          </div>

          <SessionJoinForm
            initialCode={initialCode}
            startOnVerify={startOnVerify}
            panelVariant={panelVariant}
            inputVariant={isLightTheme ? "light" : "dark"}
          />
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
