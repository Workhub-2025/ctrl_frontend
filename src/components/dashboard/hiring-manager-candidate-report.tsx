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
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  ShieldCheck
} from "lucide-react";
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

function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);

  if (expectedKey && resultKey) return expectedKey === resultKey;

  const expected = normalizeAssessmentText(expectedName);
  const result = normalizeAssessmentText(resultName);
  return (expected && result) ? (expected.includes(result) || result.includes(expected)) : false;
}

function normalizeAssessmentText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/prioritisation/g, "prioritization")
    .replace(/[^a-z0-9]/g, "");
}

function getAssessmentKey(value?: string | null) {
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

function getAssessmentIcon(name: string) {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("typing")) {
    return Keyboard;
  }
  if (lowercase.includes("prioriti") || lowercase.includes("order")) {
    return ClipboardList;
  }
  if (lowercase.includes("judgement") || lowercase.includes("sjt") || lowercase.includes("behavior")) {
    return BrainCircuit;
  }
  if (lowercase.includes("call") || lowercase.includes("audio") || lowercase.includes("simulat")) {
    return PhoneCall;
  }
  return FileQuestion;
}

const COMPETENCY_FLOORS: Record<string, number> = {
  C1: 55,
  C2: 55,
  C3: 60,
  C4: 45,
  C5: 55,
  C6: 40,
};

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
    : {
        label: "Pending Completion",
        tone: "text-amber-300",
        badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-none"
      };

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
      {/* Premium Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/80 to-[#0b1329]/50 backdrop-blur-md p-6 shadow-xl">
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
            
            {allAssessmentsCompleted && (
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  onClick={() => setDecision("Reject")}
                  className="h-8.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                >
                  <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => setDecision("Move forward")}
                  className="h-8.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-300 transition-all shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                >
                  <ThumbsUp className="mr-1.5 h-3.5 w-3.5 text-slate-950" />
                  Pass
                </Button>
              </div>
            )}
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
                {candidate.sessionName && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>Session Date: <strong className="text-slate-200">{candidate.sessionName}</strong></span>
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

      {!allAssessmentsCompleted && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm leading-6 text-amber-200">
          This candidate has not completed all assigned assessments yet. Results
          can be reviewed as they arrive, but final hiring actions are hidden
          until every selected assessment is complete.
        </p>
      )}

      {decision && (
        <div className={[
          "rounded-xl border px-4 py-3 flex items-center justify-between text-sm shadow-sm",
          decision === "Move forward"
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
            : "border-red-500/20 bg-red-500/5 text-red-300"
        ].join(" ")}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Candidate decision finalized: <strong className="text-white uppercase font-bold tracking-wider">{decision}</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDecision(null)}
            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 text-[11px]"
          >
            Reset decision
          </Button>
        </div>
      )}

      {/* Stats Summary Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:bg-[#0b1329]/45 backdrop-blur-md">
          <CardContent className="p-5">
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Overall Recommendation
            </span>
            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-semibold ${displayedRating.badge}`}>
                {displayedRating.label}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Based on overall cumulative score from weighted assessments.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:bg-[#0b1329]/45 backdrop-blur-md">
          <CardContent className="p-5">
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider flex items-center justify-between">
              <span>Weighted Score</span>
              <span className="text-sm font-bold text-white">{overallScore}%</span>
            </span>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${overallScore}%` }}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Composite score weighted by custom campaign settings.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:bg-[#0b1329]/45 backdrop-blur-md">
          <CardContent className="p-5">
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
              Assessments completed
            </span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{completedRows.length}</span>
              <span className="text-xs text-slate-500">of {rows.length || 1} completed</span>
            </div>
            <div className="mt-3.5 flex gap-1.5">
              {rows.map((row, idx) => {
                const isDone = row.score !== null;
                return (
                  <div
                    key={`${row.name}-${idx}`}
                    title={`${row.name}: ${isDone ? "Completed" : "Pending"}`}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      isDone
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                        : "bg-white/10 border border-white/5"
                    }`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Breakdown List */}
      <Card className="rounded-2xl border border-white/10 bg-[#0b1329]/45 backdrop-blur-md shadow-2xl">
        <CardHeader className="border-b border-white/10 p-5">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Assessment breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {rows.map((row) => {
            const Icon = getAssessmentIcon(row.name);
            const status = getAssessmentStatus(row);
            const typingRuns = getTypingRuns(row.result?.metrics);
            const scoreValue = row.score ?? 0;
            const key = getAssessmentKey(row.name);
            const isPrioritization = key === "prioritization";
            const isSJT = key === "situational-judgement";
            const hasBreakdown =
              typingRuns.length > 0 ||
              (row.result?.wpm !== null && row.result?.wpm !== undefined) ||
              (row.score !== null && (isPrioritization || isSJT) && row.result?.metrics !== null && row.result?.metrics !== undefined);
            const breakdownOpen = openBreakdownKey === row.name;

            return (
              <div
                key={row.name}
                className="space-y-4 rounded-xl border border-white/10 bg-[#0b1329]/20 p-5 hover:border-primary/30 transition-all duration-300"
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
                      </div>
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        Completed: {formatCompletion(row.result?.completedAt)}
                      </p>
                    </div>
                  </div>

                  <div className={`grid gap-2 sm:grid-cols-${(isPrioritization || isSJT) ? "2" : "3"} lg:min-w-[470px]`}>
                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-xs text-slate-500 font-medium">Assessment Score</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {row.score === null ? "Pending" : `${row.score}%`}
                      </p>
                    </div>
                    {!(isPrioritization || isSJT) && (
                      <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                        <p className="text-xs text-slate-500 font-medium">Duration</p>
                        <p className="mt-1 text-lg font-bold text-white">
                          {formatDuration(row.result?.durationSeconds)}
                        </p>
                      </div>
                    )}
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
                        className="h-full bg-gradient-to-r from-primary/80 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${scoreValue}%` }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 rounded-lg border border-white/5 bg-white/[0.01] p-3 flex flex-col justify-between">
                    <p className="text-xs text-slate-500 font-medium">Result status</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-200 font-semibold">
                      {row.score !== null ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                      ) : (
                        <Clock3 className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
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

                    {breakdownOpen && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
                        {row.result?.wpm !== null && row.result?.wpm !== undefined && (
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                              <p className="text-xs text-slate-500 font-medium">Average Speed</p>
                              <p className="mt-1.5 text-2xl font-black text-white">
                                {row.result.wpm} <span className="text-xs font-semibold text-slate-400">WPM</span>
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                              <p className="text-xs text-slate-500 font-medium">Average Accuracy</p>
                              <p className="mt-1.5 text-2xl font-black text-emerald-400">
                                {row.result.accuracy ?? "—"}%
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                              <p className="text-xs text-slate-500 font-medium">Total Mistakes</p>
                              <p className="mt-1.5 text-2xl font-black text-red-400">
                                {row.result.mistakeCount ?? "—"}
                              </p>
                            </div>
                          </div>
                        )}

                        {typingRuns.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                              Detailed Typing Run Performance
                            </p>
                            <div className="overflow-x-auto rounded-lg border border-white/15 bg-[#080d1a]/60">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-white/15 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                    <th className="p-3">Run</th>
                                    <th className="p-3 text-right">WPM</th>
                                    <th className="p-3 text-right">Accuracy</th>
                                    <th className="p-3 text-right">Mistakes</th>
                                    <th className="p-3 text-right">Characters (Correct/Total)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                                  {typingRuns.map((run, index) => (
                                    <tr key={`${row.name}-${run.runIndex ?? index}`} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="p-3 text-slate-300 font-bold">Run {run.runIndex ?? index + 1}</td>
                                      <td className="p-3 text-right text-white font-extrabold">{run.wpm ?? "—"}</td>
                                      <td className="p-3 text-right text-emerald-400 font-extrabold">{run.accuracy ?? "—"}%</td>
                                      <td className="p-3 text-right text-red-400 font-extrabold">{run.mistakeCharacters ?? "0"}</td>
                                      <td className="p-3 text-right text-slate-400">{run.correctCharacters ?? 0} / {run.typedCharacters ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {isPrioritization && row.result?.metrics && (() => {
                          const pjaMetrics = row.result.metrics as any;
                          return (
                            <div className="space-y-4">
                              <div className="space-y-3.5 rounded-lg border border-white/5 bg-white/[0.01] p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                  Priority Band Accuracy
                                </p>
                                <div className="space-y-3">
                                  {[
                                    { label: "High Priority", score: pjaMetrics.highPriorityAccuracy ?? 0, color: "bg-emerald-500", textColor: "text-emerald-400" },
                                    { label: "Medium Priority", score: pjaMetrics.mediumPriorityAccuracy ?? 0, color: "bg-sky-500", textColor: "text-sky-400" },
                                    { label: "Low Priority", score: pjaMetrics.lowPriorityAccuracy ?? 0, color: "bg-slate-400", textColor: "text-slate-400" }
                                  ].map((band) => (
                                    <div key={band.label} className="space-y-1.5">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">{band.label}</span>
                                        <span className={`font-bold ${band.textColor}`}>{Math.round(band.score)}%</span>
                                      </div>
                                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${band.color}`}
                                          style={{ width: `${band.score}%` }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Outcome Band</p>
                                  <p className="mt-1.5 text-lg font-bold text-white">
                                    {pjaMetrics.performanceBand ?? pjaMetrics.outcome ?? "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Critical Misprioritizations</p>
                                  <p className={`mt-1.5 text-lg font-bold ${pjaMetrics.criticalMisprioritisationCount > 0 ? "text-rose-400" : "text-white"}`}>
                                    {pjaMetrics.criticalMisprioritisationCount ?? 0}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {isSJT && row.result?.metrics && (() => {
                          const sjtMetrics = row.result.metrics as any;
                          return (
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Decision Band</p>
                                  <p className={`mt-1.5 text-2xl font-black ${
                                    sjtMetrics.decisionBand === 'GREEN' ? "text-emerald-400" :
                                    sjtMetrics.decisionBand === 'AMBER' ? "text-amber-400" : "text-rose-400"
                                  }`}>
                                    {sjtMetrics.decisionBand ?? "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Material Risk Flags</p>
                                  <p className={`mt-1.5 text-2xl font-black ${sjtMetrics.materialRiskFlagCount > 0 ? "text-rose-400 font-bold" : "text-white"}`}>
                                    {sjtMetrics.materialRiskFlagCount ?? 0}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Moderate Risk Flags</p>
                                  <p className="mt-1.5 text-2xl font-black text-white">
                                    {sjtMetrics.moderateRiskFlagCount ?? 0}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                  Competency Scores
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {Object.entries(sjtMetrics.competencyScores || {}).map(([key, score]: any) => {
                                    const label = sjtMetrics.competencyLabels?.[key] || key;
                                    const floor = COMPETENCY_FLOORS[key] ?? 50;
                                    const isBelowFloor = score < floor;
                                    
                                    return (
                                      <div key={key} className="rounded-lg border border-white/5 bg-white/[0.01] p-3 space-y-2">
                                        <div className="flex justify-between items-start text-xs">
                                          <span className="text-slate-300 font-medium line-clamp-1" title={label}>{label}</span>
                                          <span className={`font-bold ${isBelowFloor ? "text-red-400" : "text-white"}`}>{Math.round(score)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                                          <div
                                            className={`h-full rounded-full ${isBelowFloor ? "bg-red-500" : "bg-primary"}`}
                                            style={{ width: `${score}%` }}
                                          />
                                          {/* safety floor indicator mark */}
                                          <div 
                                            className="absolute top-0 bottom-0 w-0.5 bg-red-400/50"
                                            style={{ left: `${floor}%` }}
                                            title={`Safety Floor: ${floor}%`}
                                          />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                                          <span>Floor: {floor}%</span>
                                          {isBelowFloor && <span className="text-red-400 font-semibold">Below Floor</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
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
