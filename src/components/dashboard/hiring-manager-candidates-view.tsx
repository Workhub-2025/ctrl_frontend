"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  RefreshCw,
  Users,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  CheckCircle2,
  Clock3,
  Search,
} from "lucide-react";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import type {
  HiringManagerCampaignDetail,
  HiringManagerAssessmentResult,
} from "@/services/hiring-manager-portal-client.service";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { PortalStatTile } from "@/components/dashboard/portal/portal-ui";
import {
  portalAlertErrorClass,
  portalBadgeClass,
  portalIconWrapLgClass,
  portalPanelClass,
  portalPanelElevatedClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHmAssessmentItemStatus } from "@/lib/assessment-result-status";
import { isKnownAssessmentSlug, normalizeAssessmentSlugInput, normalizeSlug, resolveAssessmentSlug } from "@/lib/assessment-slug";

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
  overallScore: number;
  weights: Record<string, number>;
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

      // Calculate overall weighted score using campaign weights
      const weights = getCampaignWeights(
        candidate.assessmentStack ?? campaign.assessmentStack ?? [],
        campaign.assessmentSettings
      );
      
      let overallScore = 0;
      const expectedAssessments = candidate.assessmentStack ?? campaign.assessmentStack ?? [];
      expectedAssessments.forEach((name) => {
        const weight = weights[name] ?? 0;
        const result = results.find((r) => isSameAssessment(name, r.assessment));
        if (result && result.numericScore !== null) {
          overallScore += (result.numericScore * weight) / 100;
        }
      });
      const roundedOverallScore = Math.round(overallScore);

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
        assessmentStack: candidate.assessmentStack ?? campaign.assessmentStack ?? [],
        overallScore: roundedOverallScore,
        weights,
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

export function HiringManagerCandidatesView() {
  const { campaignDetails: campaigns, error, lastRefreshAt, loading, loadOverview } =
    useHiringManagerPortal();
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
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
        const matchesSearch = !searchQuery.trim() ||
          candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (candidate.email ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCampaign && matchesSession && matchesProgress && matchesSearch;
      }),
    [campaignFilter, candidates, progressFilter, sessionFilter, searchQuery]
  );

  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    for (const c of candidates) {
      if (c.progress === "completed") completed++;
      else if (c.progress === "in_progress") inProgress++;
      else notStarted++;
    }

    return {
      total: candidates.length,
      completed,
      inProgress,
      notStarted,
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

      {error && (
        <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>
          {error}
        </p>
      )}

      {/* Stats Summary Widget Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <PortalStatTile
          label="Total Candidates"
          value={stats.total}
          detail="registered applicants"
          icon={Users}
        />
        <PortalStatTile
          label="Completed"
          value={stats.completed}
          detail={
            stats.total > 0
              ? `${Math.round((stats.completed / stats.total) * 100)}% completion rate`
              : "ready for review"
          }
          icon={CheckCircle2}
        />
        <PortalStatTile
          label="In Progress"
          value={stats.inProgress}
          detail="active evaluation sessions"
          icon={RefreshCw}
        />
        <PortalStatTile
          label="Not Started"
          value={stats.notStarted}
          detail="awaiting first assessment"
          icon={Clock3}
        />
      </div>

      {/* Unified Search & Filters Card */}
      <Card className={cn(portalPanelElevatedClass, "border-white/10")}>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Search Input */}
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search candidate by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-md border border-white/10 bg-white/[0.03] text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Select Filters */}
            <div className="grid gap-3 sm:grid-cols-3 flex-[2] md:flex-[3]">
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
          {(campaignFilter !== "all" || sessionFilter !== "all" || progressFilter !== "all" || searchQuery !== "") && (
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <p className="text-xs text-slate-500">
                Found {filteredCandidates.length} matches of {candidates.length} total candidates
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCampaignFilter("all");
                  setSessionFilter("all");
                  setProgressFilter("all");
                  setSearchQuery("");
                }}
                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          {lastRefreshAt
            ? `Last refresh: ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(lastRefreshAt))}`
            : "Not refreshed yet"}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="w-fit hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Candidate List Container */}
      <div className="grid gap-4">
        {filteredCandidates.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm text-center leading-6 text-muted-foreground">
              {candidates.length === 0
                ? "No candidates have joined a campaign session yet."
                : "No candidate sessions match the current filters."}
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card
              key={`${candidate.campaignId}-${candidate.candidateSessionId}`}
              className={cn(portalPanelClass, "rounded-2xl shadow-lg transition-all duration-300 hover:border-primary/30")}
            >
              <CardContent className="p-5 space-y-5">
                {/* Top Section: Avatar, Meta Info, and Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(portalIconWrapLgClass, "rounded-xl text-sm font-black uppercase")}>
                      {candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                          {candidate.name}
                        </h2>
                        <Badge className={cn(portalBadgeClass, "pointer-events-none border-none text-[10px] font-semibold")}>
                          {progressLabel(candidate.progress)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 break-all font-medium">
                        {candidate.email || "Email not available"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold tracking-wide uppercase">
                        {candidate.campaignName} · {candidate.sessionName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end shrink-0">
                    {/* Completion stats */}
                    <div className="text-right border-r border-white/5 pr-4">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed</p>
                      <p className="text-sm font-extrabold text-white tabular-nums">
                        {candidate.completedAssessments}/{candidate.totalAssessments} Done
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className="group h-9 rounded-xl border-white/10 bg-white/[0.02] px-4 text-xs font-semibold text-slate-200 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors hover:border-primary/30"
                      asChild
                    >
                      <Link href={`/hiring-manager-dashboard/candidates/${candidate.candidateSessionId}/?campaignId=${candidate.campaignId}&candidateSessionId=${candidate.candidateSessionId}`}>
                        View report
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Redesigned Performance breakdown segment tracks */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  {/* Overall Weighted Score Bar — shown first */}
                  {candidate.completedAssessments > 0 && (
                    <div className="relative group space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-medium text-slate-300">Overall weighted score</span>
                        <span className="font-extrabold text-indigo-400 tabular-nums">
                          {candidate.overallScore}%
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
                        <div
                          className={portalProgressBarClass}
                          style={{ width: `${candidate.overallScore}%` }}
                        />
                      </div>

                      {/* Tooltip with weighted score breakdown */}
                      <div className="ctrl-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl border backdrop-blur-md text-sm hidden group-hover:block z-50 pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-950">
                        <p className="ctrl-tooltip-title font-bold mb-2">Weighted Score Breakdown</p>
                        <div className="space-y-1.5">
                          {candidate.assessmentStack.map((name) => {
                            const weight = candidate.weights[name] ?? 0;
                            const result = candidate.results.find((r) => isSameAssessment(name, r.assessment));
                            const itemStatus = getHmAssessmentItemStatus(result);
                            const isCompleted = itemStatus === "completed";
                            const isAbandoned = itemStatus === "abandoned";
                            const score = result?.numericScore ?? 0;
                            const contribution = isCompleted ? parseFloat(((score * weight) / 100).toFixed(1)) : 0;

                            return (
                              <div key={name} className="flex justify-between items-center text-xs">
                                <div className="flex flex-col min-w-0">
                                  <span className="ctrl-tooltip-muted font-medium truncate">{name}</span>
                                  <span className="ctrl-tooltip-subtle text-[0.625rem] font-semibold">Weight: {weight}%</span>
                                </div>
                                <div className="text-right pl-2 shrink-0">
                                  <span className="ctrl-tooltip-muted font-semibold">
                                    {isAbandoned ? "Abandoned" : isCompleted ? `${score}%` : "Pending"}
                                  </span>
                                  {isCompleted && (
                                    <span className="ctrl-tooltip-accent text-[0.625rem] font-bold ml-1.5">(+{contribution}%)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="ctrl-tooltip-divider border-t pt-1.5 mt-1.5 flex justify-between items-center text-xs font-bold">
                            <span>Total Weighted Score</span>
                            <span className="ctrl-tooltip-accent">{candidate.overallScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Segmented per-assessment scores bar — shown second */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium">Assessment performance breakdown</span>
                      <span className="font-semibold text-white tabular-nums">
                        Hover segments for detailed scores
                      </span>
                    </div>
                    <div className="h-3 w-full flex gap-1.5 overflow-visible">
                      {(() => {
                        const resultsMap = new Map(
                          (candidate.results || []).map((r) => [r.assessment.toLowerCase(), r])
                        );

                        const expectedAssessments = candidate.assessmentStack || [];
                        return expectedAssessments.map((stackName, idx) => {
                          const matchedResult = resultsMap.get(stackName.toLowerCase());
                          const itemStatus = getHmAssessmentItemStatus(matchedResult);
                          const isCompleted = itemStatus === "completed";
                          const isAbandoned = itemStatus === "abandoned";
                          const scoreValue = matchedResult?.numericScore ?? 0;
                          const key = getAssessmentKey(stackName, matchedResult);

                          const colorClass = isAbandoned ? "bg-orange-500" : "bg-primary";

                          // Tooltip metrics content
                          let metricsContent = null;
                          if (isCompleted && matchedResult) {
                            if (key === "typing") {
                              metricsContent = (
                                <span>{matchedResult.wpm ?? 0} WPM · {Math.round(matchedResult.accuracy ?? 0)}% Acc</span>
                              );
                            } else if (key === "prioritisation" && matchedResult.metrics) {
                              const m = matchedResult.metrics as any;
                              metricsContent = (
                                <span>High: {Math.round(m.highPriorityAccuracy ?? 0)}% · Mid: {Math.round(m.mediumPriorityAccuracy ?? 0)}% · Low: {Math.round(m.lowPriorityAccuracy ?? 0)}%</span>
                              );
                            } else if (key === "situational-judgement" && matchedResult.metrics) {
                              const m = matchedResult.metrics as any;
                              metricsContent = (
                                <span>Band: {m.decisionBand ?? "—"} · Flags: {Number(m.materialRiskFlagCount ?? 0) + Number(m.moderateRiskFlagCount ?? 0)}</span>
                              );
                            } else if (key === "call-simulation" && typeof matchedResult.durationSeconds === 'number') {
                              metricsContent = (
                                <span>Duration: {Math.round(matchedResult.durationSeconds / 60)}m {matchedResult.durationSeconds % 60}s</span>
                              );
                            }
                          }

                          return (
                            <div
                              key={`${stackName}-${idx}`}
                              className="relative group flex-1 h-full bg-white/[0.04] border border-white/10 rounded-full overflow-visible"
                            >
                              {/* Inner filled score bar */}
                              <div
                                className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
                                style={{ width: `${isAbandoned ? 100 : isCompleted ? scoreValue : 0}%` }}
                              />
                                              {/* Tooltip */}
                              <div className="ctrl-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl border backdrop-blur-md text-sm hidden group-hover:block z-50 pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-950">
                                <p className="ctrl-tooltip-title font-bold mb-1">{stackName}</p>
                                {isAbandoned ? (
                                  <p className="ctrl-tooltip-warning italic text-xs">
                                    Abandoned — contact the candidate to find out what happened.
                                  </p>
                                ) : isCompleted && matchedResult ? (
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="ctrl-tooltip-muted font-medium">Assessment Score</span>
                                      <span className="ctrl-tooltip-title font-extrabold">{scoreValue}%</span>
                                    </div>
                                    {metricsContent && (
                                      <div className="ctrl-tooltip-divider border-t pt-1 mt-1 text-xs font-semibold">
                                        {metricsContent}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="ctrl-tooltip-warning italic text-xs">Awaiting completion (Pending)</p>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function getAssessmentKey(value?: string | null, result?: any) {
  const slug = normalizeSlug(value);
  if (isKnownAssessmentSlug(slug)) return slug;

  const resolved = resolveAssessmentSlug(value, result);
  if (resolved) return resolved;

  if (result) {
    if (typeof result.wpm === "number" || typeof result.accuracy === "number") {
      return "typing";
    }
    if (typeof result.durationSeconds === "number") {
      return "call-simulation";
    }
  }

  return "";
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

  const expected = normalizeAssessmentSlugInput(expectedName);
  const result = normalizeAssessmentSlugInput(resultName);
  return (expected && result) ? (expected.includes(result) || result.includes(expected)) : false;
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
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06] hover:text-white transition-colors">
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
