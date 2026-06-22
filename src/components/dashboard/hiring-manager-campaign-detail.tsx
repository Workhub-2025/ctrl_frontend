"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  ClipboardList,
  Users,
  Calendar,
  Briefcase
} from "lucide-react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { getHmSessionDisplayName } from "@/lib/hiring-manager/session-display";
import { cn } from "@/lib/utils";
import { AssessmentOverallScoreCell } from "@/components/dashboard/assessment-overall-score-cell";
import {
  portalAlertErrorClass,
  portalPanelElevatedClass,
  portalPanelNestedClass,
  portalBadgeClass,
  portalTableHeaderClass,
  portalTableRowClass,
  portalTableShellClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import {
  formatInviteStatusLabel,
  isCandidateJoined,
} from "@/lib/hiring-manager/resolve-candidate-display-name";
import {
  CandidateResultsDialog,
  type ResultsDialogState,
} from "@/components/dashboard/hiring-manager-session-details-dialog";
import { getAssessmentSettingsSummary } from "@/lib/hiring-manager/assessment-settings-display";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

type HiringManagerCampaignDetailProps = {
  campaignId: string;
};

export function HiringManagerCampaignDetailView({
  campaignId,
}: HiringManagerCampaignDetailProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<HiringManagerCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ResultsDialogState | null>(null);

  const loadCampaign = useCallback(async (force = false) => {
    const startTime = Date.now();
    if (!force) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const data = await HiringManagerPortalClientService.getCampaignDetail(campaignId, { force });
      setCampaign(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaign could not be loaded."
      );
    } finally {
      if (force) {
        const elapsedTime = Date.now() - startTime;
        const minSpin = 800; // ms to ensure smooth spin
        if (elapsedTime < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
        }
      }
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  const deleteCampaign = async () => {
    if (!campaign) return;

    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This will remove the campaign, its sessions, and candidate application records linked to it.`
    );
    if (!confirmed) return;

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
    }
  };

  if (isLoading) {
    return (
      <div className={cn(portalPanelNestedClass, "p-6 text-sm text-muted-foreground")}>
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="h-9 rounded-lg" asChild>
          <Link href="/hiring-manager-dashboard/campaigns/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to campaigns
          </Link>
        </Button>
        <div className={cn(portalAlertErrorClass, "text-sm")}>
          {error || "Campaign could not be loaded."}
        </div>
      </div>
    );
  }

  const canEditAssessmentStack = campaign.sessions === 0;
  const editCampaignLockedReason =
    "Campaign cannot be edited after sessions have been created.";

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Button
          variant="outline"
          className="h-8 w-fit shrink-0 rounded-lg border-white/10 bg-white/[0.02] px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
          asChild
        >
          <Link href="/hiring-manager-dashboard/campaigns/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to campaigns
          </Link>
        </Button>

        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-3">
            {canEditAssessmentStack ? (
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-9 border-white/10 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                <Link href={`/hiring-manager-dashboard/campaigns/${campaignId}/edit`}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit campaign
                </Link>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-not-allowed">
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="h-9 border-white/10 bg-white/[0.02] text-xs font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit campaign
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {editCampaignLockedReason}
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadCampaign(true)}
              disabled={isRefreshing}
              className="h-9 border-white/10 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={deleteCampaign}
              disabled={isDeleting}
              className="h-9 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {isDeleting ? "Deleting..." : "Delete Campaign"}
            </Button>
          </div>
        </TooltipProvider>
      </div>

      <HiringManagerPageHeader
        eyebrow={`Campaign Workspace // ${campaign.deliveryMode}`}
        title={campaign.name}
        description={`${campaign.role} · ${campaign.location}`}
        icon={Briefcase}
        badge={
          <Badge className={cn("pointer-events-none rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border-none", getStatusTone(campaign.status))}>
            {campaign.status}
          </Badge>
        }
        notice={
          error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-200">
              {error}
            </p>
          ) : null
        }
      />

      <div className="w-full">
        <Card className={cn(portalPanelElevatedClass, "relative overflow-hidden transition-colors duration-300 hover:border-primary/45")}>
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-sky-400" />
          <CardContent className="p-5 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-indigo-400" /> Active Assessment Sessions
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{campaign.sessions}</span>
              <span className="text-xs text-slate-500">scheduled events</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card className={cn(portalPanelNestedClass, "rounded-2xl bg-card/40 backdrop-blur-md shadow-sm")}>
          <CardHeader className="border-b border-border/40 dark:border-white/5 p-4">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-primary" /> Assessment stack
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-4">
            {campaign.assessmentStack.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No assessments linked.</p>
            ) : (
              (() => {
                const versionSummary = getAssessmentSettingsSummary(campaign.assessmentSettings);
                return campaign.assessmentStack.map((assessment) => {
                  const Icon = getAssessmentCatalogueIcon(assessment);
                  const matchedVersion = versionSummary.find((v) =>
                    v.key.replace(/-/g, "").toLowerCase().includes(assessment.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")) ||
                    assessment.toLowerCase().replace(/\s+/g, "").replace(/-/g, "").includes(v.key.replace(/-/g, "").toLowerCase())
                  );
                  const displayLabel = matchedVersion
                    ? `${assessment} v${String((matchedVersion.label.match(/v(.+)$/)?.[1]) ?? "1")}`
                    : assessment;
                  return (
                    <span
                      key={assessment}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/55 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-slate-200 dark:border-white/5 dark:bg-white/[0.02]"
                      title={matchedVersion?.detail || undefined}
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {displayLabel}
                    </span>
                  );
                });
              })()
            )}
          </CardContent>
        </Card>

        <Card className={cn(portalPanelNestedClass, "rounded-2xl bg-card/40 backdrop-blur-md shadow-sm")}>
          <CardHeader className="border-b border-border/40 dark:border-white/5 p-4">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Campaign Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 p-4 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Start Date</span>
              <span className="font-semibold text-white">{campaign.startDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">End Date</span>
              <span className="font-semibold text-white">{campaign.endDate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={portalPanelElevatedClass}>
        <CardHeader className="border-b border-white/10 p-4">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {campaign.assessmentSessions.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No sessions created yet. Create sessions from the Sessions tab.
            </p>
          ) : (
            campaign.assessmentSessions.map((session) => (
              <div
                key={session.id}
                className={cn(portalPanelNestedClass, "grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] items-center hover:border-primary/20 transition-all duration-300")}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={[
                      "rounded-md border-none text-[10px] font-semibold px-2 py-0.5",
                      getStatusTone(session.status)
                    ].join(" ")}>
                      {session.status}
                    </Badge>
                    <span className="break-words text-sm font-semibold text-white">
                      {getHmSessionDisplayName(session)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {session.campaign} · {session.date} · {session.location}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border-white/10 bg-white/[0.02] px-3.5 text-xs text-slate-200 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
                  asChild
                >
                  <Link href={`/hiring-manager-dashboard/sessions/${session.id}`}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    View details
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Candidates in Campaign Section */}
      <Card className={cn(portalPanelElevatedClass, "rounded-xl")}>
        <CardHeader className="border-b border-white/10 p-5 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Candidates in Campaign ({campaign.joinedCandidates.length})
          </CardTitle>
          <Badge className="pointer-events-none bg-indigo-500/10 text-indigo-400 border-none px-2.5 py-0.5 text-xs font-semibold">
            Real-time assessment results
          </Badge>
        </CardHeader>
        <CardContent className="p-5">
          {campaign.joinedCandidates.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">
              No candidates have joined sessions for this campaign yet.
            </p>
          ) : (
            <div className={portalTableShellClass}>
              <table className="w-full border-collapse text-left text-xs text-foreground">
                <thead className={portalTableHeaderClass}>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Session</th>
                    <th className="p-3">Overall score</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.joinedCandidates.map((candidate) => {
                    const results = candidate.results ?? [];
                    const assessmentStack = candidate.assessmentStack ?? campaign.assessmentStack;
                    const inviteLabel = formatInviteStatusLabel(candidate.inviteStatus);
                    const hasJoined = isCandidateJoined(candidate.inviteStatus);

                    return (
                      <tr key={candidate.id} className={portalTableRowClass}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {hasJoined ? (
                              <span
                                className="relative flex h-2 w-2 shrink-0"
                                title="Joined session"
                                aria-hidden="true"
                              >
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/30 blur-[2px]" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.55)]" />
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">{candidate.name}</span>
                                {inviteLabel ? (
                                  <Badge className={cn("pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold capitalize", portalBadgeClass)}>
                                    {inviteLabel}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="mt-0.5 text-[10px] text-muted-foreground">{candidate.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {candidate.sessionName ?? "Main Session"}
                        </td>
                        <td className="p-3">
                          <AssessmentOverallScoreCell
                            assessmentStack={assessmentStack}
                            results={results}
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
                            className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
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

      <CandidateResultsDialog
        resultsDialog={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
