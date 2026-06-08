"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, RefreshCw } from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignListItem,
} from "@/services/hiring-manager-portal-client.service";

function formatLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function HiringManagerCampaignsList() {
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    HiringManagerPortalClientService.getCampaignsLastRefresh()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCampaigns = async (force = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await HiringManagerPortalClientService.getCampaigns({ force });
      setCampaigns(data);
      setLastRefreshAt(HiringManagerPortalClientService.getCampaignsLastRefresh());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaigns could not be loaded."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCampaigns(false);
  }, []);

  const refreshLabel = useMemo(
    () => `Last refresh: ${formatLastRefresh(lastRefreshAt)}`,
    [lastRefreshAt]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">{refreshLabel}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => loadCampaigns(true)}
          disabled={isRefreshing}
          className="w-fit"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No campaigns have been created yet. Create a campaign to attach
              assessments and generate candidate Access Codes.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="rounded-[1.25rem] border border-border bg-card shadow-sm transition-colors hover:border-primary/30 dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none"
            >
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getStatusTone(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <Badge className="rounded-md border-border bg-background text-xs text-muted-foreground hover:bg-background dark:border-white/10 dark:bg-white/[0.03]">
                        {campaign.deliveryMode}
                      </Badge>
                      {campaign.approvalStatus && (
                        <Badge
                          className={
                            campaign.approvalStatus === "Pending approval"
                              ? "rounded-md border-orange-500/20 bg-orange-500/10 text-xs text-orange-600 hover:bg-orange-500/10"
                              : campaign.approvalStatus === "Rejected"
                                ? "rounded-md border-red-500/20 bg-red-500/10 text-xs text-red-600 hover:bg-red-500/10"
                                : "rounded-md border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-600 hover:bg-emerald-500/10"
                          }
                        >
                          {campaign.approvalStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h2 className="break-words text-base font-semibold leading-snug text-foreground">
                        {campaign.name}
                      </h2>
                      <p className="text-sm leading-5 text-muted-foreground">
                        {campaign.role} · {campaign.candidateCount} candidates ·{" "}
                        {campaign.sessions} session{campaign.sessions === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
                    {campaign.nextMilestone}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[1fr_0.95fr]">
                  <div className="rounded-xl border border-border bg-background p-3 shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Assessment stack
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.assessmentStack.map((item) => (
                        <span
                          key={item}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Session readiness
                    </p>
                    <div className="mt-3 rounded-lg border border-border bg-card p-3 dark:border-white/10 dark:bg-[#04070d]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium leading-snug text-foreground">
                            {campaign.sessions} Access Code{campaign.sessions === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                            {campaign.nextMilestone}
                          </p>
                        </div>
                        <Badge className="shrink-0 rounded-md border-primary/20 bg-primary/10 text-xs text-primary hover:bg-primary/10">
                          Ready
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href={`/hiring-manager-dashboard/campaigns/${campaign.id}/`}>
                      Open campaign view
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
