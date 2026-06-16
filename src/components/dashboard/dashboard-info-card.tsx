import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";

type DashboardInfoCardProps = React.ComponentProps<typeof Card> & {
  /** @deprecated Accents removed — all cards use the unified portal panel style */
  accent?: string;
  interactive?: boolean;
  /** @deprecated */
  showAccent?: boolean;
};

export const dashboardInfoPillClassName =
  "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/35 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]";

export const dashboardInfoMetaClassName =
  "rounded-lg border border-border/60 bg-muted/35 px-2.5 py-1 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]";

export function DashboardInfoCard({
  interactive = true,
  className,
  children,
  ...props
}: DashboardInfoCardProps) {
  return (
    <Card
      className={cn(
        portalPanelClass,
        "backdrop-blur-sm",
        interactive && "transition-[border-color,box-shadow] hover:border-primary/20 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
