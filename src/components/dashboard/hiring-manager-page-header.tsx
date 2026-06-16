import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type PortalPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: ReactNode;
  action?: ReactNode;
  notice?: ReactNode;
};

/**
 * Shared page header for HM / Client / Admin server routes.
 * Renders Lucide icons inline so server pages can pass icon components safely.
 */
export function HiringManagerPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  action,
  notice,
}: PortalPageHeaderProps) {
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {badge}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {notice ? <div className="pt-1">{notice}</div> : null}
          </div>
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
        ) : null}
      </div>
    </header>
  );
}
