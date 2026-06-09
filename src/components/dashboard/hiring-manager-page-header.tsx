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
    <section className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm dark:border-white/10 dark:bg-[#080c16]/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: icon + text */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm mt-0.5">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {title}
              </h1>
              {badge}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
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
    </section>
  );
}
