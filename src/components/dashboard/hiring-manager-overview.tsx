"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Building,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Globe,
  LayoutDashboard,
  RefreshCw,
  Users,
} from "lucide-react";
import { DashboardInfoCard, dashboardInfoMetaClassName } from "@/components/dashboard/dashboard-info-card";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
  type HiringManagerCampaignListItem,
  type HiringManagerSessionListItem,
} from "@/services/hiring-manager-portal-client.service";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { PortalStatTile } from "@/components/dashboard/portal/portal-ui";
import {
  portalAlertErrorClass,
  portalIconWrapLgClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

function formatLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function HiringManagerOverview() {
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignListItem[]>([]);
  const [campaignDetails, setCampaignDetails] = useState<HiringManagerCampaignDetail[]>([]);
  const [sessions, setSessions] = useState<HiringManagerSessionListItem[]>([]);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    HiringManagerPortalClientService.getSessionsLastRefresh()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async (force = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const overview = await HiringManagerPortalClientService.getOverview({ force });
      setCampaigns(overview.campaigns);
      setCampaignDetails(overview.campaignDetails);
      setSessions(overview.sessions);
      setLastRefreshAt(HiringManagerPortalClientService.getSessionsLastRefresh());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Hiring-manager overview could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOverview(false);
  }, []);

  const metrics = useMemo(() => {
    const liveSessions = sessions.filter((session) => session.status === "Live").length;
    const upcomingSessions = sessions.filter((session) => session.status === "Upcoming").length;
    const joinedCandidates = sessions.reduce((total, session) => total + session.candidateCount, 0);
    const pendingApprovals = campaigns.filter((campaign) => campaign.approvalStatus === "Pending approval").length;
    const completedCandidates = campaignDetails.reduce(
      (total, campaign) =>
        total +
        campaign.joinedCandidates.filter((candidate) =>
          (candidate.results ?? []).some((result) => result.completedAt || result.numericScore !== null)
        ).length,
      0
    );

    return {
      liveSessions,
      upcomingSessions,
      joinedCandidates,
      pendingApprovals,
      completedCandidates,
    };
  }, [campaignDetails, campaigns, sessions]);

  const priorityCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => {
          const aPending = a.approvalStatus === "Pending approval" ? 0 : 1;
          const bPending = b.approvalStatus === "Pending approval" ? 0 : 1;
          return aPending - bPending || a.name.localeCompare(b.name);
        })
        .slice(0, 3),
    [campaigns]
  );

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status !== "Closed" && session.status !== "Cancelled")
        .slice(0, 6),
    [sessions]
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Hiring-manager overview"
        title="Overview"
        description="A quick operational view of campaign readiness, live sessions, candidate completion, and items needing review."
        icon={LayoutDashboard}
        notice={
          error ? (
            <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>
              {error}
            </p>
          ) : null
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadOverview(true)}
            disabled={isRefreshing}
            className="h-9 border-border text-foreground transition-colors hover:!bg-muted hover:!text-foreground dark:border-white/10 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatTile
          label="Campaigns"
          value={campaigns.length}
          detail="Configured campaign workspaces"
          icon={FolderKanban}
        />
        <PortalStatTile
          label="Live sessions"
          value={metrics.liveSessions}
          detail={`${metrics.upcomingSessions} upcoming`}
          icon={CalendarClock}
        />
        <PortalStatTile
          label="Candidates joined"
          value={metrics.joinedCandidates}
          detail={`${metrics.completedCandidates} with submitted results`}
          icon={Users}
        />
        <PortalStatTile
          label="Pending approvals"
          value={metrics.pendingApprovals}
          detail="Campaigns waiting on client review"
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <DashboardInfoCard interactive={false}>
          <CardHeader className="border-b border-border/50 pb-4 pl-6 dark:border-white/5">
            <CardTitle className="text-base font-bold text-foreground">Session queue</CardTitle>
            <p className="text-xs text-muted-foreground">{formatLastRefresh(lastRefreshAt)}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 pl-6">
            {upcomingSessions.length ? (
              upcomingSessions.map((session) => {
                const isRemote = session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") || session.location.toLowerCase().includes("http");
                const occupancyPercent = session.candidateLimit > 0 ? Math.min(100, Math.round((session.candidateCount / session.candidateLimit) * 100)) : 0;
                const countdown = (() => {
                  if (!session.startsAt) return null;
                  const diff = new Date(session.startsAt).getTime() - Date.now();
                  if (diff <= 0) return null;
                  const days = Math.floor(diff / 86400000);
                  const hours = Math.floor((diff % 86400000) / 3600000);
                  const mins = Math.floor((diff % 3600000) / 60000);
                  if (days > 0) return `in ${days}d ${hours}h`;
                  if (hours > 0) return `in ${hours}h ${mins}m`;
                  return `in ${mins}m`;
                })();
                return (
                  <div key={session.id} className={cn(portalPanelClass, "space-y-2 p-3")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{session.campaign}</p>
                        <p className="truncate text-xs text-muted-foreground">{session.date} · {session.location}</p>
                      </div>
                      <span className={dashboardInfoMetaClassName}>{session.status}</span>
                    </div>
                    {/* Occupancy bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-500" style={{ width: `${occupancyPercent}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{session.candidateCount}/{session.candidateLimit}</span>
                    </div>
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-md border-border/40 bg-background/50 px-1.5 py-0 text-[10px] font-semibold text-muted-foreground dark:border-white/5 dark:bg-white/[0.02] pointer-events-none gap-1">
                        {isRemote ? <Globe className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                        {isRemote ? "Remote" : "In-Person"}
                      </Badge>
                      {countdown && (
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {countdown}
                        </span>
                      )}
                      <span className="rounded border border-border/50 bg-muted/70 px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider text-muted-foreground dark:border-white/5 dark:bg-black/30 dark:text-slate-300">
                        {session.accessValue}
                      </span>
                      <Link
                        href="/hiring-manager-dashboard/sessions/"
                        className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        View details
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={cn(portalPanelClass, "flex items-center gap-2 border-dashed p-5 text-sm text-muted-foreground")}>
                <span className={portalIconWrapLgClass}>
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                No sessions need attention.
              </div>
            )}
          </CardContent>
        </DashboardInfoCard>

        <DashboardInfoCard interactive={false}>
          <CardHeader className="border-b border-border/50 pb-4 pl-6 dark:border-white/5">
            <CardTitle className="text-base font-bold text-foreground">Campaign focus</CardTitle>
            <p className="text-xs text-muted-foreground">Highest priority campaigns and their next milestone.</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 pl-6">
            {priorityCampaigns.length ? (
              priorityCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/hiring-manager-dashboard/campaigns/${campaign.id}/`}
                  className={cn(portalPanelClass, "block p-4 transition-colors hover:border-primary/30")}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${getStatusTone(campaign.status)} pointer-events-none`}>{campaign.status}</Badge>
                        {campaign.approvalStatus && (
                          <Badge variant="outline" className="rounded-md border-border bg-background px-2 py-0.5 text-xs text-muted-foreground dark:border-white/5 dark:bg-white/[0.03]">
                            {campaign.approvalStatus}
                          </Badge>
                        )}
                      </div>
                      <p className="font-bold text-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.role} · {campaign.candidateCount} candidates</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      {campaign.nextMilestone}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className={cn(portalPanelClass, "border-dashed p-5 text-sm text-muted-foreground")}>
                No campaigns have been created yet.
              </p>
            )}
          </CardContent>
        </DashboardInfoCard>
      </div>
    </div>
  );
}
