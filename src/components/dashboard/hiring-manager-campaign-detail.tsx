"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  ClipboardList,
  Copy,
  Eye,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { AssessmentOverallScoreCell } from "@/components/dashboard/assessment-overall-score-cell";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { HiringManagerSessionCreatePanel } from "@/components/dashboard/hiring-manager-session-create-panel";
import {
  CandidateResultsDialog,
  type ResultsDialogState,
} from "@/components/dashboard/hiring-manager-session-details-dialog";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalBadgeClass,
  portalInputClass,
  portalLabelClass,
  portalPanelBorderClass,
  portalPanelElevatedClass,
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
import {
  copySessionJoinLink,
  isSecureAccessCodePlaceholder,
} from "@/lib/copy-share-links";
import { cn } from "@/lib/utils";
import { usePortalBreadcrumbDetail } from "@/components/dashboard/portal/portal-shell";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

const hmOutlineButtonClass = cn(
  portalInputClass,
  "h-10 bg-background text-sm font-semibold text-foreground transition-colors hover:!bg-muted hover:!text-foreground"
);

const hmBackButtonClass = cn(
  hmOutlineButtonClass,
  "w-fit shrink-0 px-3"
);

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
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
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
    return (
      <div className={cn(portalPanelNestedClass, "p-6 text-sm text-muted-foreground")}>
        Loading campaign…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="h-9 rounded-lg" asChild>
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

  const editCampaignLockedReason =
    "Campaign assessments cannot be edited after sessions have been created.";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Button variant="outline" className={hmBackButtonClass} asChild>
        <Link href="/hiring-manager-dashboard/campaigns/">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to campaigns
        </Link>
      </Button>

      <HiringManagerPageHeader
        eyebrow={`Campaign workspace · ${campaign.deliveryMode}`}
        title={campaign.name}
        description={`${campaign.role} · ${campaign.location}`}
        icon={Briefcase}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "pointer-events-none rounded-md border-none px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                getStatusTone(campaign.status)
              )}
            >
              {campaign.status}
            </Badge>
            <Badge className={cn(portalBadgeClass, "pointer-events-none text-xs font-semibold")}>
              {campaign.approvalStatus}
            </Badge>
          </div>
        }
        action={
          <TooltipProvider>
            <div className="flex items-center gap-2">
              {canCreateSession ? (
                <Button
                  type="button"
                  onClick={openCreateSession}
                  className={cn(portalPrimaryButtonClass, "h-10")}
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
                          "h-10 disabled:cursor-not-allowed disabled:opacity-50"
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(hmOutlineButtonClass, "w-10 px-0")}
                    aria-label="Campaign actions"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {canEditAssessmentStack ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/hiring-manager-dashboard/campaigns/${campaignId}/edit`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit campaign
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled title={editCampaignLockedReason}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block">Edit campaign</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Locked after sessions exist
                        </span>
                      </span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => void loadCampaign(true)}
                    disabled={isRefreshing}
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                      aria-hidden="true"
                    />
                    {isRefreshing ? "Refreshing…" : "Refresh campaign"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete campaign
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        }
        notice={
          wasJustCreated && campaign.approvalStatus === "Pending approval" ? (
            <p
              className={cn(portalAlertInfoClass, "text-xs leading-5")}
              aria-live="polite"
            >
              Campaign created and sent for client approval. Session creation unlocks after approval.
            </p>
          ) : error ? (
            <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>{error}</p>
          ) : null
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => selectTab(value as CampaignWorkspaceTab)}
        className="space-y-4"
      >
        <div className="sticky top-16 z-10 -mx-1 overflow-x-auto border-b border-border bg-background px-1">
          <TabsList className="h-12 min-w-max justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="overview" className="h-11 gap-2 px-3 text-sm sm:px-4">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="candidates" className="h-11 gap-2 px-3 text-sm sm:px-4">
              <Users className="h-4 w-4" aria-hidden="true" />
              Candidates
              <Badge className={cn(portalBadgeClass, "pointer-events-none px-1.5 py-0 text-xs")}>
                {campaign.joinedCandidates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="h-11 gap-2 px-3 text-sm sm:px-4">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Sessions
              <Badge className={cn(portalBadgeClass, "pointer-events-none px-1.5 py-0 text-xs")}>
                {campaign.assessmentSessions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="assessments" className="h-11 gap-2 px-3 text-sm sm:px-4">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Assessments
              <Badge className={cn(portalBadgeClass, "pointer-events-none px-1.5 py-0 text-xs")}>
                {campaign.assessmentStack.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Sessions",
                value: campaign.sessions,
                detail: "delivery windows",
              },
              {
                label: "Candidates",
                value: campaign.joinedCandidates.length,
                detail: `of ${campaign.candidateCount} planned`,
              },
              {
                label: "Session capacity",
                value: campaignCandidateCapacity,
                detail: "places configured",
              },
            ].map((metric) => (
              <Card key={metric.label} className={portalPanelElevatedClass}>
                <CardContent className="p-5">
                  <p className={portalLabelClass}>{metric.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {metric.value}
                    </span>
                    <span className="text-xs text-muted-foreground">{metric.detail}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <Card className={portalPanelElevatedClass}>
              <CardHeader className={cn("border-b p-4", portalPanelBorderClass)}>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Operational summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
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
              </CardContent>
            </Card>

            <Card className={portalPanelElevatedClass}>
              <CardHeader className={cn("border-b p-4", portalPanelBorderClass)}>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Campaign timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border p-4 text-sm">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-0 space-y-4">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Campaign sessions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create delivery windows and manage candidate access for this campaign.
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
            <div className={cn(portalPanelNestedClass, "border-dashed p-6")}>
              <h3 className="text-sm font-semibold text-foreground">No sessions yet</h3>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                {canCreateSession
                  ? "Create the first session here. The campaign, delivery format, and planned capacity are carried into the form."
                  : "Session creation becomes available when this campaign is approved."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaign.assessmentSessions.map((session) => (
                <Card key={session.id} className={portalPanelElevatedClass}>
                  <CardContent className="p-4 sm:p-5">
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
                          <Badge className={cn(portalBadgeClass, "pointer-events-none text-[10px]")}>
                            {session.type}
                          </Badge>
                        </div>
                        <h3 className="break-words text-base font-semibold text-foreground">
                          {getHmSessionDisplayName(session)}
                        </h3>
                        <p className="break-words text-xs leading-5 text-muted-foreground">
                          {session.date} · {session.location} · {session.candidateCount} of{" "}
                          {session.candidateLimit} joined
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Code
                          </span>
                          <span className="font-mono text-xs font-bold tracking-wider text-foreground">
                            {session.accessValue}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            void (async () => {
                              try {
                                if (isSecureAccessCodePlaceholder(session.accessValue)) {
                                  await copySessionJoinLink(session.id);
                                } else {
                                  await navigator.clipboard?.writeText(session.accessValue);
                                }
                                setCopiedSessionId(session.id);
                              } catch {
                                /* ignore clipboard failures */
                              }
                            })();
                          }}
                          className="h-9 px-3 text-xs"
                        >
                          {copiedSessionId === session.id ? (
                            <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {copiedSessionId === session.id
                            ? "Copied"
                            : isSecureAccessCodePlaceholder(session.accessValue)
                              ? "Copy join link"
                              : "Copy code"}
                        </Button>
                        <Button variant="outline" className="h-9 px-3 text-xs" asChild>
                          <Link href={`/hiring-manager-dashboard/sessions/${session.id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            View details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="candidates" className="mt-0 space-y-4">
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

          <Card className={portalPanelElevatedClass}>
            <CardContent className="p-0 sm:p-4">
              {campaign.joinedCandidates.length === 0 ? (
                <p className="p-6 text-sm leading-6 text-muted-foreground">
                  No candidates have joined a session for this campaign yet.
                </p>
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
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSelectedReport({
                                    candidateId: candidate.id,
                                    campaignId: campaign.id,
                                    candidateSessionId: candidate.id,
                                    candidateName: candidate.name,
                                    candidateEmail: candidate.email,
                                    role: campaign.role,
                                    campaignName: campaign.name,
                                  })
                                }
                                className="h-8 text-xs text-primary"
                              >
                                View report
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="mt-0 space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold text-foreground">Assessment stack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The assessments, release versions, and campaign-level configuration used for this campaign.
            </p>
          </div>

          {campaign.assessmentStack.length === 0 ? (
            <div className={cn(portalPanelNestedClass, "border-dashed p-6 text-sm text-muted-foreground")}>
              No assessments are linked to this campaign.
            </div>
          ) : (
            <div className="space-y-3">
              {campaign.assessmentStack.map((assessment) => {
                const Icon = getAssessmentCatalogueIcon(assessment);
                const version = getAssessmentVersion(assessment, campaign);
                return (
                  <Card key={assessment} className={portalPanelElevatedClass}>
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                      <Badge className={cn(portalBadgeClass, "w-fit shrink-0 px-2.5 py-1 text-xs font-semibold")}>
                        {version?.label ?? "Current release"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
