"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  portalAssessmentShellBodyClass,
  portalAssessmentShellClass,
  portalAssessmentShellHeaderClass,
  portalIconWrapClass,
} from "@/components/dashboard/portal/portal-design-tokens";

type AssessmentGameShellProps = Readonly<{
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  status?: string;
  children: ReactNode;
}>;

export function AssessmentGameShell({
  icon: Icon,
  title,
  eyebrow = "Assessment",
  status,
  children,
}: AssessmentGameShellProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-[1840px] items-stretch justify-center px-2 py-4 sm:px-4 xl:px-6">
      <div className={portalAssessmentShellClass}>
        <div className={portalAssessmentShellHeaderClass}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={portalIconWrapClass}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-muted-foreground">
                {eyebrow}
              </p>
              <p className="mt-1 truncate text-lg font-semibold leading-6 text-foreground sm:text-xl">
                {title}
              </p>
            </div>
          </div>
          {status && (
            <Badge
              variant="outline"
              className="w-fit border-primary/30 bg-primary/5 text-primary"
            >
              {status}
            </Badge>
          )}
        </div>
        <div className={portalAssessmentShellBodyClass}>
          {children}
        </div>
      </div>
    </section>
  );
}
