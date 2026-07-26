"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { authFieldClassName, authLinkClassName } from "@/components/auth/auth-surface";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedSubmitButton, type ButtonState } from "@/components/ui/animated-submit-button";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { AuthAPI } from "@/services/auth-api";
import { cn } from "@/lib/utils";

function ForgotPasswordForm() {
  const { settings, updateSettings, resetSettings, themeClassName } =
    useAccessibilitySettings();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Enter the email address for your account.");
      setSubmitStatus("invalid");
      return;
    }

    setSubmitStatus("loading");
    try {
      await AuthAPI.forgotPassword(normalized);
      setSent(true);
      setSubmitStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset request could not be sent.");
      setSubmitStatus("invalid");
    }
  };

  return (
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

        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="flex items-center justify-between lg:hidden">
            <BrandLogo className="h-8 w-auto" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Account recovery
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Reset your password
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {sent
                ? "If an account exists for that email, we sent a link to choose a new password."
                : "Enter your email and we will send you a reset link."}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6 rounded-2xl border border-success/30 bg-success/10 p-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Check your inbox</p>
                  <p>
                    The link expires after a short time. If you do not see the email, check spam or
                    ask your administrator.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href="/auth/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-foreground">
                  Email address
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={authFieldClassName()}
                  placeholder="you@organisation.com"
                  disabled={submitStatus === "loading"}
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
                idleText="Send reset link"
                errorMessage={
                  submitStatus === "error" || submitStatus === "invalid" ? error : undefined
                }
                className="w-full rounded-xl"
                disabled={submitStatus === "loading" || !email.trim()}
              />

              <Button asChild variant="ghost" className="w-full rounded-xl text-muted-foreground">
                <Link href="/auth/login" className={authLinkClassName}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back to sign in
                </Link>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
