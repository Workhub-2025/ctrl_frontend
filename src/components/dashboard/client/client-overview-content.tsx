"use client";

import {
  Building2,
  ClipboardCheck,
  KeyRound,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import {
  PortalNavCard,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import { useClientPortal } from "@/hooks/use-client-portal";
import { cn } from "@/lib/utils";

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-600 dark:text-red-200">
      {message}
    </p>
  );
}

export function ClientOverviewContent() {
  const {
    summary,
    loading,
    error,
    pendingCampaigns,
    pendingSharedCandidates,
    loadOverview,
  } = useClientPortal();

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <HiringManagerPageHeader
        eyebrow="Client workspace"
        title={summary?.client?.name ?? "Client Portal"}
        description="Review hiring-manager capacity, campaign approvals, and candidate progression from one place."
        icon={Building2}
        notice={error ? <ErrorBanner message={error} /> : null}
        action={
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-border text-foreground transition-colors hover:!bg-muted hover:!text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
            onClick={() => void loadOverview(true)}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "motion-safe:animate-spin text-primary")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatTile
          label="Hiring manager seats"
          value={summary ? `${summary.seats.used}/${summary.seats.limit}` : "…"}
          detail={
            summary
              ? `${summary.seats.available} seat${summary.seats.available === 1 ? "" : "s"} available`
              : "Loading seat capacity…"
          }
          icon={Users}
        />
        <PortalStatTile
          label="Available invites"
          value={summary?.availableAccessCodes ?? "…"}
          detail="Unused hiring-manager invite codes"
          icon={KeyRound}
          tone="success"
        />
        <PortalStatTile
          label="Campaign approvals"
          value={summary?.campaignsPendingApproval ?? pendingCampaigns.length}
          detail="Campaigns waiting for your review"
          icon={ClipboardCheck}
          tone={(summary?.campaignsPendingApproval ?? 0) > 0 ? "attention" : "default"}
        />
        <PortalStatTile
          label="Candidates pending review"
          value={summary?.candidatesPendingReview ?? pendingSharedCandidates.length}
          detail="Shared candidates awaiting a decision"
          icon={UserCheck}
          tone={(summary?.candidatesPendingReview ?? 0) > 0 ? "attention" : "default"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalNavCard
          href="/client-dashboard/hiring-managers/"
          icon={Users}
          title="Hiring managers"
          description="Manage seat access, invite codes, and hiring-manager workspaces."
          metric={summary ? `${summary.seats.used}/${summary.seats.limit}` : undefined}
          accent="primary"
        />
        <PortalNavCard
          href="/client-dashboard/progressed/"
          icon={ClipboardCheck}
          title="Approvals"
          description="Review campaign submissions and shared candidate progression."
          metric={summary?.campaignsPendingApproval ?? pendingCampaigns.length}
          accent="warning"
        />
        <PortalNavCard
          href="/client-dashboard/messages/"
          icon={MessageSquare}
          title="Messages"
          description="Contact CTRL Support and track your ticket history."
          accent="session"
        />
        <PortalNavCard
          href="/client-dashboard/upgrade-requests/"
          icon={TrendingUp}
          title="Upgrade requests"
          description="View contract entitlements and request seat or feature upgrades."
          accent="campaign"
        />
      </div>
    </div>
  );
}
