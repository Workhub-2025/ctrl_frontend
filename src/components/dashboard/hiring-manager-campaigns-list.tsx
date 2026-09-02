"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FolderKanban,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HmErrorBanner } from "@/components/dashboard/hiring-manager-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalPrimaryButtonClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { formatPortalLastRefresh } from "@/lib/hiring-manager/format-portal-last-refresh";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import { getAssessmentSettingsSummary } from "@/lib/hiring-manager/assessment-settings-display";
import { canCreateSessionForCampaign } from "@/lib/hiring-manager/campaign-session-approval";

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
    () => formatPortalLastRefresh(lastRefreshAt),
    [lastRefreshAt]
  );

  return (
    <div className="space-y-5">
      <PortalSectionHeader
        title="Active campaigns"
        description={refreshLabel}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRefresh(true)}
              disabled={isRefreshing}
              className="h-9 rounded-lg"
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isRefreshing && "motion-safe:animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button type="button" asChild className={cn(portalPrimaryButtonClass, "h-9")}>
              <Link href="/hiring-manager-dashboard/campaigns/create">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create campaign
              </Link>
            </Button>
          </div>
        }
      />

      {error ? <HmErrorBanner>{error}</HmErrorBanner> : null}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          // The header already carries a Create campaign action; a second one
          // here reads as two competing calls to action on an empty page.
          <PortalEmptyState
            icon={FolderKanban}
            title="No campaigns yet"
            description="Create a campaign to attach assessments and generate candidate access codes."
          />
        ) : (
          campaigns.map((campaign) => (
            <PortalPanel key={campaign.id} className="space-y-4">
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${getStatusTone(campaign.status)} pointer-events-none`}>
                    {campaign.status}
                  </Badge>
                  <Badge className={cn(portalBadgeClass, "pointer-events-none text-xs hover:bg-muted/40")}>
                    {campaign.deliveryMode}
                  </Badge>
                  {campaign.approvalStatus ? (
                    <Badge className={cn(portalBadgeClass, "pointer-events-none border-none text-xs font-semibold")}>
                      {campaign.approvalStatus}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex w-fit items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary shadow-sm">
                  <Target className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="font-semibold">{campaign.nextMilestone}</span>
                </div>
              </div>

              <div className="min-w-0 space-y-1">
                <h2 className="break-words text-lg font-bold leading-snug text-foreground">
                  {campaign.name}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {campaign.role} · {campaign.candidateCount} candidate
                  {campaign.candidateCount === 1 ? "" : "s"} · {campaign.sessions} session
                  {campaign.sessions === 1 ? "" : "s"}
                </p>
              </div>

              <div className="pt-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {campaign.assessmentStack.length} assessment
                  {campaign.assessmentStack.length === 1 ? "" : "s"}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const versionSummary = getAssessmentSettingsSummary(campaign.assessmentSettings);
                    const maxVisible = 3;
                    const visibleStack = campaign.assessmentStack.slice(0, maxVisible);
                    const hiddenCount = campaign.assessmentStack.length - maxVisible;
                    return (
                      <>
                        {visibleStack.map((item) => {
                          const Icon = getAssessmentCatalogueIcon(item);
                          const matchedVersion = versionSummary.find(
                            (v) =>
                              v.key.replace(/-/g, "").toLowerCase().includes(item.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")) ||
                              item.toLowerCase().replace(/\s+/g, "").replace(/-/g, "").includes(v.key.replace(/-/g, "").toLowerCase())
                          );
                          const displayLabel = matchedVersion
                            ? `${item} v${String(matchedVersion.label.match(/v(.+)$/)?.[1] ?? "1")}`
                            : item;
                          return (
                            <span
                              key={item}
                              className={cn(
                                portalBadgeClass,
                                "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold"
                              )}
                            >
                              <Icon className="h-3 w-3 shrink-0 text-primary/75" />
                              {displayLabel}
                            </span>
                          );
                        })}
                        {hiddenCount > 0 ? (
                          <span className={cn(portalBadgeClass, "px-2 py-0.5 text-[10px] font-semibold")}>
                            +{hiddenCount} more
                          </span>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {canCreateSessionForCampaign(campaign.approvalStatus) && campaign.sessions === 0 ? (
                  <Button asChild className={cn(portalPrimaryButtonClass, "h-9")}>
                    <Link
                      href={
                        "/hiring-manager-dashboard/campaigns/" +
                        encodeURIComponent(campaign.documentId ?? campaign.id) +
                        "?tab=sessions&create=1"
                      }
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Create session
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="group h-9 rounded-md border-border bg-background/50 px-3.5 text-xs font-medium text-foreground transition-colors hover:!bg-muted hover:!text-foreground hover:border-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:hover:!bg-white/[0.08] dark:hover:!text-white"
                  asChild
                >
                  <Link href={`/hiring-manager-dashboard/campaigns/${campaign.id}`}>
                    View more
                    <ArrowRight
                      className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              </div>
            </PortalPanel>
          ))
        )}
      </div>
    </div>
  );
}
