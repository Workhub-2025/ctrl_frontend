"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { AdminFirstLoginSecurityDialog } from "@/components/auth/admin-first-login-security-dialog";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { AuthTotpForm } from "@/components/auth/auth-totp-form";
import { authLinkClassName } from "@/components/auth/auth-surface";
import { BrandLogo } from "@/components/brand-logo";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { useAuth } from "@/hooks/use-auth";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";
import { cn } from "@/lib/utils";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyTotpLogin } = useAuth();
  const { settings, updateSettings, resetSettings, themeClassName } =
    useAccessibilitySettings();
  const [totpStep, setTotpStep] = useState(searchParams.get("totp") === "1");
  const [busy, setBusy] = useState(false);
  const [bootstrapEmail, setBootstrapEmail] = useState(
    searchParams.get("email")?.trim().toLowerCase() ?? "",
  );
  const [bootstrapOpen, setBootstrapOpen] = useState(
    searchParams.get("bootstrap") === "1",
  );
  const queryMessage =
    searchParams.get("message") ??
    (searchParams.get("error") ? "Credentials not verified." : null);

  // Legacy deep-links used ?mode=code or ?accessCode= on login — send them to /join.
  useEffect(() => {
    const accessCode = sanitiseAccessCode(
      searchParams.get("accessCode") ?? searchParams.get("code") ?? "",
    );
    if (searchParams.get("mode") === "code" || accessCode) {
      const join = new URL("/join", window.location.origin);
      if (accessCode) join.searchParams.set("accessCode", accessCode);
      router.replace(`${join.pathname}${join.search}`);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (searchParams.get("bootstrap") === "1" && bootstrapEmail) {
      setBootstrapOpen(true);
    }
  }, [bootstrapEmail, searchParams]);

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

  return (
    <div
      className={cn(
        "ctrl-landing-page relative flex min-h-[100svh] w-full bg-background text-foreground",
        themeClassName,
      )}
    >
      <AuthBrandingPane />
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
            <h1 className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground">
              {totpStep ? "Verify your sign-in" : "Welcome back"}
            </h1>
            <p className="text-pretty text-sm leading-6 text-muted-foreground">
              {totpStep
                ? "Enter the code from your authenticator app to finish signing in."
                : "Sign in with the email and password for your CTRL account."}
            </p>
          </div>

          {queryMessage ? (
            <p
              role={searchParams.get("error") ? "alert" : "status"}
              className="mb-5 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
            >
              {queryMessage}
            </p>
          ) : null}

          {totpStep ? (
            <AuthTotpForm
              disabled={busy}
              onSubmit={handleTotp}
              onCancel={() => setTotpStep(false)}
            />
          ) : (
            <AuthLoginForm
              initialEmail={searchParams.get("email") ?? ""}
              disabled={busy}
              onSubmit={handleLogin}
            />
          )}

          {!totpStep ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Have a session access code?{" "}
              <Link href="/join" className={authLinkClassName}>
                Join your assessment
              </Link>
            </p>
          ) : null}
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
