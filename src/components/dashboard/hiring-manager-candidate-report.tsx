"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, ChevronDown, Clock3, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  HiringManagerPortalClientService,
  type HiringManagerAssessmentResult,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

type CandidateReportProps = {
  candidateId: string;
  campaignId?: string;
  candidateSessionId?: string;
};

type CandidateReportData = {
  candidate: HiringManagerCampaignDetail["joinedCandidates"][number];
  campaign: HiringManagerCampaignDetail;
};

type AssessmentReportRow = {
  name: string;
  weight: number;
  result: HiringManagerAssessmentResult | null;
  score: number | null;
  contribution: number;
};

type TypingRunMetric = {
  runIndex?: number;
  wpm?: number;
  accuracy?: number;
  mistakeCharacters?: number;
  correctCharacters?: number;
  typedCharacters?: number;
  duration?: number;
};

function buildEqualWeights(assessmentStack: string[]) {
  if (assessmentStack.length === 0) return {};
  const baseWeight = Math.floor(100 / assessmentStack.length);
  const remainder = 100 - baseWeight * assessmentStack.length;
  return assessmentStack.reduce<Record<string, number>>((weights, name, index) => {
    weights[name] = baseWeight + (index < remainder ? 1 : 0);
    return weights;
  }, {});
}

function getCampaignWeights(
  assessmentStack: string[],
  assessmentSettings?: Record<string, unknown> | null
) {
  const rawWeights =
    assessmentSettings &&
    typeof assessmentSettings.weights === "object" &&
    assessmentSettings.weights !== null &&
    !Array.isArray(assessmentSettings.weights)
      ? (assessmentSettings.weights as Record<string, unknown>)
      : null;

  if (!rawWeights) return buildEqualWeights(assessmentStack);

  return assessmentStack.reduce<Record<string, number>>((weights, assessmentName) => {
    const matchedEntry = Object.entries(rawWeights).find(([key]) => isSameAssessment(assessmentName, key));
    const numericValue = matchedEntry ? Number(matchedEntry[1]) : Number.NaN;
    weights[assessmentName] = Number.isFinite(numericValue) ? numericValue : 0;
    return weights;
  }, {});
}

function isSameAssessment(expectedName: string, resultName: string) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);

  if (expectedKey && resultKey) return expectedKey === resultKey;

  const expected = normalizeAssessmentText(expectedName);
  const result = normalizeAssessmentText(resultName);
  return expected.includes(result) || result.includes(expected);
}

function normalizeAssessmentText(value: string) {
  return value
    .toLowerCase()
    .replace(/prioritisation/g, "prioritization")
    .replace(/[^a-z0-9]/g, "");
}

function getAssessmentKey(value: string) {
  const normalized = normalizeAssessmentText(value);

  if (normalized.includes("prioritization") || normalized === "pja") {
    return "prioritization";
  }
  if (normalized.includes("situationaljudgement") || normalized === "sjt") {
    return "situational-judgement";
  }
  if (normalized.includes("callsimulation")) {
    return "call-simulation";
  }
  if (normalized.includes("typing")) {
    return "typing";
  }

  return "";
}

function getRating(overallScore: number) {
  if (overallScore >= 75) return { label: "Strong", tone: "text-emerald-300" };
  if (overallScore >= 55) return { label: "Move forward", tone: "text-sky-300" };
  if (overallScore >= 35) return { label: "Hold", tone: "text-amber-300" };
  return { label: "Review carefully", tone: "text-red-300" };
}

function buildAssessmentRows(
  assessmentStack: string[],
  results: HiringManagerAssessmentResult[] = [],
  assessmentSettings?: Record<string, unknown> | null
): AssessmentReportRow[] {
  const expectedAssessments = assessmentStack.length
    ? assessmentStack
    : results.map((result) => result.assessment);
  const weights = getCampaignWeights(expectedAssessments, assessmentSettings);

  return expectedAssessments.map((name) => {
    const result =
      results.find((candidateResult) =>
        isSameAssessment(name, candidateResult.assessment)
      ) ?? null;
    const score = result?.numericScore ?? null;
    const weight = weights[name] ?? 0;

    return {
      name,
      weight,
      result,
      score,
      contribution: score === null ? 0 : Number(((score * weight) / 100).toFixed(2)),
    };
  });
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

function getTypingRuns(metrics?: Record<string, unknown> | null) {
  const runs = metrics?.assessmentRuns;
  return Array.isArray(runs) ? (runs as TypingRunMetric[]) : [];
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "Not recorded";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function getAssessmentStatus(row: AssessmentReportRow) {
  if (row.score === null) {
    return {
      label: "Not completed",
      className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    };
  }
  if (row.result?.passed === false) {
    return {
      label: "Completed - below threshold",
      className: "border-red-400/20 bg-red-400/10 text-red-100",
    };
  }
  return {
    label: "Completed",
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  };
}

export function HiringManagerCandidateReport({ candidateId, campaignId, candidateSessionId }: CandidateReportProps) {
  const [reportData, setReportData] = useState<CandidateReportData | null>(null);
  const [decision, setDecision] = useState<"Move forward" | "Reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openBreakdownKey, setOpenBreakdownKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setIsLoading(true);
      setError(null);
      try {
        const campaigns = campaignId
          ? [
              await HiringManagerPortalClientService.getCampaignDetail(campaignId),
            ].filter(Boolean) as HiringManagerCampaignDetail[]
          : await HiringManagerPortalClientService.getCampaignDetails();
        const matched = campaigns
          .flatMap((campaign) =>
            campaign.joinedCandidates.map((candidate) => ({ candidate, campaign }))
          )
          .find((item) =>
            candidateSessionId
              ? item.candidate.id === candidateSessionId
              : item.candidate.id === candidateId
          );

        if (!cancelled) {
          setReportData(matched ?? null);
          if (!matched) {
            setError("Candidate report could not be found.");
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
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
  }, [candidateId, campaignId, candidateSessionId]);

  const rows = useMemo(() => {
    if (!reportData) return [];
    return buildAssessmentRows(
      reportData.candidate.assessmentStack ?? reportData.campaign.assessmentStack,
      reportData.candidate.results,
      reportData.campaign.assessmentSettings
    );
  }, [reportData]);

  const completedRows = rows.filter((row) => row.score !== null);
  const allAssessmentsCompleted = rows.length > 0 && completedRows.length === rows.length;
  const overallScore = Math.round(rows.reduce((total, row) => total + row.contribution, 0));
  const rating = getRating(overallScore);
  const displayedRating = allAssessmentsCompleted
    ? rating
    : { label: "Pending Completion", tone: "text-amber-300" };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0b1220] p-6 text-sm text-slate-300">
        Loading candidate report...
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="max-w-5xl space-y-4">
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
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-6 text-sm text-red-100">
          {error || "Candidate report could not be found."}
        </div>
      </div>
    );
  }

  const { candidate, campaign } = reportData;

  return (
    <div className="max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
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
          <Badge className="rounded-md border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-400/10">
            Candidate report
          </Badge>
          <div>
            <h1 className="break-words text-xl font-semibold leading-7 text-white sm:text-2xl">
              {candidate.name}
            </h1>
            <p className="mt-2 break-words text-sm leading-6 text-slate-300">
              {candidate.email || "Email not available"} · {campaign.name}
            </p>
          </div>
        </div>

        {allAssessmentsCompleted && (
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[300px]">
            <Button
              type="button"
              onClick={() => setDecision("Reject")}
              className="h-10 rounded-md bg-red-500 px-3 text-sm font-medium text-white hover:bg-red-400"
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              type="button"
              onClick={() => setDecision("Move forward")}
              className="h-10 rounded-md bg-emerald-400 px-3 text-sm font-medium text-slate-950 hover:bg-emerald-300"
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Move forward
            </Button>
          </div>
        )}
      </section>

      {!allAssessmentsCompleted && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm leading-6 text-amber-100">
          This candidate has not completed all assigned assessments yet. Results
          can be reviewed as they arrive, but final hiring actions are hidden
          until every selected assessment is complete.
        </p>
      )}

      {decision && (
        <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
          Decision selected: <span className="font-medium text-white">{decision}</span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Overall rating</p>
            <p className={`mt-2 text-2xl font-semibold ${displayedRating.tone}`}>
              {displayedRating.label}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Weighted score</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {overallScore}%
            </p>
            <Progress value={overallScore} className="mt-3 h-2 bg-white/10" />
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Assessments completed</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {completedRows.length}/{rows.length || 1}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
        <CardHeader className="border-b border-white/10 p-4">
          <CardTitle className="text-base text-white">Assessment breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {rows.map((row) => {
            const status = getAssessmentStatus(row);
            const typingRuns = getTypingRuns(row.result?.metrics);
            const scoreValue = row.score ?? 0;
            const hasBreakdown =
              typingRuns.length > 0 ||
              row.result?.wpm !== null && row.result?.wpm !== undefined;
            const breakdownOpen = openBreakdownKey === row.name;

            return (
              <div
                key={row.name}
                className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-base font-semibold text-white">
                        {row.name}
                      </p>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Completed: {formatCompletion(row.result?.completedAt)}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[470px]">
                    <div className="rounded-md border border-white/10 bg-[#08101d] p-3">
                      <p className="text-xs text-slate-500">Assessment score</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {row.score === null ? "Pending" : `${row.score}%`}
                      </p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-[#08101d] p-3">
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatDuration(row.result?.durationSeconds)}
                      </p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-[#08101d] p-3">
                      <p className="text-xs text-slate-500">Overall contribution</p>
                      <p className="mt-1 text-lg font-semibold text-sky-200">
                        {row.score === null ? "Pending" : formatPercent(row.contribution)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-3 rounded-md border border-white/10 bg-[#08101d] p-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                      <span>Score against assessment weighting</span>
                      <span className="text-slate-300">
                        {row.score === null ? "Awaiting submission" : `${row.score}% of ${row.weight}%`}
                      </span>
                    </div>
                    <Progress value={scoreValue} className="h-2 bg-white/10" />
                  </div>

                  <div className="grid gap-2 lg:grid-cols-1">
                    <div className="rounded-md border border-white/10 bg-[#08101d] p-3">
                      <p className="text-xs text-slate-500">Result status</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                        {row.score !== null ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-amber-300" />
                        )}
                        {row.score !== null ? "Submitted" : "Awaiting completion"}
                      </div>
                    </div>
                  </div>
                </div>

                {hasBreakdown && (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpenBreakdownKey(breakdownOpen ? null : row.name)}
                      className="h-9 rounded-md border-white/10 bg-[#08101d] px-3 text-xs text-slate-100 hover:bg-white/[0.05]"
                    >
                      <ChevronDown
                        className={`mr-2 h-4 w-4 transition-transform ${breakdownOpen ? "rotate-180" : ""}`}
                      />
                      {breakdownOpen ? "Hide breakdown" : "View breakdown"}
                    </Button>

                    {breakdownOpen && (
                      <div className="rounded-md border border-white/10 bg-[#08101d] p-3">
                        {row.result?.wpm !== null && row.result?.wpm !== undefined && (
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                              <p className="text-xs text-slate-500">Average WPM</p>
                              <p className="mt-1 text-xl font-semibold text-white">
                                {row.result.wpm}
                              </p>
                            </div>
                            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                              <p className="text-xs text-slate-500">Average accuracy</p>
                              <p className="mt-1 text-xl font-semibold text-white">
                                {row.result.accuracy ?? "Pending"}%
                              </p>
                            </div>
                            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                              <p className="text-xs text-slate-500">Average mistakes</p>
                              <p className="mt-1 text-xl font-semibold text-white">
                                {row.result.mistakeCount ?? "Pending"}
                              </p>
                            </div>
                          </div>
                        )}

                        {typingRuns.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Typing run detail
                            </p>
                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                              {typingRuns.map((run, index) => (
                                <div
                                  key={`${row.name}-${run.runIndex ?? index}`}
                                  className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <p className="text-xs font-medium text-slate-300">
                                    Run {run.runIndex ?? index + 1}
                                  </p>
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p className="text-slate-500">WPM</p>
                                      <p className="mt-1 font-semibold text-white">
                                        {run.wpm ?? "Pending"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Accuracy</p>
                                      <p className="mt-1 font-semibold text-white">
                                        {run.accuracy ?? "Pending"}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Mistakes</p>
                                      <p className="mt-1 font-semibold text-white">
                                        {run.mistakeCharacters ?? "Pending"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Characters</p>
                                      <p className="mt-1 font-semibold text-white">
                                        {run.correctCharacters ?? 0}/{run.typedCharacters ?? 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
