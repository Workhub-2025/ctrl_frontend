"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  RefreshCw,
  Search,
  Share2,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import type {
  HiringManagerCampaignDetail,
  HiringManagerAssessmentResult,
} from "@/services/hiring-manager-portal-client.service";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { HmErrorBanner, HmRefreshButton } from "@/components/dashboard/hiring-manager-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalCssHoverTooltipClass,
  portalIconWrapLgClass,
  portalInputClass,
  portalLabelClass,
  portalPanelBorderClass,
  portalPanelElevatedClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHmAssessmentItemStatus } from "@/lib/assessment-result-status";
import {
  buildCompositeStackEntries,
  type CompositeStackEntry,
} from "@/lib/hiring-manager/campaign-stack-score";
import { computeWeightedCompositeScore } from "@/lib/hiring-manager/composite-score";
import { findAssessmentResultForStackEntry, getAssessmentKey } from "@/lib/hiring-manager/assessment-matching";

type CandidateRow = {
  id: string;
  candidateSessionId: string;
  name: string;
  email?: string;
  status?: string;
  campaignId: string;
  campaignName: string;
  sessionName: string;
  progress: "completed" | "in_progress" | "not_started";
  completedAssessments: number;
  totalAssessments: number;
  completion: number;
  results: HiringManagerAssessmentResult[];
  assessmentStack: string[];
  overallScore: number | null;
  stackEntries: CompositeStackEntry[];
  hmDecision: "pending" | "approved" | "rejected";
  clientOutcome: "pending_review" | "reviewed" | "progressed" | "hired" | "rejected" | null;
};

function buildCandidateRows(campaigns: HiringManagerCampaignDetail[]): CandidateRow[] {
  const rows: CandidateRow[] = [];

  for (const campaign of campaigns) {
    for (const candidate of campaign.joinedCandidates) {
      const campaignId = candidate.campaignId ?? campaign.id;
      const results = candidate.results ?? [];
      const assessmentCount = Math.max(
        candidate.assessmentStack?.length ?? campaign.assessmentStack.length,
        results.length,
        1
      );
      const completedAssessments = new Set(
        results
          .filter((result) => result.completedAt || result.numericScore !== null)
          .map((result) => result.id || result.assessment)
      ).size;
      const totalAssessments = Math.max(assessmentCount, results.length, 1);
      const completion = Math.round((completedAssessments / totalAssessments) * 100);
      const progress =
        completedAssessments >= totalAssessments
          ? "completed"
          : completedAssessments > 0
            ? "in_progress"
            : "not_started";

      const expectedAssessments = candidate.assessmentStack ?? campaign.assessmentStack ?? [];
      const stackEntries = buildCompositeStackEntries({
        assessmentStack: expectedAssessments,
        assessmentSettings: campaign.assessmentSettings,
        resolvedStackSummary: campaign.resolvedStackSummary,
      });
      const overallScore = computeWeightedCompositeScore(stackEntries, results);

      rows.push({
        id: candidate.id,
        candidateSessionId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
        campaignId,
        campaignName: candidate.campaignName ?? campaign.name,
        sessionName: candidate.sessionName ?? "Session",
        progress,
        completedAssessments,
        totalAssessments,
        completion,
        results,
        assessmentStack: expectedAssessments,
        overallScore,
        stackEntries,
        hmDecision: candidate.hmDecision ?? "pending",
        clientOutcome: candidate.clientReviewStatus ?? null,
      });
    }
  }

  return rows.sort((a, b) =>
    `${a.campaignName}${a.sessionName}${a.name}`.localeCompare(
      `${b.campaignName}${b.sessionName}${b.name}`
    )
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function progressLabel(progress: CandidateRow["progress"]) {
  switch (progress) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In progress";
    case "not_started":
    default:
      return "Not started";
  }
}

function hmDecisionLabel(decision: CandidateRow["hmDecision"]) {
  if (decision === "approved") return "Moved forward by hiring manager";
  if (decision === "rejected") return "Rejected by hiring manager";
  return "HM decision pending";
}

function clientOutcomeLabel(outcome: CandidateRow["clientOutcome"]) {
  if (outcome === "pending_review") return "Awaiting client review";
  if (outcome === "reviewed") return "Reviewed by client";
  if (outcome === "progressed") return "Progressed by client";
  if (outcome === "hired") return "Hired by client";
  if (outcome === "rejected") return "Rejected by client";
  return "Not shared with client";
}

export function HiringManagerCandidatesView() {
  const { campaignDetails: campaigns, error, lastRefreshAt, loading, loadOverview } =
    useHiringManagerPortal();
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = async () => {
    const startTime = Date.now();
    setIsForceRefreshing(true);
    try {
      await loadOverview(true);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const minSpin = 800;
      if (elapsedTime < minSpin) {
        await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
      }
      setIsForceRefreshing(false);
    }
  };

  const isRefreshing = loading || isForceRefreshing;

  const candidates = useMemo(() => buildCandidateRows(campaigns), [campaigns]);
  const campaignOptions = useMemo(
    () => uniqueOptions(candidates.map((candidate) => candidate.campaignName)),
    [candidates]
  );
  const sessionOptions = useMemo(
    () =>
      uniqueOptions(
        candidates
          .filter((candidate) => campaignFilter === "all" || candidate.campaignName === campaignFilter)
          .map((candidate) => candidate.sessionName)
      ),
    [campaignFilter, candidates]
  );
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const matchesCampaign = campaignFilter === "all" || candidate.campaignName === campaignFilter;
        const matchesSession = sessionFilter === "all" || candidate.sessionName === sessionFilter;
        const matchesProgress = progressFilter === "all" || candidate.progress === progressFilter;
        const matchesOutcome = outcomeFilter === "all" ||
          (outcomeFilter === "not_shared" ? candidate.clientOutcome === null : candidate.clientOutcome === outcomeFilter);
        const matchesSearch = !searchQuery.trim() ||
          candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (candidate.email ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCampaign && matchesSession && matchesProgress && matchesOutcome && matchesSearch;
      }),
    [campaignFilter, candidates, outcomeFilter, progressFilter, sessionFilter, searchQuery]
  );

  const stats = useMemo(() => {
    let awaitingDecision = 0;
    let shared = 0;
    let finalOutcomes = 0;

    for (const c of candidates) {
      if (c.progress === "completed" && c.hmDecision === "pending") awaitingDecision++;
      if (c.clientOutcome) shared++;
      if (c.clientOutcome === "hired" || c.clientOutcome === "rejected") finalOutcomes++;
    }

    return {
      total: candidates.length,
      awaitingDecision,
      shared,
      finalOutcomes,
    };
  }, [candidates]);

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Candidate workspace"
        title="Candidates"
        description="All joined candidates across active campaigns, with assessment progress and report access."
        icon={Users}
      />

      {error ? <HmErrorBanner>{error}</HmErrorBanner> : null}

      {/* Stats Summary Widget Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <PortalStatTile
          label="Total Candidates"
          value={stats.total}
          detail="registered applicants"
          icon={Users}
        />
        <PortalStatTile
          label="Awaiting HM decision"
          value={stats.awaitingDecision}
          detail="completed assessments to review"
          icon={UserRoundCheck}
        />
        <PortalStatTile
          label="Shared with client"
          value={stats.shared}
          detail="explicitly progressed by HM"
          icon={Share2}
        />
        <PortalStatTile
          label="Final outcomes"
          value={stats.finalOutcomes}
          detail="hired or rejected by client"
          icon={BriefcaseBusiness}
        />
      </div>

      {/* Unified Search & Filters Card */}
      <PortalPanel className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Search Input */}
            <div className="flex-1 space-y-2">
              <label htmlFor="hm-candidate-search" className={portalLabelClass}>Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  id="hm-candidate-search"
                  type="text"
                  name="candidate-search"
                  autoComplete="off"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(portalInputClass, "h-10 w-full pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground")}
                />
              </div>
            </div>

            {/* Select Filters */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 flex-[2] md:flex-[3]">
              <FilterSelect
                label="Campaign"
                allLabel="All campaigns"
                value={campaignFilter}
                onChange={(value) => {
                  setCampaignFilter(value);
                  setSessionFilter("all");
                }}
                options={campaignOptions}
              />
              <FilterSelect
                label="Outcome"
                allLabel="All outcomes"
                value={outcomeFilter}
                onChange={setOutcomeFilter}
                options={[
                  { label: "Not shared", value: "not_shared" },
                  { label: "Pending client review", value: "pending_review" },
                  { label: "Reviewed", value: "reviewed" },
                  { label: "Progressed", value: "progressed" },
                  { label: "Hired", value: "hired" },
                  { label: "Rejected", value: "rejected" },
                ]}
              />
              <FilterSelect
                label="Session"
                allLabel="All sessions"
                value={sessionFilter}
                onChange={setSessionFilter}
                options={sessionOptions}
              />
              <FilterSelect
                label="Progress"
                allLabel="All progress"
                value={progressFilter}
                onChange={setProgressFilter}
                options={[
                  { label: "Completed", value: "completed" },
                  { label: "In progress", value: "in_progress" },
                  { label: "Not started", value: "not_started" },
                ]}
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {(campaignFilter !== "all" || sessionFilter !== "all" || progressFilter !== "all" || outcomeFilter !== "all" || searchQuery !== "") && (
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <p className="text-xs text-muted-foreground">
                Found {filteredCandidates.length} matches of {candidates.length} total candidates
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCampaignFilter("all");
                  setSessionFilter("all");
                  setProgressFilter("all");
                  setOutcomeFilter("all");
                  setSearchQuery("");
                }}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </PortalPanel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          {lastRefreshAt
            ? `Last refresh: ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(lastRefreshAt))}`
            : "Not refreshed yet"}
        </p>
        <HmRefreshButton onClick={() => void handleRefresh()} loading={isRefreshing} />
      </div>

      {/* Candidate List Container */}
      <div className="grid gap-4">
        {filteredCandidates.length === 0 ? (
          <PortalEmptyState
            icon={Users}
            title={candidates.length === 0 ? "No candidates yet" : "No matches"}
            description={
              candidates.length === 0
                ? "Candidates appear here after they join a campaign session."
                : "Adjust filters or clear the search term to see more results."
            }
          />
        ) : (
          filteredCandidates.map((candidate) => (
            <PortalPanel
              key={`${candidate.campaignId}-${candidate.candidateSessionId}`}
              className="space-y-5"
            >
                {/* Top Section: Avatar, Meta Info, and Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(portalIconWrapLgClass, "rounded-xl text-sm font-black uppercase")}>
                      {candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-foreground tracking-tight leading-snug">
                          {candidate.name}
                        </h2>
                        <Badge className={cn(portalBadgeClass, "pointer-events-none border-none text-[10px] font-semibold")}>
                          {progressLabel(candidate.progress)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 break-all font-medium">
                        {candidate.email || "Email not available"}
                      </p>
                      <p className={cn(portalLabelClass, "mt-1 text-[10px]")}>
                        {candidate.campaignName} · {candidate.sessionName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end shrink-0">
                    {/* Completion stats */}
                    <div className="text-right border-r border-border/60 pr-4 dark:border-white/5">
                      <p className={cn(portalLabelClass, "text-[10px]")}>Completed</p>
                      <p className="text-sm font-extrabold text-foreground tabular-nums">
                        {candidate.completedAssessments}/{candidate.totalAssessments} Done
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className={cn(
                        portalInputClass,
                        "group h-9 rounded-xl bg-background/50 px-4 text-xs font-semibold text-foreground transition-colors hover:!bg-muted hover:!text-foreground hover:border-primary/30 dark:bg-white/[0.02] dark:hover:!bg-white/[0.08] dark:hover:!text-white"
                      )}
                      asChild
                    >
                      <Link href={`/hiring-manager-dashboard/candidates/${candidate.candidateSessionId}/?campaignId=${candidate.campaignId}&candidateSessionId=${candidate.candidateSessionId}`}>
                        View report
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <ol className="grid gap-2 border-t border-border pt-4 md:grid-cols-3" aria-label="Candidate decision journey">
                  <li className="flex min-w-0 items-start gap-3 rounded-md bg-muted/40 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment</p><p className="mt-0.5 text-sm font-medium text-foreground">{progressLabel(candidate.progress)}</p></div>
                  </li>
                  <li className="flex min-w-0 items-start gap-3 rounded-md bg-muted/40 p-3">
                    {candidate.hmDecision === "rejected" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /> : <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HM decision</p><p className="mt-0.5 text-sm font-medium text-foreground">{hmDecisionLabel(candidate.hmDecision)}</p></div>
                  </li>
                  <li className="flex min-w-0 items-start gap-3 rounded-md bg-muted/40 p-3">
                    {candidate.clientOutcome === "hired" ? <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : candidate.clientOutcome === "rejected" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /> : <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client outcome</p><p className="mt-0.5 text-sm font-medium text-foreground">{clientOutcomeLabel(candidate.clientOutcome)}</p></div>
                  </li>
                </ol>

                {/* Redesigned Performance breakdown segment tracks */}
                <div className="space-y-4 border-t border-border/60 pt-4">
                  {/* Overall Weighted Score Bar — shown first */}
                  {candidate.completedAssessments > 0 && candidate.overallScore !== null && (
                    <div className="relative group space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Overall weighted score</span>
                        <span className="font-extrabold text-indigo-400 tabular-nums">
                          {candidate.overallScore}%
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full border border-border/60 bg-muted dark:border-white/5 dark:bg-white/5">
                        <div
                          className={portalProgressBarClass}
                          style={{ width: `${candidate.overallScore}%` }}
                        />
                      </div>

                      {/* Tooltip with weighted score breakdown */}
                      <div className={cn(portalCssHoverTooltipClass, "w-64")}>
                        <p className="mb-2 text-sm font-semibold text-foreground">Weighted score breakdown</p>
                        <div className="space-y-1.5">
                          {candidate.stackEntries.map((entry) => {
                            const result = findAssessmentResultForStackEntry(entry, candidate.results);
                            const itemStatus = getHmAssessmentItemStatus(result);
                            const isCompleted = itemStatus === "completed";
                            const isAbandoned = itemStatus === "abandoned";
                            const score = result?.numericScore ?? 0;
                            const contribution = isCompleted
                              ? parseFloat(((score * entry.weight) / 100).toFixed(1))
                              : 0;

                            return (
                              <div key={entry.displayName} className="flex justify-between items-center text-xs">
                                <div className="flex flex-col min-w-0">
                                  <span className="break-words font-medium text-foreground">{entry.displayName}</span>
                                  <span className="text-[0.625rem] font-semibold text-muted-foreground">Weight: {entry.weight}%</span>
                                </div>
                                <div className="text-right pl-2 shrink-0">
                                  <span className="font-semibold text-foreground">
                                    {isAbandoned ? "Abandoned" : isCompleted ? `${score}%` : "Pending"}
                                  </span>
                                  {isCompleted && (
                                    <span className="ml-1.5 text-[0.625rem] font-bold text-primary">(+{contribution}%)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5 text-xs font-bold text-foreground">
                            <span>Total weighted score</span>
                            <span className="text-primary">{candidate.overallScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Segmented per-assessment scores bar — shown second */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">Assessment performance breakdown</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        Hover segments for detailed scores
                      </span>
                    </div>
                    <div className="h-3 w-full flex gap-1.5 overflow-visible">
                      {(() => {
                        const expectedAssessments = candidate.stackEntries;
                        return expectedAssessments.map((entry, idx) => {
                          const stackName = entry.displayName;
                          const matchedResult = findAssessmentResultForStackEntry(entry, candidate.results);
                          const itemStatus = getHmAssessmentItemStatus(matchedResult);
                          const isCompleted = itemStatus === "completed";
                          const isAbandoned = itemStatus === "abandoned";
                          const scoreValue = matchedResult?.numericScore ?? 0;
                          const key = getAssessmentKey(stackName, matchedResult);

                          const colorClass = isAbandoned ? "bg-orange-500" : "bg-primary";

                          // Tooltip metrics content
                          let metricsContent = null;
                          if (isCompleted && matchedResult) {
                            const rawFlag = matchedResult.metrics?.criticalFlagCount;
                            const flagCount =
                              typeof rawFlag === "number"
                                ? rawFlag
                                : Array.isArray(matchedResult.metrics?.criticalFlags)
                                  ? matchedResult.metrics.criticalFlags.length
                                  : null;
                            if (key === "typing") {
                              const wpm = Number(
                                matchedResult.wpm ?? matchedResult.metrics?.wpm ?? 0,
                              );
                              const accuracy = Number(
                                matchedResult.accuracy ?? matchedResult.metrics?.accuracy ?? 0,
                              );
                              metricsContent = (
                                <span>
                                  {wpm} WPM · {Math.round(accuracy)}% Acc
                                </span>
                              );
                            } else if (key === "prioritisation" && matchedResult.metrics) {
                              const m = matchedResult.metrics as Record<string, unknown>;
                              metricsContent = (
                                <span>High: {Math.round(Number(m.highPriorityAccuracy ?? 0))}% · Mid: {Math.round(Number(m.mediumPriorityAccuracy ?? 0))}% · Low: {Math.round(Number(m.lowPriorityAccuracy ?? 0))}%</span>
                              );
                            } else if (key === "situational-judgement" && matchedResult.metrics) {
                              const m = matchedResult.metrics as Record<string, unknown>;
                              metricsContent = (
                                <span>Flags: {Number(m.materialRiskFlagCount ?? flagCount ?? 0)}</span>
                              );
                            } else if (key === "short-term-memory" && matchedResult.metrics) {
                              const m = matchedResult.metrics as Record<string, unknown>;
                              metricsContent = (
                                <span>
                                  Recall: {Math.round(Number(m.factRecallAccuracy ?? 0))}% · Critical:{" "}
                                  {Math.round(Number(m.criticalFactAccuracy ?? 0))}%
                                </span>
                              );
                            } else if (key === "call-simulation") {
                              metricsContent = (
                                <span>
                                  Score: {scoreValue}%
                                  {flagCount != null ? ` · Flags: ${flagCount}` : ""}
                                </span>
                              );
                            } else if (flagCount != null) {
                              metricsContent = <span>Critical flags: {flagCount}</span>;
                            }
                          }

                          return (
                            <div
                              key={`${stackName}-${idx}`}
                              className={cn(
                                "relative group flex-1 h-full overflow-visible rounded-full border bg-muted/30 dark:bg-white/[0.04]",
                                portalPanelBorderClass
                              )}
                            >
                              {/* Inner filled score bar */}
                              <div
                                className={`h-full ${colorClass} rounded-full transition-[width] duration-500`}
                                style={{ width: `${isAbandoned ? 100 : isCompleted ? scoreValue : 0}%` }}
                              />
                                              {/* Tooltip */}
                              <div className={cn(portalCssHoverTooltipClass, "w-56")}>
                                <p className="mb-1 text-sm font-semibold text-foreground">{stackName}</p>
                                {isAbandoned ? (
                                  <p className="text-xs italic text-amber-600 dark:text-amber-400">
                                    Abandoned — contact the candidate to find out what happened.
                                  </p>
                                ) : isCompleted && matchedResult ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium text-muted-foreground">Assessment score</span>
                                      <span className="font-extrabold text-foreground">{scoreValue}%</span>
                                    </div>
                                    {metricsContent && (
                                      <div className="mt-1 border-t border-border/60 pt-1 text-xs font-semibold text-foreground">
                                        {metricsContent}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs italic text-amber-600 dark:text-amber-400">Awaiting completion (Pending)</p>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

            </PortalPanel>
          ))
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
}) {
  return (
    <div className="space-y-2">
      <p className={portalLabelClass}>{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(portalInputClass, "h-10 text-foreground transition-colors hover:bg-muted hover:text-foreground")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => {
            const item = typeof option === "string" ? { label: option, value: option } : option;
            return (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
