"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
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

function ForgotPasswordForm() {
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
            <h1 className="font-display text-3xl font-bold tracking-tight">Reset your password</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              {sent
                ? "If an account exists for that email, we sent a link to choose a new password."
                : "Enter your email and we will send you a reset link."}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                <div className="space-y-1 text-sm text-slate-300">
                  <p className="font-medium text-emerald-300">Check your inbox</p>
                  <p>
                    The link expires after a short time. If you do not see the email, check spam
                    or ask your administrator.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl border-white/10">
                <Link href="/auth/register?mode=login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-slate-300">
                  Email address
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={AUTH_INPUT_CLASS}
                  placeholder="you@organisation.com"
                  disabled={submitStatus === "loading"}
                />
              </div>

              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <AnimatedSubmitButton
                type="submit"
                state={submitStatus}
                idleLabel="Send reset link"
                loadingLabel="Sending…"
                successLabel="Sent"
                invalidLabel="Try again"
                className="w-full rounded-xl"
                disabled={submitStatus === "loading"}
              />

              <Button
                asChild
                variant="ghost"
                className={cn("w-full rounded-xl text-slate-400 hover:text-white")}
              >
                <Link href="/auth/register?mode=login">
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
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
