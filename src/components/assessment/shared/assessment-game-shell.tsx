"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10 dark:border-white/10 dark:bg-[#070b13] dark:shadow-black/30">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/25 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
        <div className="flex flex-1 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] px-4 py-5 dark:bg-[linear-gradient(135deg,#050811_0%,#0b1220_100%)] sm:px-6 sm:py-6 xl:px-8">
          {children}
        </div>
      </div>
    </section>
  );
}
