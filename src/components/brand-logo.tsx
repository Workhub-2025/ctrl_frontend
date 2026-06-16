"use client";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  title?: string;
  layout?: "horizontal" | "stacked";
};

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({
  className,
  title = "CTRL mark",
}: BrandMarkProps) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <img
        src="/assets/newlogo.svg"
        alt={title}
        className="ctrl-brand-logo-image logo-adaptive-filter pointer-events-none block h-full w-full object-contain object-center"
      />
    </div>
  );
}

export function CtrlText({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-normal text-current", className)}>CTRL</span>
  );
}

export function BrandLogo({
  className,
  title = "CTRL",
  layout = "horizontal",
}: BrandLogoProps) {
  return (
    <div 
      className={cn(
        "ctrl-brand-logo inline-flex shrink-0 select-none items-center justify-center",
        layout === "stacked" ? "h-14 w-[6.25rem]" : "h-10 w-[4.5rem]",
        className
      )} 
      aria-label={title}
    >
      <img
        src="/assets/newlogo.svg"
        alt={title}
        className="ctrl-brand-logo-image logo-adaptive-filter pointer-events-none block h-full w-full object-contain object-center"
      />
    </div>
  );
}
