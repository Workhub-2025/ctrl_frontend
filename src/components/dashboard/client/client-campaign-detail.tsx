"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  MapPin,
  Users,
} from "lucide-react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { SharedCandidateNotesPanel } from "@/components/dashboard/shared-candidate-notes-panel";
import {
  ClientErrorBanner,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import {
  PortalEmptyState,
  PortalInlineLoading,
  PortalPanel,
  PortalSectionHeader,
} from "@/components/dashboard/portal/portal-ui";
import {
  PortalEntityHeader,
  PortalStatusBadge,
  PortalWorkQueue,
  type PortalWorkQueueItem,
} from "@/components/dashboard/portal/portal-data-ui";
import { PortalDetailTabs } from "@/components/dashboard/portal/portal-navigation-ui";
import { usePortalBreadcrumbDetail } from "@/components/dashboard/portal/portal-shell";
import { Button } from "@/components/ui/button";
import type {
  ClientCampaignWorkspace,
  ClientSharedCandidate,
} from "@/types/client-portal";
import { cn } from "@/lib/utils";
import {
  portalLabelClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";

const OUTCOME_LABELS: Record<ClientSharedCandidate["reviewStatus"], string> = {
  pending_review: "Pending review",
  reviewed: "Reviewed",
  progressed: "Progressed",
  hired: "Hired",
  rejected: "Rejected",
};

type CampaignTab = "overview" | "assessments" | "sessions" | "candidates";

const TABS: CampaignTab[] = [
  "overview",
  "assessments",
  "sessions",
  "candidates",
];

function isCampaignTab(value: string | null): value is CampaignTab {
  return Boolean(value && TABS.includes(value as CampaignTab));
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function approvalTone(
  status: string
): "neutral" | "active" | "attention" | "complete" | "critical" {
  const normalized = status.toLowerCase();
  if (normalized.includes("pending")) return "attention";
  if (normalized.includes("approved") || normalized.includes("active")) {
    return "complete";
  }
  if (normalized.includes("reject") || normalized.includes("archiv")) {
    return "critical";
  }
  return "neutral";
}

function reviewTone(
  status: ClientSharedCandidate["reviewStatus"]
): "neutral" | "active" | "attention" | "complete" | "critical" {
  switch (status) {
    case "pending_review":
      return "attention";
    case "progressed":
    case "hired":
      return "complete";
    case "rejected":
      return "critical";
    default:
      return "neutral";
  }
}

export function ClientCampaignDetail({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaign, setCampaign] = useState<ClientCampaignWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePortalBreadcrumbDetail(campaign?.name);

  const activeTab: CampaignTab = isCampaignTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as CampaignTab)
    : "overview";

  const tabHref = useCallback(
    (tab: CampaignTab) =>
      `/client-dashboard/campaigns/${encodeURIComponent(campaignId)}?tab=${tab}`,
    [campaignId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/client/campaigns/${encodeURIComponent(campaignId)}`,
        { cache: "no-store" }
      );
      const body = (await response.json().catch(() => ({}))) as {
        data?: ClientCampaignWorkspace;
        error?: string;
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error || "Campaign could not be loaded");
      }
      setCampaign(body.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaign could not be loaded"
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingReviews = useMemo(
    () =>
      campaign?.sharedCandidates.filter(
        (candidate) => candidate.reviewStatus === "pending_review"
      ) ?? [],
    [campaign]
  );

  const workItems = useMemo((): PortalWorkQueueItem[] => {
    if (!campaign) return [];
    const items: PortalWorkQueueItem[] = [];

    if (pendingReviews.length > 0) {
      items.push({
        id: "pending-reviews",
        title:
          pendingReviews.length === 1
            ? `${pendingReviews[0].candidateName} needs a decision`
            : `${pendingReviews.length} candidates need a decision`,
        reason:
          "Hiring managers shared evidence. Record progressed, hired, or rejected.",
        href: tabHref("candidates"),
        actionLabel: "Review",
        priority: "attention",
      });
    }

    const approval = (campaign.approvalStatus ?? "").toLowerCase();
    if (approval.includes("pending")) {
      items.push({
        id: "approval",
        title: "Campaign awaiting your approval",
        reason: "Session delivery is blocked until this campaign is approved.",
        href: "/client-dashboard/campaigns/",
        actionLabel: "Open approvals",
        priority: "critical",
      });
    }

    return items;
  }, [campaign, pendingReviews, tabHref]);

  if (loading && !campaign) {
    return <PortalInlineLoading message="Loading campaign…" />;
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="min-h-11 rounded-xl" asChild>
          <Link href="/client-dashboard/campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to campaigns
          </Link>
        </Button>
        <ClientErrorBanner message={error || "Campaign could not be found."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <Button variant="outline" className="min-h-11 w-fit rounded-xl" asChild>
        <Link href="/client-dashboard/campaigns">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to campaigns
        </Link>
      </Button>

      {error ? <ClientErrorBanner message={error} /> : null}

      <PortalEntityHeader
        eyebrow="Campaign"
        title={campaign.name}
        description={`${campaign.role} · Created by ${campaign.createdBy}`}
        status={
          <>
            <PortalStatusBadge
              label={campaign.approvalStatus ?? "Unknown"}
              tone={approvalTone(campaign.approvalStatus ?? "")}
            />
            <PortalStatusBadge label={campaign.status ?? "Unknown"} tone="neutral" />
            <PortalStatusBadge
              label={campaign.deliveryMode ?? "Delivery"}
              tone="active"
            />
          </>
        }
        metadata={[
          { label: "Starts", value: formatDate(campaign.startDate) },
          {
            label: "Ends",
            value: campaign.endDate ? formatDate(campaign.endDate) : "Ongoing",
          },
          {
            label: "Location",
            value: campaign.location || "Not set",
          },
          {
            label: "Vacancies",
            value: campaign.vacancyCount ?? "Not set",
          },
        ]}
        action={
          <ClientRefreshButton
            onClick={() => void load()}
            loading={loading}
          />
        }
      />

      <PortalDetailTabs
        label="Campaign sections"
        activeId={activeTab}
        tabs={[
          { id: "overview", label: "Overview", href: tabHref("overview") },
          {
            id: "assessments",
            label: "Assessments",
            href: tabHref("assessments"),
            count: campaign.assessmentStack.length,
          },
          {
            id: "sessions",
            label: "Sessions",
            href: tabHref("sessions"),
            count: campaign.sessionsDetail.length,
          },
          {
            id: "candidates",
            label: "Shared candidates",
            href: tabHref("candidates"),
            count: campaign.sharedCandidates.length,
          },
        ]}
      />

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <PortalWorkQueue
            title="Needs your attention"
            description="Decisions that unlock progress on this campaign."
            items={workItems}
            emptyTitle="Nothing waiting on you"
            emptyDescription="When candidates are shared or approval is needed, actions will appear here."
          />

          <PortalPanel>
            <PortalSectionHeader
              title="Delivery context"
              description="Schedule and capacity for this role."
            />
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={cn(portalPanelNestedClass, "p-4")}>
                <dt className={portalLabelClass}>Location</dt>
                <dd className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {campaign.location || "Not set"}
                </dd>
              </div>
              <div className={cn(portalPanelNestedClass, "p-4")}>
                <dt className={portalLabelClass}>Privacy</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Candidate identity stays private until a hiring manager
                  explicitly shares a reviewed candidate with your organisation.
                </dd>
              </div>
            </dl>
          </PortalPanel>
        </div>
      ) : null}

      {activeTab === "assessments" ? (
        <div className="space-y-3">
          {campaign.assessmentStack.length === 0 ? (
            <PortalEmptyState
              title="No assessments configured"
              description="Hiring managers will attach the assessment stack when the campaign is set up."
              icon={ClipboardList}
            />
          ) : (
            campaign.assessmentStack.map((assessment) => {
              const Icon = getAssessmentCatalogueIcon(assessment);
              return (
                <PortalPanel key={assessment} className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-md border border-border bg-muted text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{assessment}</p>
                    <p className="text-xs text-muted-foreground">
                      Campaign configuration applied
                    </p>
                  </div>
                </PortalPanel>
              );
            })
          )}
        </div>
      ) : null}

      {activeTab === "sessions" ? (
        <div className="space-y-3">
          {campaign.sessionsDetail.length === 0 ? (
            <PortalEmptyState
              title="No sessions yet"
              description="Delivery windows appear here once a hiring manager creates them."
              icon={CalendarDays}
            />
          ) : (
            campaign.sessionsDetail.map((session) => (
              <PortalPanel key={session.documentId} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {session.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatDate(session.startsAt)}
                    </p>
                  </div>
                  <PortalStatusBadge
                    label={session.sessionStatus}
                    tone="neutral"
                  />
                </div>
              </PortalPanel>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "candidates" ? (
        <div className="space-y-4">
          {pendingReviews.length > 0 ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-semibold tabular-nums text-foreground">
                {pendingReviews.length}
              </span>{" "}
              awaiting your decision
            </p>
          ) : null}

          {campaign.sharedCandidates.length === 0 ? (
            <PortalEmptyState
              title="No candidates have been shared"
              description="This does not reveal invitation, start, or completion totals."
              icon={Users}
            />
          ) : (
            campaign.sharedCandidates.map((candidate) => (
              <PortalPanel key={candidate.documentId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {candidate.candidateName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {candidate.candidateEmail}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shared by {candidate.hiringManagerName}
                    </p>
                  </div>
                  <PortalStatusBadge
                    label={OUTCOME_LABELS[candidate.reviewStatus]}
                    tone={reviewTone(candidate.reviewStatus)}
                  />
                </div>
                {candidate.reviewStatus === "pending_review" ? (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() =>
                        router.push("/client-dashboard/candidates/")
                      }
                    >
                      Open decision queue
                    </Button>
                  </div>
                ) : null}
                <SharedCandidateNotesPanel
                  sharedCandidateDocumentId={candidate.documentId}
                  portal="client"
                  className="mt-4"
                />
              </PortalPanel>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
