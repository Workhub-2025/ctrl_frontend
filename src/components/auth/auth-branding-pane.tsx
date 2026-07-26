"use client";

import { memo } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type AuthBrandingPaneProps = {
  /** @deprecated Unused — pane follows active theme tokens. */
  isLightTheme?: boolean;
  variant?: "login" | "join";
};

/** Static left pane — isolated from form state so typing does not re-render this tree. */
export const AuthBrandingPane = memo(function AuthBrandingPane({
  variant = "login",
}: AuthBrandingPaneProps) {
  const isJoin = variant === "join";

  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-muted/35 p-12 text-foreground lg:flex xl:p-16">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div aria-hidden className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.14) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 75% 65% at 35% 40%, black 15%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 35% 40%, black 15%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <Link href="/" className="inline-block transition-transform hover:scale-[1.03]">
          <BrandLogo layout="horizontal" className="h-10 w-[4.5rem]" />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {isJoin ? "Session entry" : "Secure access"}
        </span>
      </div>

      <div className="relative z-10 max-w-lg">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
          {isJoin ? "Assessment session" : "CTRL Assessment"}
        </p>
        <h2 className="font-display text-4xl font-medium leading-[1.08] tracking-tight text-foreground xl:text-5xl">
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

      <div className="relative z-10 max-w-lg">
        <blockquote className="space-y-4 border-l-2 border-primary/40 pl-5">
          <p className="text-xl font-medium leading-snug tracking-tight text-foreground">
            {isJoin
              ? "Have your code ready. You’ll confirm your account next, then open the assessment session linked to it."
              : "We stopped guessing from interviews alone. Now we evaluate candidates with structured, pressure-tested evidence."}
          </p>
          <footer className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-primary">
            <span className="h-px w-8 bg-primary" aria-hidden="true" />
            {isJoin ? "Candidate pathway" : "Organisational hiring"}
          </footer>
        </blockquote>
      </div>
    </div>
  );
});
