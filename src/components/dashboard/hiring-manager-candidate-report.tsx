"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ThumbsDown,
  ThumbsUp,
  ClipboardList,
  FileQuestion,
  ShieldCheck,
} from "lucide-react";
import { getAssessmentPluginIcon } from "@/assessments/plugins/registry";
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
  portalHeroPanelClass,
  portalScoreMeterClass,
  portalSuccessButtonClass,
  portalPanelClass,
  portalPanelElevatedClass,
  portalPanelNestedClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { isAbandonedAssessmentResult } from "@/lib/assessment-result-status";
import { isKnownAssessmentSlug, normalizeAssessmentSlugInput, normalizeSlug } from "@/lib/assessment-slug";
import {
  AssessmentAbandonedActions,
  formatAbandonedAssessmentSummary,
} from "@/components/dashboard/assessment-abandoned-actions";

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
    const result =
      results.find((candidateResult) => {
        const resultKey = getAssessmentKey(candidateResult.assessment);
        if (slug && resultKey) return slug === resultKey;
        return isSameAssessment(name, candidateResult.assessment);
      }) ?? null;
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

function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);

  if (expectedKey && resultKey) return expectedKey === resultKey;

  const expected = normalizeAssessmentSlugInput(expectedName);
  const result = normalizeAssessmentSlugInput(resultName);
  return expected && result ? expected.includes(result) || result.includes(expected) : false;
}

function getAssessmentKey(value?: string | null) {
  const slug = normalizeSlug(value);
  if (isKnownAssessmentSlug(slug)) return slug;
  return "";
}

function getRating(overallScore: number) {
  if (overallScore >= 75) {
    return {
      label: "Strong Match",
      tone: "text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
    };
  }
  if (overallScore >= 55) {
    return {
      label: "Move Forward",
      tone: "text-sky-400",
      badge: "bg-sky-500/10 text-sky-400 border-sky-500/25 shadow-[0_0_15px_rgba(14,165,233,0.06)]"
    };
  }
  if (overallScore >= 35) {
    return {
      label: "Hold / Under Review",
      tone: "text-amber-400",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.06)]"
    };
  }
  return {
    label: "Review Carefully",
    tone: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.06)]"
  };
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

function getAssessmentStatus(row: AssessmentReportRow) {
  if (isAbandonedAssessmentResult(row.result?.assessmentStatus)) {
    return {
      label: "Abandoned",
      className: "bg-orange-500/10 text-orange-400 border-none hover:bg-orange-500/10",
    };
  }
  if (row.score === null) {
    return {
      label: "Awaiting Completion",
      className: "bg-amber-500/10 text-amber-400 border-none hover:bg-amber-500/10",
    };
  }
  if (row.result?.passed === false) {
    return {
      label: "Review Required",
      className: "bg-red-500/10 text-red-400 border-none hover:bg-red-500/10",
    };
  }
  return {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-400 border-none hover:bg-emerald-500/10",
  };
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
  const overallScore =
    reportData?.compositeScore !== null &&
    reportData?.compositeScore !== undefined &&
    Number.isFinite(reportData.compositeScore)
      ? Math.round(reportData.compositeScore)
      : 0;
  const rating = getRating(overallScore);
  const displayedRating = allAssessmentsCompleted
    ? rating
    : {
        label: "Pending Completion",
        tone: "text-amber-300",
        badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-none"
      };

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
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Button
        type="button"
        disabled={Boolean(decisionSubmitting)}
        onClick={() => void handleDecision("reject")}
        className="h-[34px] rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
      >
        <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
        {decisionSubmitting === "reject" ? "Rejecting…" : "Reject"}
      </Button>
      <Button
        type="button"
        disabled={Boolean(decisionSubmitting)}
        onClick={() => void handleDecision("approve")}
        className={cn(portalSuccessButtonClass, "h-[34px]")}
      >
        <ThumbsUp className="mr-1.5 h-3.5 w-3.5 text-slate-950" />
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
          <Button
            variant="outline"
            className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
            asChild
          >
            <Link href="/hiring-manager-dashboard/candidates/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to candidates
            </Link>
          </Button>
        )}
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-6 text-sm text-red-100">
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

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      {/* Premium Header Card */}
      {!embedded && (
        <div className={cn(portalHeroPanelClass, "p-6")}>
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          
          <div className="relative space-y-4">
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                className="h-8 rounded-lg border-white/10 bg-white/[0.02] px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white shrink-0"
                asChild
              >
                <Link href="/hiring-manager-dashboard/candidates/">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to candidates
                </Link>
              </Button>

              {/* Centered Candidate Report Badge */}
              <div className="flex justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 shrink-0">
                <Badge className="pointer-events-none rounded-md bg-indigo-500/10 text-indigo-400 border-none px-2.5 py-0.5 text-xs font-semibold">
                  Candidate Report
                </Badge>
              </div>
              
              {decisionActionBar}
            </div>
            
            <div className="flex flex-col gap-2.5 pt-1">
              <div>
                <h1 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span>{candidate.name}</span>
                  <span className="text-slate-600 font-normal text-lg">•</span>
                  <span className="text-sm font-medium text-slate-400">{candidate.email || "No email listed"}</span>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                  <span>Campaign: <strong className="text-slate-200">{campaign.name}</strong></span>
                  {sessionLabel && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Session: <strong className="text-slate-200">{sessionLabel}</strong></span>
                    </>
                  )}
                  {sessionSchedule && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Scheduled: <strong className="text-slate-200">{sessionSchedule}</strong></span>
                    </>
                  )}
                  {campaign.role && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Role: <strong className="text-slate-200">{campaign.role}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {embedded && decisionActionBar && (
        <div className={cn(portalPanelNestedClass, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <p className="text-sm text-slate-300">All assessments complete — record your decision.</p>
          {decisionActionBar}
        </div>
      )}

      {decisionError && (
        <div className={cn(portalAlertErrorClass, "text-sm")}>{decisionError}</div>
      )}

      {hmDecision && hmDecision !== "pending" && (
        <div className={cn(
          "flex items-center text-sm shadow-sm",
          hmDecision === "approved" ? portalAlertInfoClass : portalAlertErrorClass
        )}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>
              Candidate decision finalized:{" "}
              <strong className="text-white uppercase font-bold tracking-wider">
                {getHmDecisionLabel(hmDecision)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Weighted Score Summary & Radar Chart */}
      <div>
        <Card className={cn(portalPanelClass, "relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md")}>
          <CardContent className="relative p-6">
            <div className="flex flex-col justify-between space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    Weighted Score
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${displayedRating.badge}`}>
                    {displayedRating.label}
                  </span>
                </div>

                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-5xl font-black leading-none text-white tabular-nums">
                    {overallScore}
                  </span>
                  <span className="text-sm font-bold text-slate-500">/100</span>
                </div>
              </div>

              <div>
                <div className="flex min-w-0 flex-col items-start gap-1.5 pb-0.5">
                  <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    Completion Status
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rows.map((row, idx) => {
                      const isDone = row.score !== null;
                      return (
                        <div
                          key={`${row.name}-${idx}`}
                          title={`${row.name}: ${isDone ? "Completed" : "Pending"}`}
                          className={`h-2.5 w-7 rounded-full transition-all duration-300 ${
                            isDone
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-in fade-in duration-300"
                              : "bg-white/10 border border-white/5"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                    <div
                      className={portalScoreMeterClass}
                      style={{ width: `${Math.max(0, Math.min(100, overallScore))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-600">
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

      {/* Assessment Breakdown List */}
      <Card className={cn(portalPanelElevatedClass, "rounded-2xl")}>
        <CardHeader className="border-b border-white/10 p-5">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Assessment breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {rows.map((row) => {
            const key = getAssessmentKey(row.name);
            const Icon = (key && getAssessmentPluginIcon(key)) || FileQuestion;
            const status = getAssessmentStatus(row);
            const scoreValue = row.score ?? 0;
            const isAbandoned = isAbandonedAssessmentResult(row.result?.assessmentStatus);
            const hasBreakdown = key ? hasAssessmentReportBreakdown(key, row.result) : false;
            const breakdownOpen = openBreakdownKey === row.name;

            return (
              <div
                key={row.name}
                className={cn(portalPanelNestedClass, "space-y-4 p-5 hover:border-primary/30 transition-all duration-300")}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${row.score !== null ? 'border-primary/20 bg-primary/5 text-primary' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-bold text-white">
                          {row.name}
                        </h3>
                        <Badge className={[
                          "rounded-md border-none text-xs font-semibold px-2 py-0.5",
                          status.className
                        ].join(" ")}>
                          {status.label}
                        </Badge>
                        <AssessmentCompletionTag metrics={row.result?.metrics ?? null} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {isAbandoned
                          ? formatAbandonedAssessmentSummary(
                              row.name,
                              row.result?.rawData as Record<string, unknown> | null | undefined,
                              typeof row.result?.rawData?.contentVersion === "string"
                                ? row.result.rawData.contentVersion
                                : null
                            )
                          : `Completed: ${formatCompletion(row.result?.completedAt)}`}
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

                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-xs text-slate-500 font-medium">Assessment Score</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {row.score === null ? "Pending" : `${row.score}%`}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-xs text-slate-500 font-medium">Overall Contribution</p>
                      <p className="mt-1 text-lg font-bold text-indigo-400">
                        {row.score === null ? "Pending" : formatPercent(row.contribution)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-12 pt-3 border-t border-white/5">
                  <div className="space-y-2 md:col-span-8 rounded-lg border border-white/5 bg-white/[0.01] p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400 font-medium">Score against assessment weighting</span>
                      <span className="text-slate-200 font-semibold">
                        {row.score === null ? "Awaiting submission" : `${row.score}% of ${row.weight}% weight`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={portalProgressBarClass}
                        style={{ width: `${scoreValue}%` }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 rounded-lg border border-white/5 bg-white/[0.01] p-3 flex flex-col justify-between">
                    <p className="text-xs text-slate-500 font-medium">Result status</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-200 font-semibold">
                      {row.score !== null ? (
                        <CheckCircle2 className="h-[18px] w-[18px] text-emerald-400" />
                      ) : (
                        <Clock3 className="h-[18px] w-[18px] text-amber-400 animate-pulse" />
                      )}
                      {row.score !== null ? "Submitted & Verified" : "Awaiting candidate"}
                    </div>
                  </div>
                </div>

                {hasBreakdown && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenBreakdownKey(breakdownOpen ? null : row.name)}
                        className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3.5 text-xs text-slate-200 hover:bg-white/[0.05] hover:text-white"
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
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
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


    </div>
  );
}
