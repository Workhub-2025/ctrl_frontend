"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import {
  PortalDecisionLedger,
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalIconWrapLgClass,
  portalPanelClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { HmErrorBanner } from "@/components/dashboard/hiring-manager-portal-ui";
import { getHmSessionDisplayName } from "@/lib/hiring-manager/session-display";
import { cn } from "@/lib/utils";
import { formatPortalLastRefresh } from "@/lib/hiring-manager/format-portal-last-refresh";

export function HiringManagerOverview() {
  const {
    campaigns,
    campaignDetails,
    sessions,
    loading: isRefreshing,
    error,
    lastRefreshAt,
    loadOverview,
  } = useHiringManagerPortal();

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
        notice={error ? <HmErrorBanner>{error}</HmErrorBanner> : undefined}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadOverview(true)}
            disabled={isRefreshing}
            className="h-10 border-border text-foreground hover:bg-muted hover:text-foreground"
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
        <PortalPanel padding={false} className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <PortalSectionHeader
              title="Session queue"
              description={formatPortalLastRefresh(lastRefreshAt)}
            />
          </div>
          <div className="space-y-3 p-5">
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-foreground">{getHmSessionDisplayName(session)}</p>
                        <p className="break-words text-[0.8125rem] leading-relaxed text-muted-foreground">{session.campaign} · {session.date} · {session.location}</p>
                      </div>
                      <span className={portalBadgeClass}>{session.status}</span>
                    </div>
                    {/* Occupancy bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                        <div className={portalProgressBarClass} style={{ width: `${occupancyPercent}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{session.candidateCount}/{session.candidateLimit}</span>
                    </div>
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn(portalBadgeClass, "pointer-events-none gap-1 px-1.5 py-0 text-[10px] font-semibold")}>
                        {isRemote ? <Globe className="h-3 w-3" aria-hidden="true" /> : <Building className="h-3 w-3" aria-hidden="true" />}
                        {isRemote ? "Remote" : "In-Person"}
                      </Badge>
                      {countdown && (
                        <span className={cn(portalBadgeClass, "px-1.5 py-0 text-[10px]")}>
                          {countdown}
                        </span>
                      )}
                      <span className={cn(portalBadgeClass, "px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider")}>
                        {session.accessValue}
                      </span>
                      <Link
                        href={`/hiring-manager-dashboard/sessions/${session.id}`}
                        className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-sm text-[10px] font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        View details
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <PortalEmptyState
                icon={CheckCircle2}
                title="No sessions need attention"
                description="Upcoming and live sessions will appear here when scheduled."
              />
            )}
          </div>
        </PortalPanel>

        <PortalDecisionLedger
          title="Campaign focus"
          description="Highest-priority campaigns and the next operational milestone."
          items={priorityCampaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.name,
            detail: `${campaign.role} · ${campaign.candidateCount} candidates · ${campaign.approvalStatus || campaign.status}`,
            href: `/hiring-manager-dashboard/campaigns/${campaign.id}/`,
            meta: campaign.nextMilestone,
            actionLabel: "Open",
          }))}
          emptyTitle="No campaigns created"
          emptyDescription="Create a campaign when the role and assessment requirements are ready."
        />
      </div>
    </div>
  );
}
