"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const portalEyebrowClassName =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-primary";

export function PortalEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(portalEyebrowClassName, className)}>{children}</p>;
}

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  action,
  notice,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: ReactNode;
  action?: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <header className="relative mb-8 overflow-hidden rounded-2xl border border-border/55 bg-card/40 p-6 shadow-sm dark:border-white/5 dark:bg-[#0b1329]/25 sm:p-7">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <PortalEyebrow>{eyebrow}</PortalEyebrow>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {badge}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {notice}
          </div>
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
        ) : null}
      </div>
    </header>
  );
}

const panelAccentClassNames = {
  none: "",
  primary: "before:bg-gradient-to-b before:from-primary before:to-indigo-500",
  warning: "before:bg-gradient-to-b before:from-amber-500 before:to-orange-500",
  success: "before:bg-gradient-to-b before:from-emerald-500 before:to-teal-400",
  muted: "before:bg-gradient-to-b before:from-slate-400 before:to-slate-600",
  campaign: "before:bg-gradient-to-b before:from-cyan-500 before:to-indigo-500",
  session: "before:bg-gradient-to-b before:from-indigo-500 before:to-sky-500",
} as const;

export type PortalPanelAccent = keyof typeof panelAccentClassNames;

export function PortalPanel({
  children,
  className,
  accent = "none",
}: {
  children: ReactNode;
  className?: string;
  accent?: PortalPanelAccent;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/55 bg-card/55 shadow-sm backdrop-blur-sm dark:border-white/5 dark:bg-[#0b1329]/25",
        accent !== "none" &&
          "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        panelAccentClassNames[accent],
        className
      )}
    >
      {children}
    </div>
  );
}

export function PortalSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <PortalEyebrow>{eyebrow}</PortalEyebrow> : null}
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PortalStatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "attention" | "success";
}) {
  const toneClass =
    tone === "attention"
      ? "border-amber-500/25 bg-amber-500/[0.06]"
      : tone === "success"
        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
        : "";

  return (
    <PortalPanel className={toneClass}>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </PortalPanel>
  );
}

export function PortalEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PortalQuickLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function PortalNavCard({
  href,
  icon: Icon,
  title,
  description,
  metric,
  accent = "primary",
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  metric?: string | number;
  accent?: PortalPanelAccent;
}) {
  return (
    <Link href={href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
      <PortalPanel accent={accent} className="h-full transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-md">
        <div className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {metric !== undefined ? (
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {metric}
              </span>
            ) : null}
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
      </PortalPanel>
    </Link>
  );
}
