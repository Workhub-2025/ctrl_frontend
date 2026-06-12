import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentClassNames = {
  primary: "from-primary to-indigo-500",
  campaign: "from-cyan-500 to-indigo-500",
  session: "from-indigo-500 to-sky-500",
  assessment: "from-primary to-violet-500",
  success: "from-emerald-500 to-teal-400",
  warning: "from-amber-500 to-orange-500",
  muted: "from-slate-400 to-slate-600",
} as const;

type DashboardInfoCardAccent = keyof typeof accentClassNames;

type DashboardInfoCardProps = React.ComponentProps<typeof Card> & {
  accent?: DashboardInfoCardAccent;
  interactive?: boolean;
  showAccent?: boolean;
};

export const dashboardInfoPillClassName =
  "inline-flex items-center gap-1.5 rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300";

export const dashboardInfoMetaClassName =
  "rounded-lg border border-border/55 bg-background/45 px-2.5 py-1 text-xs font-semibold text-muted-foreground dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300";

export function DashboardInfoCard({
  accent = "primary",
  interactive = true,
  showAccent = true,
  className,
  children,
  ...props
}: DashboardInfoCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/55 bg-card/55 shadow-sm backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300 dark:border-white/5 dark:bg-[#0b1329]/25",
        interactive && "hover:border-primary/25 hover:shadow-md dark:hover:border-primary/30",
        className
      )}
      {...props}
    >
      {showAccent && (
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b",
            accentClassNames[accent]
          )}
        />
      )}
      {children}
    </Card>
  );
}
