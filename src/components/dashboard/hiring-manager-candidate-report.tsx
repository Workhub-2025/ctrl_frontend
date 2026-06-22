"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ThumbsDown,
  ThumbsUp,
  ClipboardList,
} from "lucide-react";
import { getAssessmentCatalogueIcon, getAssessmentCatalogueTitle } from "@/assessments/plugins/display";
import { AssessmentCompletionTag } from "@/assessments/plugins/report/completion-tag";
import {
  AssessmentReportBreakdown,
  hasAssessmentReportBreakdown,
} from "@/assessments/plugins/report/index";
import {
  HiringManagerPortalClientService,
  type HiringManagerAssessmentResult,
  type HiringManagerCandidateReport,
} from "@/services/hiring-manager-portal-client.service";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalBadgeClass,
  portalIconWrapClass,
  portalIconWrapLgClass,
  portalPageHeaderClass,
  portalScoreMeterClass,
  portalPanelClass,
  portalPanelElevatedClass,
  portalPanelNestedClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { isAbandonedAssessmentResult } from "@/lib/assessment-result-status";
import {
  findAssessmentResultForStackEntry,
  getAssessmentKey,
} from "@/lib/hiring-manager/assessment-matching";
import {
  AssessmentAbandonedActions,
  formatAbandonedAssessmentSummary,
} from "@/components/dashboard/assessment-abandoned-actions";
import { computeWeightedCompositeScore } from "@/lib/hiring-manager/composite-score";
import { SharedCandidateNotesPanel } from "@/components/dashboard/shared-candidate-notes-panel";

type CandidateReportProps = {
  candidateId: string;
  candidateSessionId?: string;
  embedded?: boolean;
};

type AssessmentReportRow = {
  name: string;
  weight: number;
  result: HiringManagerAssessmentResult | null;
  score: number | null;
  contribution: number;
};

function buildAssessmentRows(report: HiringManagerCandidateReport): AssessmentReportRow[] {
  const { results, campaign } = report;
  const stackItems = campaign.resolvedStackSummary?.assessments ?? [];
  if (stackItems.length === 0) return [];

  return stackItems.map(({ displayName: name, slug, weight }) => {
    const result = findAssessmentResultForStackEntry({ displayName: name, slug }, results);
    const score = result?.numericScore ?? null;

    return {
      name,
      weight,
      result,
      score,
      contribution: score === null ? 0 : Number(((score * weight) / 100).toFixed(2)),
    };
  });
}

function getRatingLabel(overallScore: number) {
  if (overallScore >= 75) return "Strong match";
  if (overallScore >= 55) return "Move forward";
  if (overallScore >= 35) return "Hold / under review";
  return "Review carefully";
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatCompletion(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAssessmentStatusLabel(row: AssessmentReportRow) {
  if (isAbandonedAssessmentResult(row.result?.assessmentStatus)) return "Abandoned";
  if (row.score === null) return "Awaiting completion";
  if (row.result?.passed === false) return "Review required";
  return "Completed";
}

function getHmDecisionLabel(decision: "approved" | "rejected") {
  return decision === "approved" ? "Move forward" : "Reject";
}


export function HiringManagerCandidateReport({ candidateId, candidateSessionId, embedded = false }: CandidateReportProps) {
  const [reportData, setReportData] = useState<HiringManagerCandidateReport | null>(null);
  const [hmDecision, setHmDecision] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState<"approve" | "reject" | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openBreakdownKey, setOpenBreakdownKey] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const resolvedSessionId = candidateSessionId ?? candidateId;

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      if (!resolvedSessionId) {
        setReportData(null);
        setLoadError("Candidate report could not be found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setDecisionError(null);
      try {
        const report = await HiringManagerPortalClientService.getCandidateReport(resolvedSessionId);

        if (!cancelled) {
          setReportData(report);
          setHmDecision(report.hmDecision ?? "pending");
        }
      } catch (loadError) {
        if (!cancelled) {
          setReportData(null);
          setLoadError(
            loadError instanceof Error
              ? loadError.message
              : "Candidate report could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [resolvedSessionId, reloadTick]);

  const rows = useMemo(() => {
    if (!reportData) return [];
    return buildAssessmentRows(reportData);
  }, [reportData]);

  const completedRows = rows.filter((row) => row.score !== null);
  const allAssessmentsCompleted = rows.length > 0 && completedRows.length === rows.length;
  const computedCompositeScore = useMemo(() => {
    if (!reportData) return null;
    const stack = reportData.campaign.resolvedStackSummary?.assessments ?? [];
    if (stack.length === 0) return null;
    return computeWeightedCompositeScore(
      stack.map((item) => ({
        displayName: item.displayName,
        slug: item.slug,
        weight: item.weight,
      })),
      reportData.results
    );
  }, [reportData]);

  const overallScore = computedCompositeScore ?? 0;
  const ratingLabel = getRatingLabel(overallScore);
  const displayedRatingLabel = allAssessmentsCompleted ? ratingLabel : "Pending completion";

  const resolvedSessionIdForActions = reportData?.sessionId ?? resolvedSessionId;
  const decisionPending = !hmDecision || hmDecision === "pending";
  const canRecordDecision = allAssessmentsCompleted && decisionPending && Boolean(resolvedSessionIdForActions);

  async function handleDecision(decision: "approve" | "reject") {
    if (!resolvedSessionIdForActions || decisionSubmitting) return;

    setDecisionSubmitting(decision);
    setDecisionError(null);

    try {
      const result = await HiringManagerPortalClientService.submitCandidateDecision({
        candidateSessionId: resolvedSessionIdForActions,
        decision,
      });
      setHmDecision(result.hmDecision);
    } catch (submitError) {
      setDecisionError(
        submitError instanceof Error
          ? submitError.message
          : "Candidate decision could not be saved."
      );
    } finally {
      setDecisionSubmitting(null);
    }
  }

  const decisionActionBar = canRecordDecision ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(decisionSubmitting)}
        onClick={() => void handleDecision("reject")}
        className="h-9 rounded-lg border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
      >
        <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
        {decisionSubmitting === "reject" ? "Rejecting…" : "Reject"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(decisionSubmitting)}
        onClick={() => void handleDecision("approve")}
        className="h-9 rounded-lg border-primary/25 bg-primary/10 px-3.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
      >
        <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
        {decisionSubmitting === "approve" ? "Saving…" : "Pass"}
      </Button>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className={cn(portalPanelNestedClass, "rounded-lg p-6 text-sm text-muted-foreground")}>
        Loading candidate report...
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="max-w-5xl space-y-4">
        {!embedded && (
          <Button variant="outline" size="sm" className="h-9 rounded-lg" asChild>
            <Link href="/hiring-manager-dashboard/candidates/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to candidates
            </Link>
          </Button>
        )}
        <div className={cn(portalAlertErrorClass, "text-sm")}>
          {loadError || "Candidate report could not be found."}
        </div>
      </div>
    );
  }

  const { candidate, campaign, assessmentSession } = reportData;

  const sessionLabel = assessmentSession?.name?.trim() || null;
  const sessionSchedule = assessmentSession?.startsAt
    ? formatCompletion(assessmentSession.startsAt)
    : null;

  const metadataParts = [
    candidate.email || "No email listed",
    campaign.name,
    sessionLabel,
    sessionSchedule,
    campaign.role,
  ].filter(Boolean);

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      {!embedded && (
        <>
          <Button variant="outline" size="sm" className="h-9 w-fit rounded-lg" asChild>
            <Link href="/hiring-manager-dashboard/candidates/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to candidates
            </Link>
          </Button>

          <header className={portalPageHeaderClass}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className={cn(portalIconWrapLgClass, "mt-0.5")} aria-hidden="true">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Candidate report
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                      {candidate.name}
                    </h1>
                    <Badge
                      className={cn(
                        "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                        portalBadgeClass
                      )}
                    >
                      {displayedRatingLabel}
                    </Badge>
                  </div>
                  <p className="max-w-2xl text-xs font-medium leading-5 text-muted-foreground">
                    {metadataParts.map((part, index) => (
                      <span key={part}>
                        {index > 0 ? (
                          <span className="mx-1.5 text-border/80 dark:text-white/20">·</span>
                        ) : null}
                        {part}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              {decisionActionBar ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">{decisionActionBar}</div>
              ) : null}
            </div>
          </header>
        </>
      )}



      {embedded && decisionActionBar && (
        <div className={cn(portalPanelNestedClass, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <p className="text-sm text-muted-foreground">All assessments complete — record your decision.</p>
          {decisionActionBar}
        </div>
      )}

      {decisionError && (
        <div className={cn(portalAlertErrorClass, "text-sm")}>{decisionError}</div>
      )}

      {hmDecision && hmDecision !== "pending" && (
        <div
          className={cn(
            "flex items-center text-sm",
            hmDecision === "approved" ? portalAlertInfoClass : portalAlertErrorClass
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>
              Candidate decision finalized:{" "}
              <strong className="font-semibold text-foreground">
                {getHmDecisionLabel(hmDecision)}
              </strong>
            </span>
          </div>
        </div>
      )}

      <div>
        <Card className={cn(portalPanelClass, "relative overflow-hidden")}>
          <CardContent className="relative p-6">
            <div className="flex flex-col justify-between space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Weighted score
                  </span>
                  <Badge
                    className={cn(
                      "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                      portalBadgeClass
                    )}
                  >
                    {displayedRatingLabel}
                  </Badge>
                </div>

                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-5xl font-semibold leading-none text-foreground tabular-nums">
                    {overallScore}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">/100</span>
                </div>
              </div>

              <div>
                <div className="flex min-w-0 flex-col items-start gap-1.5 pb-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Completion status
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rows.map((row, idx) => {
                      const isDone = row.score !== null;
                      return (
                        <div
                          key={`${row.name}-${idx}`}
                          title={`${row.name}: ${isDone ? "Completed" : "Pending"}`}
                          className={cn(
                            "h-2.5 w-7 rounded-full border transition-colors",
                            isDone
                              ? "border-primary/40 bg-primary"
                              : "border-border/60 bg-muted/30 dark:border-white/10 dark:bg-white/[0.04]"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="relative h-3 overflow-hidden rounded-full bg-muted/40 ring-1 ring-border/50 dark:bg-white/10 dark:ring-white/10">
                    <div
                      className={portalScoreMeterClass}
                      style={{ width: `${Math.max(0, Math.min(100, overallScore))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={portalPanelElevatedClass}>
        <CardHeader className="border-b border-border/50 p-5 dark:border-white/10">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className={portalIconWrapClass} aria-hidden="true">
              <ClipboardList className="h-4 w-4" />
            </span>
            Assessment breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {rows.map((row) => {
            const key = getAssessmentKey(row.name);
            const displayName = getAssessmentCatalogueTitle(key || row.name, row.name);
            const Icon = getAssessmentCatalogueIcon(key || row.name, row.result);
            const statusLabel = getAssessmentStatusLabel(row);
            const scoreValue = row.score ?? 0;
            const isAbandoned = isAbandonedAssessmentResult(row.result?.assessmentStatus);
            const hasBreakdown = key ? hasAssessmentReportBreakdown(key, row.result) : false;
            const breakdownOpen = openBreakdownKey === row.name;

            return (
              <div
                key={row.name}
                className={cn(portalPanelNestedClass, "space-y-4 p-5 transition-colors hover:border-primary/20")}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={portalIconWrapLgClass} aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-semibold text-foreground">
                          {displayName}
                        </h3>
                        <Badge
                          className={cn(
                            "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                            portalBadgeClass
                          )}
                        >
                          {statusLabel}
                        </Badge>
                        <AssessmentCompletionTag metrics={row.result?.metrics ?? null} />
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {isAbandoned
                          ? formatAbandonedAssessmentSummary(
                              row.name,
                              row.result?.rawData as Record<string, unknown> | null | undefined,
                              typeof row.result?.rawData?.contentVersion === "string"
                                ? row.result.rawData.contentVersion
                                : null
                            )
                          : formatCompletion(row.result?.completedAt)}
                      </p>
                      {isAbandoned && resolvedSessionIdForActions && key ? (
                        <AssessmentAbandonedActions
                          candidateSessionDocumentId={resolvedSessionIdForActions}
                          assessmentSlug={key}
                          assessmentLabel={row.name}
                          candidateName={candidate.name}
                          candidateEmail={candidate.email}
                          campaignName={campaign.name}
                          snapshot={
                            row.result?.rawData &&
                            typeof row.result.rawData === "object" &&
                            !(
                              "abandoned" in row.result.rawData &&
                              Object.keys(row.result.rawData).length === 1
                            )
                              ? (row.result.rawData as Record<string, unknown>)
                              : null
                          }
                          contentVersion={
                            typeof row.result?.rawData?.contentVersion === "string"
                              ? row.result.rawData.contentVersion
                              : null
                          }
                          onRecovered={() => setReloadTick((tick) => tick + 1)}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px] lg:grid-cols-3">
                    <div className={cn(portalPanelNestedClass, "p-3")}>
                      <p className="text-xs font-medium text-muted-foreground">Assessment score</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {row.score === null ? "Pending" : `${row.score}%`}
                      </p>
                    </div>

                    <div className={cn(portalPanelNestedClass, "p-3")}>
                      <p className="text-xs font-medium text-muted-foreground">Overall contribution</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {row.score === null ? "Pending" : formatPercent(row.contribution)}
                      </p>
                    </div>

                    <div className={cn(portalPanelNestedClass, "p-3")}>
                      <p className="text-xs font-medium text-muted-foreground">Session integrity</p>
                      {row.result?.integrityScore != null ? (
                        <>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {Math.round(row.result.integrityScore)}%
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {(row.result.integrityEventCount ?? 0) === 0
                              ? "No flagged events during attempt"
                              : `${row.result.integrityEventCount} flagged event${row.result.integrityEventCount === 1 ? "" : "s"} during attempt`}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-lg font-semibold text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-border/50 pt-3 md:grid-cols-12 dark:border-white/10">
                  <div className={cn(portalPanelNestedClass, "space-y-2 p-3 md:col-span-8")}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-muted-foreground">Score against assessment weighting</span>
                      <span className="font-semibold text-foreground">
                        {row.score === null ? "Awaiting submission" : `${row.score}% of ${row.weight}% weight`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                      <div
                        className={portalProgressBarClass}
                        style={{ width: `${scoreValue}%` }}
                      />
                    </div>
                  </div>

                  <div className={cn(portalPanelNestedClass, "flex flex-col justify-between p-3 md:col-span-4")}>
                    <p className="text-xs font-medium text-muted-foreground">Result status</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {row.score !== null ? "Submitted and verified" : "Awaiting candidate"}
                    </p>
                  </div>
                </div>

                {hasBreakdown && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenBreakdownKey(breakdownOpen ? null : row.name)}
                        className="h-9 rounded-lg px-3.5 text-xs"
                      >
                        <ChevronDown
                          className="mr-1.5 h-3.5 w-3.5"
                          style={{
                            transform: breakdownOpen ? "rotate(-180deg)" : "rotate(0deg)",
                            transition: "transform 300ms ease",
                          }}
                        />
                        {breakdownOpen ? "Hide performance breakdown" : "View performance breakdown"}
                        <ChevronDown
                          className="ml-1.5 h-3.5 w-3.5"
                          style={{
                            transform: breakdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 300ms ease",
                          }}
                        />
                      </Button>
                    </div>

                    {breakdownOpen && key ? (
                      <div className={cn(portalPanelNestedClass, "space-y-4 p-4")}>
                        <AssessmentReportBreakdown slug={key} result={row.result} />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {reportData.sharedCandidateDocumentId ? (
        <SharedCandidateNotesPanel
          sharedCandidateDocumentId={reportData.sharedCandidateDocumentId}
          portal="hiring_manager"
        />
      ) : null}

    </div>
  );
}
