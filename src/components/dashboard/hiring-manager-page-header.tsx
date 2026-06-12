import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type PortalPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Optional single badge/action rendered to the right of the title row */
  badge?: ReactNode;
  /** Optional action button(s) aligned to the right of the header */
  action?: ReactNode;
  /** Optional notice/alert rendered below the description */
  notice?: ReactNode;
};

/** Slim page-level header used across all portals (Client, HM, Candidate). */
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
    <div className="relative pb-6 mb-6 border-b border-border/40 dark:border-white/5 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: icon + text */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm mt-0.5 transition-transform duration-300 hover:scale-105">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">
                {title}
              </h1>
              {badge}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground/80 max-w-3xl pt-0.5">
              {description}
            </p>
            {notice && <div className="pt-1">{notice}</div>}
          </div>
        </div>

        {/* Right: action */}
        {action && (
          <div className="flex shrink-0 items-center gap-2 sm:pt-1">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
