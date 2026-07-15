import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  portalCardClass,
  portalCardInteractiveClass,
} from "@/components/dashboard/portal/portal-design-tokens";

type DashboardInfoCardProps = React.ComponentProps<typeof Card> & {
  /** @deprecated Accents removed — all cards use the unified portal panel style */
  accent?: string;
  interactive?: boolean;
  /** @deprecated */
  showAccent?: boolean;
};

export const dashboardInfoPillClassName =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/35 px-2.5 py-1 text-xs font-medium text-muted-foreground";

export const dashboardInfoMetaClassName =
  "rounded-md border border-border bg-muted/35 px-2.5 py-1 text-xs font-semibold text-muted-foreground";

export function DashboardInfoCard({
  interactive = false,
  className,
  children,
  ...props
}: DashboardInfoCardProps) {
  return (
    <Card
      className={cn(
        interactive ? portalCardInteractiveClass : portalCardClass,
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
