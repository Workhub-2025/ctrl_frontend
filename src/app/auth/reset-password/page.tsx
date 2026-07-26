"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { authFieldClassName } from "@/components/auth/auth-surface";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedSubmitButton, type ButtonState } from "@/components/ui/animated-submit-button";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { AuthAPI } from "@/services/auth-api";
import { cn } from "@/lib/utils";
import {
  PASSWORD_MAX_LENGTH,
  getPasswordPolicyIssue,
} from "@/lib/security/password-policy";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, updateSettings, resetSettings, themeClassName } =
    useAccessibilitySettings();
  const code =
    searchParams.get("oobCode")?.trim() ?? searchParams.get("code")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!code) {
      setError("This reset link is invalid or has expired. Request a new one.");
      setSubmitStatus("invalid");
      return;
    }
    const passwordIssue = getPasswordPolicyIssue(password);
    if (passwordIssue) {
      setError(`${passwordIssue}.`);
      setSubmitStatus("invalid");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitStatus("invalid");
      return;
    }

    setSubmitStatus("loading");
    try {
      await AuthAPI.resetPassword(code, password, confirmPassword);
      setSubmitStatus("success");
      window.setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be reset.");
      setSubmitStatus("invalid");
    }
  };

  const shell = (children: React.ReactNode) => (
    <div
      className={cn(
        "ctrl-landing-page flex min-h-screen bg-background text-foreground",
        themeClassName,
      )}
    >
      <AuthBrandingPane />
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="absolute right-6 top-6 z-50 lg:right-8 lg:top-8">
          <AccessibilityDropdown
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
          />
        </div>
        {children}
      </div>
    </div>
  );

  if (!code) {
    return shell(
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Invalid reset link</h1>
        <p className="text-sm text-muted-foreground">
          Open the link from your email or request a new password reset.
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/auth/forgot-password">Request new link</Link>
        </Button>
      </div>,
    );
  }

  return shell(
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="flex items-center justify-between lg:hidden">
        <BrandLogo className="h-8 w-auto" />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Account recovery
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter a new password for your CTRL Assessments account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-password" className="text-foreground">
            New password
          </Label>
          <div className="relative">
            <Input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={cn(authFieldClassName(), "pr-12")}
              disabled={submitStatus === "loading" || submitStatus === "success"}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password" className="text-foreground">
            Confirm password
          </Label>
          <Input
            id="reset-confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={authFieldClassName()}
            disabled={submitStatus === "loading" || submitStatus === "success"}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <AnimatedSubmitButton
          type="submit"
          status={submitStatus}
          idleText="Update password"
          errorMessage={
            submitStatus === "error" || submitStatus === "invalid" ? error : undefined
          }
          className="w-full rounded-xl"
          disabled={
            submitStatus === "loading" ||
            submitStatus === "success" ||
            getPasswordPolicyIssue(password) !== null ||
            password !== confirmPassword
          }
        />

        <Button asChild variant="ghost" className="w-full rounded-xl text-muted-foreground">
          <Link href="/auth/login">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </Button>
      </form>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        <span>Use at least 12 characters; a memorable passphrase works well.</span>
      </div>
    </div>,
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
