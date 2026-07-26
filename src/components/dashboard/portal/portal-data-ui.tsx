import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  portalPanelClass,
  portalSupportingTextClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

export function PortalEntityHeader({
  eyebrow,
  title,
  description,
  status,
  metadata,
  action,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  status?: ReactNode;
  metadata?: readonly { label: string; value: ReactNode }[];
  action?: ReactNode;
}>) {
  return (
    <header className="space-y-4 border-b border-border pb-5 sm:pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {status}
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {metadata?.length ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {metadata.map((item) => (
            <div key={item.label} className="flex min-w-0 items-baseline gap-2 text-sm">
              <dt className="font-medium text-muted-foreground">{item.label}</dt>
              <dd className="font-semibold text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}

const statusStyles = {
  neutral: "border-border bg-muted/40 text-foreground",
  active: "border-primary/35 bg-primary/10 text-primary",
  attention: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  complete: "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

export function PortalStatusBadge({
  label,
  tone = "neutral",
}: Readonly<{
  label: string;
  tone?: keyof typeof statusStyles;
}>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-sm border px-2 py-0.5 text-xs font-semibold",
        statusStyles[tone],
      )}
    >
      {label}
    </span>
  );
}

export type PortalWorkQueueItem = Readonly<{
  id: string;
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
  priority: "critical" | "attention" | "routine";
  dueLabel?: string;
}>;

const priorityIcon = {
  critical: AlertCircle,
  attention: Clock3,
  routine: CheckCircle2,
} as const;

export function PortalWorkQueue({
  title = "Decision trail",
  description,
  items,
  emptyTitle = "Nothing needs attention",
  emptyDescription = "New decisions and exceptions will appear here.",
}: Readonly<{
  title?: string;
  description: string;
  items: readonly PortalWorkQueueItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}>) {
  const headingId = `work-queue-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className={cn("mt-1", portalSupportingTextClass)}>{description}</p>
      </div>
      <div className={cn(portalPanelClass, "overflow-hidden border-l-2 border-l-primary/70")}>
        {items.length === 0 ? (
          <div className="flex min-h-28 items-start gap-3 p-5" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">{emptyTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item) => {
              const PriorityIcon = priorityIcon[item.priority];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group grid min-h-[5.5rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors duration-150 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-primary">
                      <PriorityIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Why:</span> {item.reason}
                      </span>
                      {item.dueLabel ? (
                        <span className="mt-1 block text-xs font-medium tabular-nums text-muted-foreground">
                          {item.dueLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">
                      <span className="hidden sm:inline">{item.actionLabel}</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export type PortalDataColumn<Row> = Readonly<{
  key: string;
  header: string;
  className?: string;
  render: (row: Row) => ReactNode;
}>;

export function PortalDataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: Readonly<{
  caption: string;
  columns: readonly PortalDataColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  empty: ReactNode;
}>) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={cn(portalPanelClass, "overflow-x-auto")}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-muted/30">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("px-4 py-3 text-xs font-semibold text-muted-foreground", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors duration-150 hover:bg-muted/25">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-3 align-top text-foreground", column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PortalFilterBar({
  label,
  children,
  resultSummary,
}: Readonly<{
  label: string;
  children: ReactNode;
  resultSummary?: ReactNode;
}>) {
  return (
    <section aria-label={label} className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{children}</div>
      {resultSummary ? (
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground" aria-live="polite">
          {resultSummary}
        </p>
      ) : null}
    </section>
  );
}

export function PortalErrorState({
  title,
  description,
  onRetry,
}: Readonly<{
  title: string;
  description: string;
  onRetry?: () => void;
}>) {
  return (
    <div className={cn(portalPanelClass, "flex items-start gap-3 border-destructive/35 p-5")} role="alert">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {onRetry ? (
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
