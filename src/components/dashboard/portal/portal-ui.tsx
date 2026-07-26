"use client";

import type { ReactElement, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalAlertWarningClass,
  portalFilterChipActiveClass,
  portalFilterChipClass,
  portalIconWrapClass,
  portalIconWrapLgClass,
  portalInputClass,
  portalLabelClass,
  portalPageHeaderClass,
  portalPanelClass,
  portalSupportingTextClass,
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
  portalPanelInteractiveClass,
  portalCardClass,
  portalCardInteractiveClass,
  portalEmptyPanelClass,
  portalStatTileClass,
  portalBadgeClass,
  portalStatusBadge,
  portalInputClass,
  portalTableShellClass,
} from "@/components/dashboard/portal/portal-design-tokens";

/**
 * Accept Lucide component refs from Client Components, or already-rendered
 * nodes from Server Components (passing a function across the RSC boundary
 * throws "Functions cannot be passed directly to Client Components").
 */
export type PortalIconProp = LucideIcon | ReactNode;

function resolvePortalIcon(
  icon: PortalIconProp | undefined,
  className: string
): ReactNode {
  if (!icon) return null;
  if (typeof icon === "function") {
    const Icon = icon as LucideIcon;
    return <Icon className={className} aria-hidden="true" />;
  }
  if (
    typeof icon === "object" &&
    icon !== null &&
    "$$typeof" in icon &&
    "render" in icon &&
    typeof (icon as { render?: unknown }).render === "function"
  ) {
    const Icon = icon as unknown as LucideIcon;
    return <Icon className={className} aria-hidden="true" />;
  }
  return icon as ReactNode;
}

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
  eyebrow,
  icon,
  badge,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  notice?: ReactNode;
  className?: string;
  eyebrow?: string;
  icon?: PortalIconProp;
  badge?: ReactNode;
}) {
  const titleBlock = (
    <div className="min-w-0 space-y-1.5">
      {eyebrow ? (
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
      ) : null}
      <div className={cn(badge ? "flex flex-wrap items-center gap-2.5" : undefined)}>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
          {title}
        </h1>
        {badge}
      </div>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {notice ? <div className="pt-1">{notice}</div> : null}
    </div>
  );

  const resolvedIcon = resolvePortalIcon(icon, "h-5 w-5");

  return (
    <header className={cn(portalPageHeaderClass, className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        {resolvedIcon ? (
          <div className="flex min-w-0 items-start gap-3.5">
            <span className={cn(portalIconWrapLgClass, "mt-0.5 shrink-0")} aria-hidden="true">
              {resolvedIcon}
            </span>
            {titleBlock}
          </div>
        ) : (
          titleBlock
        )}
        {action ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ── Section header ──────────────────────────────────────────── */

export function PortalSectionHeader({
  eyebrow,
  title,
  titleId,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
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
  icon,
  loading,
  tone: _tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: PortalIconProp;
  loading?: boolean;
  /** @deprecated Tones removed — all stat tiles use the unified style */
  tone?: string;
}) {
  const resolvedIcon = resolvePortalIcon(icon, "h-4 w-4");
  const isValueLoading = loading || value === "…" || value === "...";
  return (
    <div className={portalStatTileClass}>
      <div className="flex items-start justify-between gap-3">
        <p className={portalLabelClass}>{label}</p>
        {resolvedIcon ? (
          <span className={portalIconWrapClass}>{resolvedIcon}</span>
        ) : null}
      </div>
      {isValueLoading ? (
        <div className="mt-2.5 h-7 w-20 animate-pulse rounded-md bg-muted/60" />
      ) : (
        <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
      )}
      {detail ? (
        <p className={cn("mt-1", portalSupportingTextClass)}>{detail}</p>
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
    <div className={cn(portalPanelClass, padding && "p-4 sm:p-5", className)}>{children}</div>
  );
}

/* ── Requirement list ────────────────────────────────────────── */

export type PortalRequirement = Readonly<{
  id: string;
  label: string;
  met: boolean;
}>;

/**
 * Explains why a primary action is still blocked. Outstanding items read as
 * instructions; satisfied items stay visible so the list never jumps around.
 */
export function PortalRequirementList({
  title,
  requirements,
  completeLabel = "Everything needed is in place.",
  className,
}: {
  title: string;
  requirements: readonly PortalRequirement[];
  completeLabel?: string;
  className?: string;
}) {
  const outstanding = requirements.filter((requirement) => !requirement.met);

  return (
    <div className={cn("space-y-2", className)}>
      <p className={portalLabelClass}>{title}</p>
      {outstanding.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {completeLabel}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="flex items-start gap-2 text-sm">
              {requirement.met ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              <span
                className={
                  requirement.met ? "text-muted-foreground line-through" : "text-foreground"
                }
              >
                {requirement.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Decision ledger ─────────────────────────────────────────── */

export type PortalDecisionLedgerItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  count?: number;
  meta?: string;
  actionLabel?: string;
};

export function PortalDecisionLedger({
  title = "Decision ledger",
  description,
  items,
  loading = false,
  emptyTitle = "No decisions are waiting",
  emptyDescription = "There is nothing requiring a response right now.",
}: {
  title?: string;
  description: string;
  items: PortalDecisionLedgerItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const headingId = `decision-ledger-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <PortalSectionHeader title={title} titleId={headingId} description={description} />
      <div className={cn(portalPanelClass, "overflow-hidden border-l-2 border-l-primary/70")}>
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground" aria-live="polite">
            Loading decisions…
          </p>
        ) : items.length === 0 ? (
          <div className="flex min-h-24 items-start gap-3 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">{emptyTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex min-h-[4.5rem] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {typeof item.count === "number" ? (
                      <span className="min-w-10 text-lg font-semibold tabular-nums text-foreground">
                        {item.count}
                      </span>
                    ) : (
                      <span className="h-8 w-1 shrink-0 bg-primary/65" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{item.detail}</span>
                    </span>
                    {item.meta ? (
                      <span className="hidden text-[0.8125rem] font-medium text-muted-foreground md:inline">{item.meta}</span>
                    ) : null}
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      <span className="hidden sm:inline">{item.actionLabel ?? "Review"}</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
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
              <span className={cn("block", portalSupportingTextClass)}>{link.hint}</span>
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
  tone?: "error" | "warning" | "info";
  className?: string;
}) {
  const toneClass =
    tone === "error"
      ? portalAlertErrorClass
      : tone === "warning"
        ? portalAlertWarningClass
        : portalAlertInfoClass;
  return (
    <div
      className={cn(toneClass, "font-medium leading-relaxed", className)}
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
        <div className="border-b border-border/50 px-4 py-2.5 text-[0.8125rem] text-muted-foreground">
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

/* ── Loading states ──────────────────────────────────────────── */

export function PortalInlineLoading({
  message = "Loading…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <p
      className={cn("flex items-center gap-2 p-5 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
      {message}
    </p>
  );
}

export function PortalLoadingPanel({
  message = "Loading…",
  rows = 3,
  className,
}: {
  message?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <PortalPanel padding={false} className={cn("divide-y divide-border", className)} aria-busy="true">
      <PortalInlineLoading message={message} />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-3 px-5 py-5">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted/50" />
        </div>
      ))}
    </PortalPanel>
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
