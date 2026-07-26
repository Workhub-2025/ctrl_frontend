"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { AdminFirstLoginSecurityDialog } from "@/components/auth/admin-first-login-security-dialog";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { AuthTotpForm } from "@/components/auth/auth-totp-form";
import { SessionAccessCodeForm } from "@/components/auth/session-access-code-form";
import { BrandLogo } from "@/components/brand-logo";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { useAuth } from "@/hooks/use-auth";
import { candidateDashboardPathWithAccessCode } from "@/lib/public-app-urls";
import { cn } from "@/lib/utils";

type LoginMode = "account" | "code";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyTotpLogin } = useAuth();
  const {
    settings,
    updateSettings,
    resetSettings,
    themeClassName,
  } = useAccessibilitySettings();
  const initialMode: LoginMode =
    searchParams.get("mode") === "code" || searchParams.get("accessCode")
      ? "code"
      : "account";
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [totpStep, setTotpStep] = useState(searchParams.get("totp") === "1");
  const [busy, setBusy] = useState(false);
  const [bootstrapEmail, setBootstrapEmail] = useState(
    searchParams.get("email")?.trim().toLowerCase() ?? "",
  );
  const [bootstrapOpen, setBootstrapOpen] = useState(
    searchParams.get("bootstrap") === "1",
  );
  const isLightTheme =
    settings.theme === "soft-cream" || settings.theme === "light-blue";
  const panelVariant = isLightTheme ? "light-panel" : "dark-panel";
  const queryMessage =
    searchParams.get("message") ??
    (searchParams.get("error") ? "Credentials not verified." : null);
  const accessCodeFromQuery = searchParams.get("accessCode") ?? "";

  useEffect(() => {
    if (searchParams.get("bootstrap") === "1" && bootstrapEmail) {
      setBootstrapOpen(true);
    }
  }, [bootstrapEmail, searchParams]);

  useEffect(() => {
    if (searchParams.get("mode") === "code" || searchParams.get("accessCode")) {
      setMode("code");
    }
  }, [searchParams]);

  const handleLogin = async (credentials: {
    email: string;
    password: string;
  }) => {
    setBusy(true);
    try {
      const result = await login(credentials.email, credentials.password);
      if (result?.requiresTotp) {
        setTotpStep(true);
        setBootstrapEmail(credentials.email.trim().toLowerCase());
        return { requiresTotp: true };
      }
      if (result?.bootstrapRequired) {
        setBootstrapEmail(credentials.email.trim().toLowerCase());
        setBootstrapOpen(true);
        return result;
      }
      return result;
    } finally {
      setBusy(false);
    }
  };

  const handleTotp = async (code: string) => {
    setBusy(true);
    try {
      const result = await verifyTotpLogin(code);
      if (result?.bootstrapRequired) {
        setBootstrapOpen(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const continueWithCode = async (accessCode: string) => {
    const destination = candidateDashboardPathWithAccessCode(accessCode);
    const loginUrl = new URL("/auth/login", window.location.origin);
    loginUrl.searchParams.set("callbackUrl", destination);
    loginUrl.searchParams.set("accessCode", accessCode);
    // Switch to account sign-in with the code preserved in the callback.
    setMode("account");
    router.replace(`${loginUrl.pathname}${loginUrl.search}`);
  };

  return (
    <div className={cn("ctrl-landing-page relative flex min-h-[100svh] w-full", themeClassName)}>
      <AuthBrandingPane isLightTheme={isLightTheme} />
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
            <h1
              className={cn(
                "text-balance font-display text-3xl font-semibold tracking-tight",
                isLightTheme ? "text-slate-950" : "text-white"
              )}
            >
              {totpStep
                ? "Verify your sign-in"
                : mode === "code"
                  ? "Join with a session code"
                  : "Welcome back"}
            </h1>
            <p
              className={cn(
                "text-pretty text-sm leading-6",
                isLightTheme ? "text-slate-600" : "text-slate-400"
              )}
            >
              {totpStep
                ? "Enter the code from your authenticator app to finish signing in."
                : mode === "code"
                  ? "Paste the one-time access code from your hiring manager, then sign in to open the session."
                  : "Sign in to your workspace, or join an assessment with a session code."}
            </p>
          </div>

          {!totpStep ? (
            <div
              role="tablist"
              aria-label="Sign-in method"
              className={cn(
                "mb-6 grid grid-cols-2 gap-1 rounded-xl border p-1",
                isLightTheme
                  ? "border-slate-200 bg-white/70"
                  : "border-white/10 bg-white/[0.03]"
              )}
            >
              {(
                [
                  { id: "account" as const, label: "Account" },
                  { id: "code" as const, label: "Session code" },
                ] as const
              ).map((tab) => {
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(tab.id)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
                      active
                        ? isLightTheme
                          ? "bg-stone-900 text-white focus-visible:ring-amber-700/40"
                          : "bg-white text-stone-950 focus-visible:ring-amber-400/40"
                        : isLightTheme
                          ? "text-stone-600 hover:text-stone-900 focus-visible:ring-stone-400/40"
                          : "text-stone-400 hover:text-white focus-visible:ring-white/20"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {queryMessage ? (
            <p
              role={searchParams.get("error") ? "alert" : "status"}
              className={cn(
                "mb-5 rounded-lg border px-4 py-3 text-sm",
                isLightTheme
                  ? "border-slate-300 bg-white text-slate-800"
                  : "border-white/10 bg-white/[0.04] text-slate-200",
              )}
            >
              {queryMessage}
            </p>
          ) : null}

          {totpStep ? (
            <AuthTotpForm
              disabled={busy}
              panelVariant={panelVariant}
              inputVariant={isLightTheme ? "light" : "dark"}
              onSubmit={handleTotp}
              onCancel={() => setTotpStep(false)}
            />
          ) : mode === "code" ? (
            <SessionAccessCodeForm
              initialCode={accessCodeFromQuery}
              disabled={busy}
              panelVariant={panelVariant}
              inputVariant={isLightTheme ? "light" : "dark"}
              submitLabel="Continue to sign in"
              onSubmit={continueWithCode}
            />
          ) : (
            <AuthLoginForm
              initialEmail={searchParams.get("email") ?? ""}
              disabled={busy}
              panelVariant={panelVariant}
              inputVariant={isLightTheme ? "light" : "dark"}
              onSubmit={handleLogin}
            />
          )}

          <p
            className={cn(
              "mt-8 text-center text-sm",
              isLightTheme ? "text-slate-600" : "text-slate-400"
            )}
          >
            {mode === "code" ? (
              <>
                Prefer the dedicated join page?{" "}
                <Link
                  href={
                    accessCodeFromQuery
                      ? `/join?accessCode=${encodeURIComponent(accessCodeFromQuery)}`
                      : "/join"
                  }
                  className={cn(
                    "font-medium underline-offset-4 hover:underline",
                    isLightTheme ? "text-slate-900" : "text-white"
                  )}
                >
                  Open /join
                </Link>
              </>
            ) : (
              <>
                New accounts are created from a verified invitation.{" "}
                <Link
                  href="/join"
                  className={cn(
                    "font-medium underline-offset-4 hover:underline",
                    isLightTheme ? "text-slate-900" : "text-white"
                  )}
                >
                  Have a session code?
                </Link>
              </>
            )}
          </p>
        </div>
      </main>

      <AdminFirstLoginSecurityDialog
        open={bootstrapOpen && Boolean(bootstrapEmail)}
        email={bootstrapEmail}
        onOpenChange={setBootstrapOpen}
        onCompleted={(redirectPath) => {
          window.location.assign(redirectPath);
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
