"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalFilterChipActiveClass,
  portalFilterChipClass,
  portalIconWrapClass,
  portalIconWrapLgClass,
  portalInputClass,
  portalLabelClass,
  portalPageHeaderClass,
  portalPanelClass,
  portalCardClass,
  portalEmptyPanelClass,
  portalStatTileClass,
  portalStatusBadge,
  portalTableHeaderClass,
  portalTableRowClass,
  portalTableShellClass,
  portalTableToolbarClass,
} from "@/components/dashboard/portal/portal-design-tokens";

export {
  portalPanelClass,
  portalCardClass,
  portalEmptyPanelClass,
  portalStatTileClass,
  portalBadgeClass,
  portalStatusBadge,
  portalInputClass,
  portalTableShellClass,
} from "@/components/dashboard/portal/portal-design-tokens";

/* ── Breadcrumbs ─────────────────────────────────────────────── */

export type PortalBreadcrumb = { label: string; href?: string };

export function PortalBreadcrumbs({ crumbs }: { crumbs: PortalBreadcrumb[] }) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                  aria-hidden="true"
                />
              ) : null}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate font-medium",
                    isLast ? "text-foreground" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Page header ───────────────────────────────────────────── */

export function PortalPageHeader({
  title,
  description,
  action,
  notice,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  notice?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(portalPageHeaderClass, className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
        ) : null}
      </div>
      {notice}
    </header>
  );
}

/* ── Section header ──────────────────────────────────────────── */

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
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────── */

export function PortalStatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone: _tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  /** @deprecated Tones removed — all stat tiles use the unified style */
  tone?: string;
}) {
  return (
    <div className={portalStatTileClass}>
      <div className="flex items-start justify-between gap-3">
        <p className={portalLabelClass}>{label}</p>
        {Icon ? (
          <span className={portalIconWrapClass}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────── */

export function PortalPanel({
  children,
  className,
  padding = true,
  accent: _accent,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  /** @deprecated Accents removed — all panels use the unified portal style */
  accent?: string;
}) {
  return (
    <div className={cn(portalPanelClass, padding && "p-5", className)}>{children}</div>
  );
}

/* ── Link card ───────────────────────────────────────────────── */

export function PortalLinkCard({
  title,
  description,
  href,
  actionLabel,
  icon: Icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
  icon: LucideIcon;
  badge?: string | number;
}) {
  return (
    <PortalPanel className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <span className={portalIconWrapLgClass}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {badge !== undefined && Number(badge) > 0 ? (
              <span className={portalStatusBadge()}>{badge}</span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {actionLabel ? (
        <div className="mt-4 pt-2">
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </PortalPanel>
  );
}

/** Compact quick-link row used on overview pages. */
export function PortalQuickLinkRow({
  links,
}: {
  links: Array<{ href: string; label: string; hint: string; icon: LucideIcon }>;
}) {
  return (
    <PortalPanel padding={false} className="overflow-hidden">
      <div className="grid divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-white/8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <link.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold text-foreground">{link.label}</span>
              <span className="block text-xs text-muted-foreground">{link.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </PortalPanel>
  );
}

/* ── Alerts ──────────────────────────────────────────────────── */

export function PortalAlert({
  children,
  tone = "error",
  className,
}: {
  children: ReactNode;
  tone?: "error" | "info";
  className?: string;
}) {
  return (
    <div
      className={cn(
        tone === "error" ? portalAlertErrorClass : portalAlertInfoClass,
        "font-medium leading-relaxed",
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

/* ── Table shell ─────────────────────────────────────────────── */

export function PortalTableShell({
  toolbar,
  footer,
  children,
  className,
}: {
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(portalTableShellClass, className)}>
      {toolbar ? <div className={portalTableToolbarClass}>{toolbar}</div> : null}
      {footer ? (
        <div className="border-b border-border/50 px-4 py-2.5 text-xs text-muted-foreground dark:border-white/6">
          {footer}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function PortalTableHeadRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(portalTableHeaderClass, className)} {...props} />;
}

export function PortalTableBodyRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(portalTableRowClass, className)} {...props} />;
}

/* ── Filter chips ────────────────────────────────────────────── */

export function PortalFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? portalFilterChipActiveClass : portalFilterChipClass}
    >
      {children}
    </button>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */

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
    <PortalPanel>
      <div className="flex flex-col items-center py-8 text-center">
        <span className={cn(portalIconWrapLgClass, "mb-4 h-12 w-12")}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </PortalPanel>
  );
}

/* Legacy aliases — prefer PortalPageHeader over the old card-style header */
export const PortalEyebrow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn(portalLabelClass, "text-primary", className)}>{children}</p>
);
