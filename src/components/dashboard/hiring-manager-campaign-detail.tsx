"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Eye,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { AssessmentOverallScoreCell } from "@/components/dashboard/assessment-overall-score-cell";
import { HmErrorBanner } from "@/components/dashboard/hiring-manager-portal-ui";
import {
  PortalEmptyState,
  PortalInlineLoading,
  PortalPanel,
  PortalSectionHeader,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import {
  PortalEntityHeader,
  PortalStatusBadge,
  PortalWorkQueue,
  type PortalWorkQueueItem,
} from "@/components/dashboard/portal/portal-data-ui";
import {
  PortalActionMenu,
  PortalDetailTabs,
} from "@/components/dashboard/portal/portal-navigation-ui";
import { HiringManagerSessionCreatePanel } from "@/components/dashboard/hiring-manager-session-create-panel";
import { SessionAccessShare } from "@/components/dashboard/session-access-share";
import {
  CandidateResultsDialog,
  type ResultsDialogState,
} from "@/components/dashboard/hiring-manager-session-details-dialog";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalBadgeClass,
  portalLabelClass,
  portalPanelBorderClass,
  portalPanelNestedClass,
  portalPrimaryButtonClass,
  portalTableHeaderClass,
  portalTableRowClass,
  portalTableShellClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import {
  canCreateSessionForCampaign,
  getSessionCreationApprovalError,
} from "@/lib/hiring-manager/campaign-session-approval";
import { getAssessmentSettingsSummary } from "@/lib/hiring-manager/assessment-settings-display";
import {
  formatInviteStatusLabel,
  isCandidateJoined,
} from "@/lib/hiring-manager/resolve-candidate-display-name";
import { getHmSessionDisplayName } from "@/lib/hiring-manager/session-display";
import { cn } from "@/lib/utils";
import { usePortalBreadcrumbDetail } from "@/components/dashboard/portal/portal-shell";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

const hmBackButtonClass =
  "h-10 w-fit shrink-0 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted";

type CampaignWorkspaceTab = "overview" | "candidates" | "sessions" | "assessments";

const CAMPAIGN_TABS: CampaignWorkspaceTab[] = [
  "overview",
  "candidates",
  "sessions",
  "assessments",
];

function isCampaignWorkspaceTab(value: string | null): value is CampaignWorkspaceTab {
  return Boolean(value && CAMPAIGN_TABS.includes(value as CampaignWorkspaceTab));
}

function getAssessmentVersion(
  assessment: string,
  campaign: HiringManagerCampaignDetail
) {
  const normalizedAssessment = assessment.toLowerCase().replace(/[\s-]/g, "");
  return getAssessmentSettingsSummary(campaign.assessmentSettings).find((item) => {
    const normalizedKey = item.key.toLowerCase().replace(/[\s-]/g, "");
    return (
      normalizedKey.includes(normalizedAssessment) ||
      normalizedAssessment.includes(normalizedKey)
    );
  });
}

export function HiringManagerCampaignDetailView({
  campaignId,
}: {
  campaignId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaign, setCampaign] = useState<HiringManagerCampaignDetail | null>(null);
  const [activeTab, setActiveTab] = useState<CampaignWorkspaceTab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ResultsDialogState | null>(null);
  usePortalBreadcrumbDetail(campaign?.name);

  const loadCampaign = useCallback(
    async (force = false) => {
      const startedAt = Date.now();
      if (force) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const data = await HiringManagerPortalClientService.getCampaignDetail(
          campaignId,
          { force }
        );
        setCampaign(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Campaign could not be loaded."
        );
      } finally {
        if (force) {
          const remainingSpin = 500 - (Date.now() - startedAt);
          if (remainingSpin > 0) {
            await new Promise((resolve) => setTimeout(resolve, remainingSpin));
          }
        }
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [campaignId]
  );

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    setActiveTab(isCampaignWorkspaceTab(requestedTab) ? requestedTab : "overview");

    if (
      searchParams.get("create") === "1" &&
      campaign &&
      canCreateSessionForCampaign(campaign.approvalStatus)
    ) {
      setIsCreateSessionOpen(true);
    }
  }, [campaign, searchParams]);

  const canEditAssessmentStack = campaign?.sessions === 0;
  const canCreateSession = campaign
    ? canCreateSessionForCampaign(campaign.approvalStatus)
    : false;
  const wasJustCreated = searchParams.get("created") === "1";

  const campaignCandidateCapacity = useMemo(
    () =>
      campaign?.assessmentSessions.reduce(
        (total, session) => total + session.candidateLimit,
        0
      ) ?? 0,
    [campaign]
  );

  const tabHref = (tab: CampaignWorkspaceTab) =>
    `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaignId)}?tab=${tab}`;

  const workItems = useMemo((): PortalWorkQueueItem[] => {
    if (!campaign) return [];
    const items: PortalWorkQueueItem[] = [];
    const approval = (campaign.approvalStatus ?? "").toLowerCase();

    if (approval.includes("pending")) {
      items.push({
        id: "awaiting-approval",
        title: "Waiting for client approval",
        reason: "Session creation stays locked until the client approves this campaign.",
        href: tabHref("overview"),
        actionLabel: "View status",
        priority: "attention",
      });
    }

    if (
      canCreateSessionForCampaign(campaign.approvalStatus) &&
      campaign.assessmentSessions.length === 0
    ) {
      items.push({
        id: "create-first-session",
        title: "Create the first delivery session",
        reason: "Candidates cannot join until a session exists with access details.",
        href: `${tabHref("sessions")}&create=1`,
        actionLabel: "Create session",
        priority: "critical",
      });
    }

    const incomplete = campaign.joinedCandidates.filter((candidate) => {
      const stack = candidate.assessmentStack ?? campaign.assessmentStack;
      const results = candidate.results ?? [];
      return stack.length > 0 && results.length < stack.length;
    });
    if (incomplete.length > 0) {
      items.push({
        id: "incomplete-candidates",
        title:
          incomplete.length === 1
            ? `${incomplete[0].name} still in progress`
            : `${incomplete.length} candidates still in progress`,
        reason: "Open a session workspace to invite, unlock, or review reports.",
        href: tabHref("candidates"),
        actionLabel: "Review",
        priority: "routine",
      });
    }

    return items;
  }, [campaign, campaignId]);

  const selectTab = (tab: CampaignWorkspaceTab) => {
    setActiveTab(tab);
    router.replace(
      `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaignId)}?tab=${tab}`,
      { scroll: false }
    );
  };

  const openCreateSession = () => {
    if (!canCreateSession) return;
    setActiveTab("sessions");
    setIsCreateSessionOpen(true);
    router.replace(
      `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaignId)}?tab=sessions&create=1`,
      { scroll: false }
    );
  };

  const handleCreateSessionOpenChange = (open: boolean) => {
    setIsCreateSessionOpen(open);
    if (!open) {
      router.replace(
        `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaignId)}?tab=sessions`,
        { scroll: false }
      );
      void loadCampaign(true);
    }
  };

  const deleteCampaign = async () => {
    if (!campaign) return;
    setIsDeleting(true);
    setError(null);
    try {
      await HiringManagerPortalClientService.deleteCampaign(campaignId);
      router.push("/hiring-manager-dashboard/campaigns/");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Campaign could not be deleted."
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return <PortalInlineLoading message="Loading campaign…" />;
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className={hmBackButtonClass} asChild>
          <Link href="/hiring-manager-dashboard/campaigns/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to campaigns
          </Link>
        </Button>
        <div className={cn(portalAlertErrorClass, "text-sm")}>
          {error || "Campaign could not be loaded."}
        </div>
      </div>
    );
  }

  const approvalLower = (campaign.approvalStatus ?? "").toLowerCase();
  const approvalTone = approvalLower.includes("pending")
    ? "attention"
    : approvalLower.includes("approved")
      ? "complete"
      : approvalLower.includes("reject")
        ? "critical"
        : "neutral";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <Button variant="outline" className={hmBackButtonClass} asChild>
        <Link href="/hiring-manager-dashboard/campaigns/">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to campaigns
        </Link>
      </Button>

      {wasJustCreated && campaign.approvalStatus === "Pending approval" ? (
        <p
          className={cn(portalAlertInfoClass, "text-xs leading-5")}
          aria-live="polite"
        >
          Campaign created and sent for client approval. Session creation unlocks
          after approval.
        </p>
      ) : null}
      {error ? <HmErrorBanner>{error}</HmErrorBanner> : null}

      <PortalEntityHeader
        eyebrow={`Campaign · ${campaign.deliveryMode}`}
        title={campaign.name}
        description={`${campaign.role} · ${campaign.location}`}
        status={
          <>
            <PortalStatusBadge
              label={campaign.status ?? "Unknown"}
              tone="active"
            />
            <PortalStatusBadge
              label={campaign.approvalStatus ?? "Unknown"}
              tone={approvalTone}
            />
          </>
        }
        metadata={[
          { label: "Starts", value: campaign.startDate },
          { label: "Ends", value: campaign.endDate },
          { label: "Next", value: campaign.nextMilestone },
        ]}
        action={
          <TooltipProvider>
            <div className="flex items-center gap-2">
              {canCreateSession ? (
                <Button
                  type="button"
                  onClick={openCreateSession}
                  className={cn(portalPrimaryButtonClass, "h-11")}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Create session
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-not-allowed">
                      <Button
                        type="button"
                        disabled
                        className={cn(
                          portalPrimaryButtonClass,
                          "h-11 disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                      >
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Create session
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {getSessionCreationApprovalError(campaign.approvalStatus)}
                  </TooltipContent>
                </Tooltip>
              )}

              <PortalActionMenu
                label="Campaign actions"
                items={[
                  {
                    id: "edit",
                    label: canEditAssessmentStack
                      ? "Edit campaign"
                      : "Edit campaign (locked)",
                    icon: <Pencil className="h-4 w-4" aria-hidden="true" />,
                    disabled: !canEditAssessmentStack,
                    onSelect: () => {
                      if (!canEditAssessmentStack) return;
                      router.push(
                        `/hiring-manager-dashboard/campaigns/${campaignId}/edit`
                      );
                    },
                  },
                  {
                    id: "refresh",
                    label: isRefreshing ? "Refreshing…" : "Refresh campaign",
                    icon: (
                      <RefreshCw
                        className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                        aria-hidden="true"
                      />
                    ),
                    disabled: isRefreshing,
                    onSelect: () => {
                      void loadCampaign(true);
                    },
                  },
                  {
                    id: "delete",
                    label: "Delete campaign",
                    icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                    tone: "destructive",
                    separatorBefore: true,
                    onSelect: () => setIsDeleteDialogOpen(true),
                  },
                ]}
              />
            </div>
          </TooltipProvider>
        }
      />

      <div className="sticky top-16 z-10 -mx-1 bg-background px-1">
        <PortalDetailTabs
          label="Campaign workspace"
          activeId={activeTab}
          tabs={[
            { id: "overview", label: "Overview", href: tabHref("overview") },
            {
              id: "candidates",
              label: "Candidates",
              href: tabHref("candidates"),
              count: campaign.joinedCandidates.length,
            },
            {
              id: "sessions",
              label: "Sessions",
              href: tabHref("sessions"),
              count: campaign.assessmentSessions.length,
            },
            {
              id: "assessments",
              label: "Assessments",
              href: tabHref("assessments"),
              count: campaign.assessmentStack.length,
            },
          ]}
        />
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <PortalWorkQueue
            title="What to do next"
            description="The single next actions that move this campaign forward."
            items={workItems}
            emptyTitle="Campaign is on track"
            emptyDescription="Create sessions, invite candidates, or wait for completions — nothing needs you right now."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <PortalStatTile
              label="Sessions"
              value={campaign.sessions}
              detail="delivery windows"
            />
            <PortalStatTile
              label="Candidates"
              value={campaign.joinedCandidates.length}
              detail={`of ${campaign.candidateCount} planned`}
            />
            <PortalStatTile
              label="Session capacity"
              value={campaignCandidateCapacity}
              detail="places configured"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <PortalPanel padding={false} className="overflow-hidden">
              <div className={cn("border-b p-4", portalPanelBorderClass)}>
                <PortalSectionHeader title="Operational summary" />
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div className={cn(portalPanelNestedClass, "p-4")}>
                  <p className={portalLabelClass}>Next milestone</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {campaign.nextMilestone}
                  </p>
                </div>
                <div className={cn(portalPanelNestedClass, "p-4")}>
                  <p className={portalLabelClass}>Delivery</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {campaign.deliveryMode}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {campaign.location}
                  </p>
                </div>
              </div>
            </PortalPanel>

            <PortalPanel padding={false} className="overflow-hidden">
              <div className={cn("border-b p-4", portalPanelBorderClass)}>
                <PortalSectionHeader title="Campaign timeline" />
              </div>
              <div className="divide-y divide-border p-4 text-sm">
                <div className="flex items-center justify-between gap-4 pb-3">
                  <span className="text-muted-foreground">Starts</span>
                  <span className="text-right font-semibold text-foreground">
                    {campaign.startDate}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-3">
                  <span className="text-muted-foreground">Ends</span>
                  <span className="text-right font-semibold text-foreground">
                    {campaign.endDate}
                  </span>
                </div>
              </div>
            </PortalPanel>
          </div>
        </div>
      ) : null}

      {activeTab === "sessions" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Campaign sessions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a session to invite candidates, copy join links, and review progress.
              </p>
            </div>
            {canCreateSession ? (
              <Button
                type="button"
                onClick={openCreateSession}
                className={cn(portalPrimaryButtonClass, "h-10 shrink-0")}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create session
              </Button>
            ) : (
              <p className={cn(portalAlertInfoClass, "max-w-md text-xs leading-5")}>
                {getSessionCreationApprovalError(campaign.approvalStatus)}
              </p>
            )}
          </div>

          {campaign.assessmentSessions.length === 0 ? (
            <PortalEmptyState
              title="No sessions yet"
              description={
                canCreateSession
                  ? "Create the first session — delivery format and capacity carry into the form."
                  : "Session creation becomes available when this campaign is approved."
              }
              icon={Calendar}
              action={
                canCreateSession ? (
                  <Button
                    type="button"
                    onClick={openCreateSession}
                    className={cn(portalPrimaryButtonClass, "h-10")}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Create session
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {campaign.assessmentSessions.map((session) => (
                <PortalPanel key={session.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "pointer-events-none border-none text-[10px] font-semibold",
                            getStatusTone(session.status)
                          )}
                        >
                          {session.status}
                        </Badge>
                        <Badge
                          className={cn(
                            portalBadgeClass,
                            "pointer-events-none text-[10px]"
                          )}
                        >
                          {session.type}
                        </Badge>
                      </div>
                      <h3 className="break-words text-base font-semibold text-foreground">
                        {getHmSessionDisplayName(session)}
                      </h3>
                      <p className="break-words text-xs leading-5 text-muted-foreground">
                        {session.date} · {session.location} ·{" "}
                        {session.candidateCount} of {session.candidateLimit} joined
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className={cn(portalPrimaryButtonClass, "h-9 px-3 text-xs")}
                        asChild
                      >
                        <Link
                          href={`/hiring-manager-dashboard/sessions/${session.id}`}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Open session
                        </Link>
                      </Button>
                      <SessionAccessShare
                        sessionId={session.id}
                        accessValue={session.accessValue}
                      />
                    </div>
                  </div>
                </PortalPanel>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "candidates" ? (
        <div className="mt-0 space-y-4">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Campaign candidates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Candidate progress and results for this campaign only.
              </p>
            </div>
            <Button variant="outline" className="h-9 shrink-0" asChild>
              <Link href="/hiring-manager-dashboard/candidates">
                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                View all candidates
              </Link>
            </Button>
          </div>

          <PortalPanel padding={false}>
            {campaign.joinedCandidates.length === 0 ? (
              <PortalEmptyState
                title="No candidates joined yet"
                description="Invite candidates from a session workspace once delivery windows exist."
                icon={Users}
              />
            ) : (
                <div className={portalTableShellClass}>
                  <table className="w-full border-collapse text-left text-xs text-foreground">
                    <thead className={portalTableHeaderClass}>
                      <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">Candidate</th>
                        <th className="p-3">Session</th>
                        <th className="p-3">Assessment status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaign.joinedCandidates.map((candidate) => {
                        const results = candidate.results ?? [];
                        const assessmentStack =
                          candidate.assessmentStack ?? campaign.assessmentStack;
                        const inviteLabel = formatInviteStatusLabel(candidate.inviteStatus);
                        const hasJoined = isCandidateJoined(candidate.inviteStatus);

                        return (
                          <tr key={candidate.id} className={portalTableRowClass}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 shrink-0 rounded-full",
                                    hasJoined ? "bg-emerald-500" : "bg-muted-foreground/30"
                                  )}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-foreground">
                                      {candidate.name}
                                    </span>
                                    {inviteLabel ? (
                                      <Badge
                                        className={cn(
                                          portalBadgeClass,
                                          "pointer-events-none border-none px-2 py-0.5 text-[10px] font-semibold"
                                        )}
                                      >
                                        {inviteLabel}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-0.5 break-all text-[10px] text-muted-foreground">
                                    {candidate.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {candidate.sessionName ?? "Not assigned"}
                            </td>
                            <td className="p-3">
                              <AssessmentOverallScoreCell
                                assessmentStack={assessmentStack}
                                results={results}
                                assessmentSettings={campaign.assessmentSettings}
                                resolvedStackSummary={campaign.resolvedStackSummary}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-primary"
                              >
                                <Link href={`/hiring-manager-dashboard/candidates/${candidate.id}/?campaignId=${campaign.id}&from=campaign`}>
                                  View report
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </PortalPanel>
        </div>
      ) : null}

      {activeTab === "assessments" ? (
        <div className="space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold text-foreground">Assessment stack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The assessments, release versions, and campaign-level configuration used for this campaign.
            </p>
          </div>

          {campaign.assessmentStack.length === 0 ? (
            <PortalEmptyState
              title="No assessments linked"
              description="Attach assessments when editing the campaign before sessions are created."
              icon={ClipboardList}
            />
          ) : (
            <div className="space-y-3">
              {campaign.assessmentStack.map((assessment) => {
                const Icon = getAssessmentCatalogueIcon(assessment);
                const version = getAssessmentVersion(assessment, campaign);
                return (
                  <PortalPanel
                    key={assessment}
                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-foreground">
                          {assessment}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {version?.detail || "Campaign scoring configuration applied"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        portalBadgeClass,
                        "w-fit shrink-0 px-2.5 py-1 text-xs font-semibold"
                      )}
                    >
                      {version?.label ?? "Current release"}
                    </Badge>
                  </PortalPanel>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <HiringManagerSessionCreatePanel
        campaign={campaign}
        open={isCreateSessionOpen}
        onOpenChange={handleCreateSessionOpenChange}
      />

      <CandidateResultsDialog
        resultsDialog={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {campaign.name}?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This permanently removes the campaign, its sessions, and linked candidate
              application records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep campaign</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteCampaign()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
