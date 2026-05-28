import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type HiringManagerPageHeaderStat = {
  icon: LucideIcon;
  label: string;
};

type HiringManagerPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  stats?: HiringManagerPageHeaderStat[];
  action?: ReactNode;
  notice?: ReactNode;
};

export function HiringManagerPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  stats = [],
  action,
  notice,
}: HiringManagerPageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-primary/15 bg-card shadow-md shadow-primary/5 ring-1 ring-primary/5 dark:border-white/10 dark:bg-[#080c16] dark:shadow-black/20">
      <div className="relative grid gap-0 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="relative z-10 space-y-5 p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
              <p className="text-sm text-muted-foreground">
                Hiring Manager Portal
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-headline text-foreground sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {stats.length > 0 && (
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {stats.map((stat) => (
                <span
                  key={stat.label}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.04]"
                >
                  <stat.icon className="h-4 w-4 text-primary" />
                  {stat.label}
                </span>
              ))}
            </div>
          )}

          {notice}
        </div>

        {action && (
          <div className="relative z-10 flex flex-col justify-end border-t border-border bg-muted/50 p-6 dark:border-white/5 dark:bg-white/[0.04] lg:border-l lg:border-t-0">
            <div className="mt-auto flex flex-wrap items-center gap-2">
              {action}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
