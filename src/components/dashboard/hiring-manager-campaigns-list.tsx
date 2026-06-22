"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  RefreshCw,
  Target,
  Plus,
} from "lucide-react";
import {
  DashboardInfoCard,
  dashboardInfoPillClassName,
} from "@/components/dashboard/dashboard-info-card";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { portalAlertErrorClass, portalBadgeClass, portalPrimaryButtonClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";

function formatLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getAssessmentVersionSummary(settings?: Record<string, unknown> | null) {
  if (!settings || typeof settings !== "object") return [];

  return Object.entries(settings)
    .filter(([key, value]) => key !== "weights" && value && typeof value === "object")
    .map(([key, value]) => {
      const config = value as { version?: unknown };
      return {
        key,
        label: `${key.replace(/-/g, " ")} v${String(config.version ?? "1.0.0")}`,
      };
    });
}

export function HiringManagerCampaignsList() {
  const { campaigns, error, lastRefreshAt, loading, loadOverview } = useHiringManagerPortal();
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);

  const handleRefresh = async (force = false) => {
    if (!force) {
      await loadOverview(true);
      return;
    }

    const startTime = Date.now();
    setIsForceRefreshing(true);
    try {
      await loadOverview(true);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const minSpin = 800;
      if (elapsedTime < minSpin) {
        await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
      }
      setIsForceRefreshing(false);
    }
  };

  const isRefreshing = loading || isForceRefreshing;

  const refreshLabel = useMemo(
    () => `Last refresh: ${formatLastRefresh(lastRefreshAt)}`,
    [lastRefreshAt]
  );

  return (
    <div className="space-y-5">
      {/* Active Campaigns Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Active Campaigns</h2>
            <Badge variant="secondary" className="rounded-full border-none bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {campaigns.length}
            </Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground mt-0.5">{refreshLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRefresh(true)}
            disabled={isRefreshing}
            className="h-10 border-border bg-transparent text-foreground transition-colors hover:!bg-muted hover:!text-foreground dark:border-white/10 dark:text-slate-300 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            asChild
            className={cn(portalPrimaryButtonClass, "h-10")}
          >
            <Link href="/hiring-manager-dashboard/campaigns/create/?returnTo=/hiring-manager-dashboard/campaigns/">
              <Plus className="mr-2 h-4 w-4" />
              Create campaign
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>
          {error}
        </p>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <DashboardInfoCard interactive={false} className="border-dashed">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No campaigns have been created yet. Create a campaign to attach
              assessments and generate candidate Access Codes.
            </CardContent>
          </DashboardInfoCard>
        ) : (
          campaigns.map((campaign) => (
            <DashboardInfoCard key={campaign.id}>
              <CardContent className="space-y-4 p-5 pl-7">
                <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${getStatusTone(campaign.status)} pointer-events-none`}>
                      {campaign.status}
                    </Badge>
                    <Badge className="pointer-events-none rounded-md border-border/55 bg-muted/40 text-xs text-muted-foreground hover:bg-muted/40 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.03]">
                      {campaign.deliveryMode}
                    </Badge>
                    {campaign.approvalStatus && (
                      <Badge className={cn(portalBadgeClass, "pointer-events-none border-none text-xs font-semibold")}>
                        {campaign.approvalStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary shadow-sm w-fit">
                    <Target className="h-3.5 w-3.5 shrink-0 text-primary animate-pulse" />
                    <span className="font-semibold">{campaign.nextMilestone}</span>
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <h2 className="break-words text-lg font-bold leading-snug text-foreground">
                    {campaign.name}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    {campaign.role} · {campaign.candidateCount} candidate{campaign.candidateCount === 1 ? "" : "s"} ·{" "}
                    {campaign.sessions} session{campaign.sessions === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="pt-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">{campaign.assessmentStack.length} assessment{campaign.assessmentStack.length === 1 ? "" : "s"}</span>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(() => {
                      const versionSummary = getAssessmentVersionSummary(campaign.assessmentSettings);
                      const maxVisible = 3;
                      const visibleStack = campaign.assessmentStack.slice(0, maxVisible);
                      const hiddenCount = campaign.assessmentStack.length - maxVisible;
                      return (
                        <>
                          {visibleStack.map((item) => {
                            const Icon = getAssessmentCatalogueIcon(item);
                            const matchedVersion = versionSummary.find((v) =>
                              v.key.replace(/-/g, "").toLowerCase().includes(item.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")) ||
                              item.toLowerCase().replace(/\s+/g, "").replace(/-/g, "").includes(v.key.replace(/-/g, "").toLowerCase())
                            );
                            const displayLabel = matchedVersion
                              ? `${item} v${String((matchedVersion.label.match(/v(.+)$/)?.[1]) ?? "1")}`
                              : item;
                            return (
                              <span key={item} className="inline-flex items-center gap-1 rounded-md border border-border/55 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300">
                                <Icon className="h-3 w-3 text-primary/75 shrink-0" />
                                {displayLabel}
                              </span>
                            );
                          })}
                          {hiddenCount > 0 && (
                            <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:border-white/5 dark:bg-white/[0.02]">
                              +{hiddenCount} more
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    className="group h-9 rounded-md border-border bg-background/50 px-3.5 text-xs font-medium text-foreground transition-colors hover:!bg-muted hover:!text-foreground hover:border-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-100 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
                    asChild
                  >
                    <Link href={`/hiring-manager-dashboard/campaigns/${campaign.id}/`}>
                      View More
                      <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </DashboardInfoCard>
          ))
        )}
      </div>
    </div>
  );
}
