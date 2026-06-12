"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
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
        .slice(0, 4),
    [sessions]
  );

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Hiring-manager overview"
        title="Overview"
        description="A quick operational view of campaign readiness, live sessions, candidate completion, and items needing review."
        icon={LayoutDashboard}
        notice={
          error ? (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
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
        <OverviewMetric title="Campaigns" value={campaigns.length} detail="Configured campaign workspaces" icon={FolderKanban} />
        <OverviewMetric title="Live sessions" value={metrics.liveSessions} detail={`${metrics.upcomingSessions} upcoming`} icon={CalendarClock} accent="success" />
        <OverviewMetric title="Candidates joined" value={metrics.joinedCandidates} detail={`${metrics.completedCandidates} with submitted results`} icon={Users} accent="session" />
        <OverviewMetric title="Pending approvals" value={metrics.pendingApprovals} detail="Campaigns waiting on client review" icon={ClipboardList} accent="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardInfoCard accent="campaign" interactive={false}>
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
                  className="block rounded-xl border border-border/55 bg-background/35 p-4 transition-colors hover:border-primary/25 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-primary/30"
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
              <p className="rounded-xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.01]">
                No campaigns have been created yet.
              </p>
            )}
          </CardContent>
        </DashboardInfoCard>

        <DashboardInfoCard accent="session" interactive={false}>
          <CardHeader className="border-b border-border/50 pb-4 pl-6 dark:border-white/5">
            <CardTitle className="text-base font-bold text-foreground">Session queue</CardTitle>
            <p className="text-xs text-muted-foreground">{formatLastRefresh(lastRefreshAt)}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 pl-6">
            {upcomingSessions.length ? (
              upcomingSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-border/55 bg-background/35 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{session.campaign}</p>
                      <p className="truncate text-xs text-muted-foreground">{session.date} · {session.location}</p>
                    </div>
                    <span className={dashboardInfoMetaClassName}>{session.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.01]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                No sessions need attention.
              </div>
            )}
          </CardContent>
        </DashboardInfoCard>
      </div>
    </div>
  );
}

function OverviewMetric({
  title,
  value,
  detail,
  icon: Icon,
  accent = "primary",
}: {
  title: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "session" | "warning";
}) {
  return (
    <DashboardInfoCard accent={accent}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-2 pl-6">
        <div className="text-3xl font-extrabold text-foreground">{value}</div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </CardContent>
    </DashboardInfoCard>
  );
}
