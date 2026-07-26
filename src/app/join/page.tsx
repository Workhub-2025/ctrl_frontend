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
  const { settings, updateSettings, resetSettings, themeClassName } =
    useAccessibilitySettings();
  const initialCode =
    searchParams.get("accessCode") ?? searchParams.get("code") ?? "";
  const startOnVerify = searchParams.get("verified") === "1";

  return (
    <div
      className={cn(
        "ctrl-landing-page relative flex min-h-[100svh] w-full bg-background text-foreground",
        themeClassName,
      )}
    >
      <AuthBrandingPane variant="join" />
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
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Candidate entry
            </p>
            <h1 className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground">
              Join your assessment
            </h1>
            <p className="text-pretty text-sm leading-6 text-muted-foreground">
              Enter the session code from your hiring team. The same code works for remote and
              in-person sessions — then create a login you can reuse if you get signed out.
            </p>
            <p
              role="note"
              className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm leading-6 text-muted-foreground"
            >
              You will need to verify your email with Firebase before the assessment unlocks. Check
              your inbox after you create your account.
            </p>
          </div>

          <SessionJoinForm initialCode={initialCode} startOnVerify={startOnVerify} />
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
