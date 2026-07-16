import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  portalIconWrapLgClass,
  portalPageHeaderClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

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
 * Shared page header for HM portal routes — unified flat layout matching other portals.
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
    <header className={portalPageHeaderClass}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className={cn(portalIconWrapLgClass, "mt-0.5")} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-primary">
              {eyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
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
          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
