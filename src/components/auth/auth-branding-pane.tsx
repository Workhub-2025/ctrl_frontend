"use client";

import { memo } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type AuthBrandingPaneProps = {
  /** @deprecated Unused: the pane follows the active theme tokens. */
  isLightTheme?: boolean;
  variant?: "login" | "join";
};

/** Static left pane, isolated from form state so typing does not re-render it. */
export const AuthBrandingPane = memo(function AuthBrandingPane({
  variant = "login",
}: AuthBrandingPaneProps) {
  const isJoin = variant === "join";

  return (
    <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-muted/35 p-12 text-foreground lg:flex xl:p-16">
      <Link href="/" className="inline-block self-start" aria-label="CTRL home">
        <BrandLogo layout="horizontal" className="h-10 w-[4.5rem]" />
      </Link>

      <div className="max-w-lg">
        <p className="mb-4 text-sm font-semibold text-primary">
          {isJoin ? "Assessment session" : "Secure access"}
        </p>
        <h2 className="font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground xl:text-5xl">
          {isJoin ? (
            <>
              One code. <span className="text-primary">Your session.</span>
            </>
          ) : (
            <>
              Evidence under <span className="text-primary">real pressure.</span>
            </>
          )}
        </h2>
        <ul className="mt-8 space-y-3.5">
          {(isJoin
            ? [
                "Codes expire 24 hours after issue",
                "Sign in once, then join your session",
                "Ask your hiring manager if you need a resend",
              ]
            : [
                "Role-built portals for every stakeholder",
                "Structured delivery with reviewable evidence",
                "Invitation-only account creation",
              ]
          ).map((item) => (
            <li key={item} className="flex items-center gap-3 text-[15px] text-muted-foreground">
              <CheckCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="max-w-lg text-base leading-7 text-muted-foreground">
        {isJoin
          ? "Have your code ready. You'll confirm your account next, then open the assessment session linked to it."
          : "Accounts are created by invitation. If you have not received one, ask your organisation's CTRL administrator."}
      </p>
    </div>
  );
});
