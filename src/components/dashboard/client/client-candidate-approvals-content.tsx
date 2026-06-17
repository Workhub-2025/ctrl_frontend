"use client";

import { useEffect } from "react";
import { Mail, RefreshCw, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
  portalBadgeClass,
} from "@/components/dashboard/portal/portal-ui";
import { useClientPortal } from "@/context/client-portal-provider";
import { ClientCandidateOutreachDialog } from "@/components/dashboard/client/client-candidate-outreach-dialog";
import type { ClientSharedCandidate } from "@/services/client-portal.service";
import { cn } from "@/lib/utils";

const REVIEW_STATUS_LABELS: Record<ClientSharedCandidate["reviewStatus"], string> = {
  pending_review: "Pending review",
  reviewed: "Reviewed",
  progressed: "Progressed",
  rejected: "Rejected",
};

function ReviewStatusBadge({ status }: { status: ClientSharedCandidate["reviewStatus"] }) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", portalBadgeClass)}>
      {REVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ClientCandidateApprovalsContent() {
  const {
    sharedCandidates,
    sharedLoading,
    error,
    loadOverview,
    loadSharedCandidates,
  } = useClientPortal();

  useEffect(() => {
    void loadSharedCandidates();
  }, [loadSharedCandidates]);

  const pendingCount = sharedCandidates.filter((c) => c.reviewStatus === "pending_review").length;

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Candidate reviews"
        description="Candidates recommended by hiring managers after assessment review."
        notice={
          error ? (
            <ClientErrorBanner message={error} />
          ) : pendingCount > 0 ? (
            <ClientErrorBanner tone="info">
              {pendingCount} candidate{pendingCount === 1 ? "" : "s"} awaiting your review.
            </ClientErrorBanner>
          ) : null
        }
        action={
          <ClientRefreshButton
            onClick={() => {
              void loadOverview(true);
              void loadSharedCandidates(undefined, true);
            }}
            loading={sharedLoading}
          />
        }
      />

      <PortalPanel>
        <div className="space-y-6 p-6">
          <PortalSectionHeader
            eyebrow="Candidate queue"
            title="Recommended candidates"
            description="Hiring managers share candidates here when they pass assessment review. Track status and contact candidates directly."
          />

          {sharedLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin text-primary" aria-hidden="true" />
              Loading candidates…
            </p>
          )}

          {!sharedLoading && sharedCandidates.length === 0 && (
            <PortalEmptyState
              icon={UserCheck}
              title="No candidates yet"
              description="When a hiring manager recommends a candidate, they will appear here."
            />
          )}

          {!sharedLoading && sharedCandidates.length > 0 && (
            <ul className="space-y-4">
              {sharedCandidates.map((candidate) => (
                <li
                  key={candidate.documentId}
                  className="rounded-xl border border-border/60 bg-background/30 p-5 shadow-sm dark:border-white/5 dark:bg-[#0b1220]/25"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ReviewStatusBadge status={candidate.reviewStatus} />
                        <Badge variant="outline" className="rounded-lg text-xs">
                          {candidate.campaignName}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-display text-base font-semibold text-foreground">
                          {candidate.candidateName}
                        </p>
                        {candidate.candidateEmail ? (
                          <p className="text-sm text-muted-foreground">{candidate.candidateEmail}</p>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {candidate.role} · Recommended by {candidate.hiringManagerName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start">
                      <ClientCandidateOutreachDialog candidate={candidate}>
                        <Button
                          variant="outline"
                          className="gap-2 rounded-xl font-semibold"
                          disabled={!candidate.candidateEmail}
                        >
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          Send message
                        </Button>
                      </ClientCandidateOutreachDialog>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PortalPanel>
    </div>
  );
}
