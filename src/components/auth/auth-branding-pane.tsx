"use client";

import { memo } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

type AuthBrandingPaneProps = {
  isLightTheme?: boolean;
};

/** Static left pane — isolated from form state so typing does not re-render this tree. */
export const AuthBrandingPane = memo(function AuthBrandingPane({
  isLightTheme = false,
}: AuthBrandingPaneProps) {
  return (
    <div
      className={cn(
        "relative hidden w-1/2 flex-col justify-between overflow-hidden border-r p-12 lg:flex xl:p-16",
        isLightTheme
          ? "border-slate-200 bg-white/55 text-slate-950 shadow-sm"
          : "border-white/10 bg-[#050505] text-white"
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          aria-hidden
          className={cn("absolute inset-0", isLightTheme ? "opacity-[0.28]" : "opacity-[0.18]")}
          style={{
            backgroundImage:
              isLightTheme
                ? "linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)"
                : "linear-gradient(to right, rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.4) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 30% 40%, black 20%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 30% 40%, black 20%, transparent 80%)",
          }}
        />
        {!isLightTheme && (
          <>
            <div
              aria-hidden
              className="absolute left-[12%] top-[34%] h-[28rem] w-[28rem] rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(56,189,248,0.18), rgba(37,99,235,0.06) 45%, transparent 70%)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/80 mix-blend-multiply" />
          </>
        )}
        {isLightTheme && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/75 via-sky-50/50 to-slate-100/70" />
        )}
      </div>

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-8 top-8 z-10 h-6 w-6 border-l-2 border-t-2",
          isLightTheme ? "border-slate-300" : "border-white/15"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-8 right-8 z-10 h-6 w-6 border-b-2 border-r-2",
          isLightTheme ? "border-slate-300" : "border-white/15"
        )}
      />

      <div className="relative z-10 flex items-center justify-between">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <BrandLogo layout="horizontal" className="h-10 w-[4.5rem]" />
        </Link>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Secure access
        </span>
      </div>

      <div className="relative z-10 max-w-lg">
        <p
          className={cn(
            "mb-5 font-mono text-[11px] uppercase tracking-[0.28em]",
            isLightTheme ? "text-sky-700" : "text-cyan-400/80"
          )}
        >
          Dispatch Intelligence Platform
        </p>
        <h2
          className={cn(
            "text-4xl font-medium leading-[1.1] tracking-tight xl:text-5xl",
            isLightTheme ? "text-slate-950" : "text-white"
          )}
        >
          Recruit for the moments that{" "}
          <span
            className={cn(
              "bg-gradient-to-r bg-clip-text text-transparent",
              isLightTheme ? "from-sky-700 to-blue-700" : "from-sky-300 to-blue-400"
            )}
          >
            actually matter
          </span>
          .
        </h2>
        <ul className="mt-8 space-y-3.5">
          {[
            "Behavioural scoring under real pressure",
            "Pressure-tested operational scenarios",
            "Three role-built portals, one platform",
          ].map((item) => (
            <li
              key={item}
              className={cn(
                "flex items-center gap-3 text-[15px]",
                isLightTheme ? "text-slate-700" : "text-slate-300"
              )}
            >
              <CheckCircle
                className={cn("h-4 w-4 shrink-0", isLightTheme ? "text-sky-700" : "text-cyan-400")}
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
            isLightTheme ? "border-sky-700/30" : "border-cyan-400/40"
          )}
        >
          <p
            className={cn(
              "text-xl font-medium leading-snug tracking-tight",
              isLightTheme ? "text-slate-800" : "text-white/90"
            )}
          >
            &ldquo;We stopped guessing based on interviews. Now we evaluate candidates under actual
            control room pressure.&rdquo;
          </p>
          <footer
            className={cn(
              "flex items-center gap-3 text-xs font-semibold uppercase tracking-widest",
              isLightTheme ? "text-sky-700" : "text-cyan-400"
            )}
          >
            <span className={cn("h-px w-8", isLightTheme ? "bg-sky-700" : "bg-cyan-400")} />
            Mission Critical Assessment
          </footer>
        </blockquote>
      </div>
    </div>
  );
});
