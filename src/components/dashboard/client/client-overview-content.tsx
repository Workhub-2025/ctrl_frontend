"use client";

import {
  Building2,
  ClipboardCheck,
  KeyRound,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import {
  ClientErrorBanner,
  ClientQuickLink,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import { PortalStatTile } from "@/components/dashboard/portal/portal-ui";
import { useClientPortal } from "@/context/client-portal-provider";

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
        notice={error ? <ClientErrorBanner message={error} /> : null}
        action={<ClientRefreshButton onClick={() => void loadOverview(true)} loading={loading} />}
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

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">Go to a portal area</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ClientQuickLink
            href="/client-dashboard/hiring-managers/"
            icon={Users}
            title="Hiring managers"
            description="Manage seat access, invite codes, and hiring-manager workspaces."
          />
          <ClientQuickLink
            href="/client-dashboard/progressed/"
            icon={ClipboardCheck}
            title="Approvals"
            description="Review campaign submissions and shared candidate progression."
            badge={summary?.campaignsPendingApproval ?? pendingCampaigns.length}
          />
          <ClientQuickLink
            href="/client-dashboard/upgrade-requests/"
            icon={TrendingUp}
            title="Upgrade requests"
            description="View entitlements and request seats, assessments, or version upgrades."
          />
          <ClientQuickLink
            href="/client-dashboard/messages/"
            icon={MessageSquare}
            title="Messages"
            description="Contact CTRL Support and track your ticket history."
          />
        </div>
      </section>
    </div>
  );
}
