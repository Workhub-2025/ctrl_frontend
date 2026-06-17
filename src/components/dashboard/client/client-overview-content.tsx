"use client";

import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  KeyRound,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientQuickLink,
  ClientRefreshButton,
  ClientStatTile,
} from "@/components/dashboard/client/client-portal-ui";
import { PortalQuickLinkRow } from "@/components/dashboard/portal/portal-ui";
import { useClientPortal } from "@/context/client-portal-provider";
import { Button } from "@/components/ui/button";

export function ClientOverviewContent() {
  const {
    summary,
    entitlements,
    loading,
    error,
    pendingCampaigns,
    pendingSharedCandidates,
    loadOverview,
  } = useClientPortal();

  const contractInactive = entitlements?.contractActive === false;

  return (
    <div className="space-y-8">
      <ClientPageHeader
        title={summary?.client?.name ?? "Overview"}
        description="Review hiring-manager capacity, campaign approvals, and candidate progression from one place."
        notice={
          error ? (
            <ClientErrorBanner tone="error">{error}</ClientErrorBanner>
          ) : contractInactive ? (
            <ClientErrorBanner tone="info">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {entitlements?.lockState?.userMessage ??
                    "Your organisation contract is inactive or payment is pending. Complete billing to restore full access."}
                </p>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href="/client-dashboard/upgrade-requests/">View upgrade requests</Link>
                </Button>
              </div>
            </ClientErrorBanner>
          ) : null
        }
        action={<ClientRefreshButton onClick={() => void loadOverview(true)} loading={loading} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ClientStatTile
          label="Hiring manager seats"
          value={summary ? `${summary.seats.used}/${summary.seats.limit}` : "…"}
          detail={
            summary
              ? `${summary.seats.available} seat${summary.seats.available === 1 ? "" : "s"} available`
              : "Loading seat capacity…"
          }
          icon={Users}
        />
        <ClientStatTile
          label="Available invites"
          value={summary?.availableAccessCodes ?? "…"}
          detail="Unused hiring-manager invite codes"
          icon={KeyRound}
        />
        <ClientStatTile
          label="Campaign approvals"
          value={summary?.campaignsPendingApproval ?? pendingCampaigns.length}
          detail="Campaigns waiting for your review"
          icon={ClipboardCheck}
        />
        <ClientStatTile
          label="Candidates pending review"
          value={summary?.candidatesPendingReview ?? pendingSharedCandidates.length}
          detail="Shared candidates awaiting a decision"
          icon={UserCheck}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Go to a workspace area</h2>
        <PortalQuickLinkRow
          links={[
            {
              href: "/client-dashboard/hiring-managers/",
              label: "Hiring managers",
              hint: "Seats and invite codes",
              icon: Users,
            },
            {
              href: "/client-dashboard/progressed/",
              label: "Approvals",
              hint: "Campaigns and candidates",
              icon: ClipboardCheck,
            },
            {
              href: "/client-dashboard/upgrade-requests/",
              label: "Upgrade requests",
              hint: "Seats and features",
              icon: TrendingUp,
            },
          ]}
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <ClientQuickLink
          href="/client-dashboard/messages/"
          icon={MessageSquare}
          title="Messages"
          description="Support tickets and hiring team correspondence."
        />
        <ClientQuickLink
          href="/client-dashboard/hiring-managers/"
          icon={Building2}
          title="Team management"
          description="Full hiring-manager directory, invites, and seat controls."
        />
      </div>
    </div>
  );
}
