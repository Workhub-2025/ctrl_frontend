"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { KeyRound, Loader2 } from "lucide-react";
import {
  hasAvailableAssessment,
  statusBadgeClassName,
  statusDotClassName,
  type CandidateApplicationView,
  type CandidateApplicationStatus,
} from "@/lib/candidate/portal";
import { portalPanelClass, portalIconWrapLgClass, portalAlertErrorClass, portalAlertInfoClass } from "@/components/dashboard/portal/portal-design-tokens";

export const candidateEyebrowClassName =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-primary";

export function CandidateEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn(candidateEyebrowClassName, className)}>{children}</p>
  );
}

export function CandidatePageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  notice,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <header className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className={cn(portalIconWrapLgClass, "mt-0.5")} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <CandidateEyebrow>{eyebrow}</CandidateEyebrow>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {title}
            </h1>
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

export function CandidatePanel({
  children,
  className,
  accent: _accent,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  /** @deprecated Accents removed — all panels use the unified portal style */
  accent?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn(portalPanelClass, padding && "p-5", className)}>{children}</div>
  );
}

export function CandidateSectionHeader({
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
        "flex flex-wrap items-end justify-between gap-3",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? <CandidateEyebrow>{eyebrow}</CandidateEyebrow> : null}
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

export function CandidateMetaChip({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  mono?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-xl border px-3 py-2.5",
        highlight
          ? "border-primary/25 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
          : "border-border/70 bg-muted/30 dark:border-white/5 dark:bg-white/[0.02]",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {Icon ? (
          <Icon className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
        ) : null}
        {label}
      </span>
      <span
        className={cn(
          "truncate text-sm font-medium text-foreground",
          mono && "font-mono text-xs tracking-wide"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function CandidateStatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone: _tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  /** @deprecated Tones removed — all stat tiles use the unified style */
  tone?: "default" | "attention" | "success";
}) {
  return (
    <CandidatePanel>
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
        <span className={portalIconWrapLgClass}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </CandidatePanel>
  );
}

export function CandidateAccessCodeForm({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  success,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
  error?: string;
  success?: string;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-2", compact ? "max-w-md" : "max-w-lg")}
    >
      <div className={cn("flex gap-2", compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row")}>
        <div className="relative min-w-0 flex-1">
          <KeyRound
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="accessCode"
            autoComplete="off"
            spellCheck={false}
            aria-label="Access Code"
            placeholder="e.g. CTRL-9A2X"
            className="h-11 rounded-xl border-border bg-background pl-10 font-mono uppercase tracking-widest focus-visible:ring-primary dark:border-white/10"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !value.trim()}
          className="h-11 shrink-0 rounded-xl px-6 font-semibold"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            "Link session"
          )}
        </Button>
      </div>
      {error ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-primary">{success}</p>
      ) : null}
    </form>
  );
}

export function CandidateLinkSessionPanel({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  success,
  compactTitle = "Link another session",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
  error?: string;
  success?: string;
  compactTitle?: string;
}) {
  return (
    <CandidatePanel>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <CandidateEyebrow>Access code</CandidateEyebrow>
          <h3 className="font-display text-base font-semibold text-foreground">
            {compactTitle}
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter a code from your hiring team to connect an assessment session.
          </p>
        </div>
        <CandidateAccessCodeForm
          compact
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          error={error}
          success={success}
        />
      </div>
    </CandidatePanel>
  );
}

export function CandidateEmptyState({
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

export function CandidateSessionListItem({
  app,
  isSelected,
  onSelect,
}: {
  app: CandidateApplicationView;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const needsAction = hasAvailableAssessment(app);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected
          ? "border-primary/45 bg-primary/10 shadow-md ring-1 ring-primary/20"
          : "border-border/70 bg-background/50 hover:border-primary/30 hover:bg-muted/20 dark:border-white/10 dark:bg-white/[0.02]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              statusDotClassName(app.status)
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground">
              {app.campaign}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {app.role}
            </p>
          </div>
        </div>
        <span className={statusBadgeClassName(app.status)}>{app.status}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{app.date}</span>
        <span className="font-semibold tabular-nums text-foreground">
          {app.completedCount}/{app.totalCount}
        </span>
      </div>
      <Progress
        value={app.completionPercent}
        className={cn("mt-2 h-1.5", isSelected && "bg-primary/20")}
      />
      {needsAction ? (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Action required
        </p>
      ) : null}
    </button>
  );
}

export function CandidateStatusBanner({
  status,
  title,
  children,
}: {
  status: CandidateApplicationStatus;
  title?: string;
  children: ReactNode;
}) {
  const alertClass =
    status === "Unsuccessful"
      ? portalAlertErrorClass
      : portalAlertInfoClass;

  return (
    <div className={cn(alertClass, "text-sm leading-relaxed")}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1 text-muted-foreground" : undefined}>{children}</div>
    </div>
  );
}

export function CandidateProgressHeader({
  completed,
  total,
  percent,
  label = "Overall progress",
}: {
  completed: number;
  total: number;
  percent: number;
  label?: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 dark:border-white/5 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-display font-semibold tabular-nums text-foreground">
          {completed} / {total} submitted
        </span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">{percent}% complete</p>
    </div>
  );
}

export function CandidateQuickLink({
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

export type CandidateSessionContext = {
  campaign?: string;
  accessCode?: string;
  sessionName?: string;
  sessionKey?: string;
  role?: string;
};

export function buildSessionContext(
  app: CandidateApplicationView
): CandidateSessionContext {
  return {
    campaign: app.campaign,
    accessCode: app.code,
    sessionName: app.assessmentSessionName ?? undefined,
    sessionKey: app.key,
    role: app.role,
  };
}
