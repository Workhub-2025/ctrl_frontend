"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

function EmailConfirmedContent() {
  const searchParams = useSearchParams();
  const hasError = Boolean(searchParams.get("error"));

  return (
    <div className="flex min-h-screen bg-[#030712] text-white">
      <AuthBrandingPane />

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="flex items-center justify-between lg:hidden">
            <BrandLogo className="h-8 w-auto" />
          </div>

          <div
            className={
              hasError
                ? "space-y-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-8"
                : "space-y-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8"
            }
          >
            <div className="flex items-start gap-4">
              {hasError ? (
                <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-red-400" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-emerald-400" aria-hidden="true" />
              )}
              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {hasError ? "Email could not be confirmed" : "Email confirmed"}
                </h1>
                <p className="text-sm leading-relaxed text-slate-400">
                  {hasError
                    ? "The confirmation link may have expired or already been used. Sign in or register again if needed."
                    : "Your email address is verified. You can now sign in to CTRL Assessments."}
                </p>
              </div>
            </div>

            <Button asChild className="w-full rounded-xl">
              <Link href="/auth/register?mode=login">Continue to sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailConfirmedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <EmailConfirmedContent />
    </Suspense>
  );
}
