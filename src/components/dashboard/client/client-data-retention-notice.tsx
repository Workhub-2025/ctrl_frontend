"use client";

import { Clock3 } from "lucide-react";
import { PortalPanel } from "@/components/dashboard/portal/portal-ui";
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { formatRetentionPeriod } from "@/lib/legal/retention-format";
import type { BackendClientEntitlements } from "@/services/client-upgrade.service";
import { cn } from "@/lib/utils";

export function ClientDataRetentionNotice({
  entitlements,
  className,
}: {
  entitlements: BackendClientEntitlements | null;
  className?: string;
}) {
  const retention = entitlements?.dataRetention;
  if (!retention?.effectiveMonths) return null;

  const isCustom =
    retention.contractConfiguredMonths != null
    && retention.contractConfiguredMonths !== retention.platformDefaultMonths;

  return (
    <PortalPanel className={cn("p-0", className)}>
      <div className={cn(portalPanelClass, "flex gap-4 p-5")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <Clock3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">Assessment data retention</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Completed candidate assessment data for your organisation is retained for{" "}
            <span className="font-medium text-foreground">
              {formatRetentionPeriod(retention.effectiveMonths)}
            </span>{" "}
            from the date each session is completed, then automatically purged in line with your
            contract and our privacy policy.
          </p>
          {isCustom ? (
            <p className="text-xs text-muted-foreground">
              Your contract specifies a custom retention period. Contact CTRL support if you need to
              discuss changes.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              This follows the CTRL platform default retention period.
            </p>
          )}
        </div>
      </div>
    </PortalPanel>
  );
}
