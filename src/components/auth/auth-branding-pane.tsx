"use client";

import { memo } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

type AuthBrandingPaneProps = {
  isLightTheme?: boolean;
  variant?: "login" | "join";
};

/** Static left pane — isolated from form state so typing does not re-render this tree. */
export const AuthBrandingPane = memo(function AuthBrandingPane({
  isLightTheme = false,
  variant = "login",
}: AuthBrandingPaneProps) {
  const isJoin = variant === "join";

  return (
    <div
      className={cn(
        "relative hidden w-1/2 flex-col justify-between overflow-hidden border-r p-12 lg:flex xl:p-16",
        isLightTheme
          ? "border-slate-200 bg-[#f7f4ef] text-slate-950"
          : "border-white/10 bg-[#07060a] text-white"
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: isLightTheme
              ? "radial-gradient(circle at 1px 1px, rgba(28,25,23,0.14) 1px, transparent 0)"
              : "radial-gradient(circle at 1px 1px, rgba(251,191,36,0.16) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 75% 65% at 35% 40%, black 15%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 35% 40%, black 15%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -left-24 top-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{
            background: isLightTheme
              ? "radial-gradient(circle, rgba(180,83,9,0.18), transparent 70%)"
              : "radial-gradient(circle, rgba(245,158,11,0.22), transparent 68%)",
          }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full blur-3xl"
          style={{
            background: isLightTheme
              ? "radial-gradient(circle, rgba(15,23,42,0.08), transparent 70%)"
              : "radial-gradient(circle, rgba(14,165,233,0.12), transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <Link href="/" className="inline-block transition-transform hover:scale-[1.03]">
          <BrandLogo layout="horizontal" className="h-10 w-[4.5rem]" />
        </Link>
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.22em]",
            isLightTheme ? "text-stone-500" : "text-stone-400"
          )}
        >
          {isJoin ? "Session entry" : "Secure access"}
        </span>
      </div>

      <div className="relative z-10 max-w-lg">
        <p
          className={cn(
            "mb-5 font-mono text-[11px] uppercase tracking-[0.28em]",
            isLightTheme ? "text-amber-800" : "text-amber-400/90"
          )}
        >
          {isJoin ? "Assessment session" : "CTRL Assessment"}
        </p>
        <h2
          className={cn(
            "font-display text-4xl font-medium leading-[1.08] tracking-tight xl:text-5xl",
            isLightTheme ? "text-stone-950" : "text-white"
          )}
        >
          {isJoin ? (
            <>
              One code.{" "}
              <span
                className={cn(
                  "bg-gradient-to-r bg-clip-text text-transparent",
                  isLightTheme
                    ? "from-amber-800 to-orange-700"
                    : "from-amber-300 to-orange-300"
                )}
              >
                Your session.
              </span>
            </>
          ) : (
            <>
              Evidence under{" "}
              <span
                className={cn(
                  "bg-gradient-to-r bg-clip-text text-transparent",
                  isLightTheme
                    ? "from-amber-800 to-orange-700"
                    : "from-amber-300 to-orange-300"
                )}
              >
                real pressure.
              </span>
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
            <li
              key={item}
              className={cn(
                "flex items-center gap-3 text-[15px]",
                isLightTheme ? "text-stone-700" : "text-stone-300"
              )}
            >
              <CheckCircle
                className={cn(
                  "h-4 w-4 shrink-0",
                  isLightTheme ? "text-amber-800" : "text-amber-400"
                )}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 max-w-lg">
        <blockquote
          className={cn(
            "space-y-4 border-l-2 pl-5",
            isLightTheme ? "border-amber-800/35" : "border-amber-400/40"
          )}
        >
          <p
            className={cn(
              "text-xl font-medium leading-snug tracking-tight",
              isLightTheme ? "text-stone-800" : "text-white/90"
            )}
          >
            {isJoin
              ? "Have your code ready. You’ll confirm your account next, then open the assessment session linked to it."
              : "We stopped guessing from interviews alone. Now we evaluate candidates with structured, pressure-tested evidence."}
          </p>
          <footer
            className={cn(
              "flex items-center gap-3 text-xs font-semibold uppercase tracking-widest",
              isLightTheme ? "text-amber-800" : "text-amber-400"
            )}
          >
            <span
              className={cn("h-px w-8", isLightTheme ? "bg-amber-800" : "bg-amber-400")}
            />
            {isJoin ? "Candidate pathway" : "Organisational hiring"}
          </footer>
        </blockquote>
      </div>
    </div>
  );
});
