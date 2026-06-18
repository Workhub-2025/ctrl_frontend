"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedSubmitButton, type ButtonState } from "@/components/ui/animated-submit-button";
import { AuthAPI } from "@/services/auth-api";
import { cn } from "@/lib/utils";

const AUTH_INPUT_CLASS =
  "h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-[border-color,box-shadow] focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim() ?? "";

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
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
        router.push("/auth/register?mode=login");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be reset.");
      setSubmitStatus("invalid");
    }
  };

  if (!code) {
    return (
      <div className="flex min-h-screen bg-[#030712] text-white">
        <AuthBrandingPane />
        <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <h1 className="font-display text-2xl font-bold">Invalid reset link</h1>
            <p className="text-sm text-slate-400">
              Open the link from your email or request a new password reset.
            </p>
            <Button asChild className="rounded-xl">
              <Link href="/auth/forgot-password">Request new link</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030712] text-white">
      <AuthBrandingPane />

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="flex items-center justify-between lg:hidden">
            <BrandLogo className="h-8 w-auto" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
              Account recovery
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight">Choose a new password</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Enter a new password for your CTRL Assessments account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-slate-300">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={cn(AUTH_INPUT_CLASS, "pr-12")}
                  disabled={submitStatus === "loading" || submitStatus === "success"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password" className="text-slate-300">
                Confirm password
              </Label>
              <Input
                id="reset-confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={AUTH_INPUT_CLASS}
                disabled={submitStatus === "loading" || submitStatus === "success"}
              />
            </div>

            {error ? (
              <p className="text-sm text-red-400" role="alert">
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
                password.length < 8 ||
                password !== confirmPassword
              }
            />

            <Button
              asChild
              variant="ghost"
              className="w-full rounded-xl text-slate-400 hover:text-white"
            >
              <Link href="/auth/register?mode=login">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Link>
            </Button>
          </form>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span>Use at least 8 characters.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
