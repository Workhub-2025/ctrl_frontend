"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  Filter,
  RefreshCw,
  UserCheck,
  Users,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  CheckCircle2,
  Clock3,
  TrendingUp,
} from "lucide-react";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
  type HiringManagerAssessmentResult,
} from "@/services/hiring-manager-portal-client.service";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

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
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");

  const loadCandidates = async (force = false) => {
    const startTime = Date.now();
    setIsRefreshing(true);
    setError(null);
    try {
      const overview = await HiringManagerPortalClientService.getOverview({ force });
      setCampaigns(overview.campaignDetails);
      setLastRefreshAt(Date.now());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Candidates could not be loaded."
      );
    } finally {
      if (force) {
        const elapsedTime = Date.now() - startTime;
        const minSpin = 800; // ms to ensure smooth spin
        if (elapsedTime < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
        }
      }
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCandidates(false);
  }, []);

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
        return matchesCampaign && matchesSession && matchesProgress;
      }),
    [campaignFilter, candidates, progressFilter, sessionFilter]
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
        badge={
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
          </span>
        }
      />

      {error && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
          {error}
        </p>
      )}

      {/* Stats Summary Widget Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-white/10 bg-[#080c16]/30 dark:bg-[#0b1329]/40 backdrop-blur-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Total joined</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats.total}</span>
              <span className="text-xs text-slate-500">applicants</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/10 bg-[#080c16]/30 dark:bg-[#0b1329]/40 backdrop-blur-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs uppercase text-emerald-500/80 font-semibold tracking-wider">Completed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{stats.completed}</span>
              <span className="text-xs text-slate-500">ready for review</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/10 bg-[#080c16]/30 dark:bg-[#0b1329]/40 backdrop-blur-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs uppercase text-orange-500/80 font-semibold tracking-wider">In progress</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-400">{stats.inProgress}</span>
              <span className="text-xs text-slate-500">active sessions</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-500/10 bg-[#080c16]/30 dark:bg-[#0b1329]/40 backdrop-blur-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Not started</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-300">{stats.notStarted}</span>
              <span className="text-xs text-slate-500">awaiting start</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-white/10 bg-[#0b1220]/50 backdrop-blur-md shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
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
          onClick={() => loadCandidates(true)}
          disabled={isRefreshing}
          className="w-fit hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredCandidates.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              {candidates.length === 0
                ? "No candidates have joined a campaign session yet."
                : "No candidate sessions match the current filters."}
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card
              key={`${candidate.campaignId}-${candidate.candidateSessionId}`}
              className="group rounded-xl border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/40 dark:bg-[#0b1329]/45 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all duration-300"
            >
              <CardContent className="space-y-4 p-5">
                {/* Top row: info + view button */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-base font-bold leading-snug text-white">
                        {candidate.name}
                      </h2>
                      {candidate.status && (
                        <Badge className={[
                          "rounded-md border-none text-xs font-semibold px-2 py-0.5",
                          candidate.progress === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : candidate.progress === "in_progress"
                              ? "bg-orange-500/10 text-orange-400"
                              : "bg-slate-500/10 text-slate-400"
                        ].join(" ")}>
                          {progressLabel(candidate.progress)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm leading-5 text-slate-400">
                      {candidate.email || "Email not available"}
                    </p>
                    <p className="mt-1.5 break-words text-xs leading-5 text-slate-500 font-medium">
                      {candidate.campaignName} · {candidate.sessionName}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-9 w-fit shrink-0 rounded-md border-white/10 bg-white/[0.02] px-3.5 text-xs font-medium text-slate-100 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors group-hover:border-primary/30"
                    asChild
                  >
                    <Link href={`/hiring-manager-dashboard/candidates/${candidate.candidateSessionId}/?campaignId=${candidate.campaignId}&candidateSessionId=${candidate.candidateSessionId}`}>
                      View results/report
                      <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>

                {/* Full-width assessment completion pill track */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium">Assessments completed</span>
                    <span className="font-semibold text-white tabular-nums">
                      {candidate.completedAssessments} of {candidate.totalAssessments}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: candidate.totalAssessments || 1 }, (_, idx) => {
                      const isDone = idx < (candidate.completedAssessments || 0);
                      const assessmentName = candidate.assessmentStack?.[idx] ?? `Assessment ${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          title={`${assessmentName}: ${isDone ? "Completed" : "Pending"}`}
                          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                            isDone
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                              : "bg-white/10 border border-white/5"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Granular Assessment score grid */}
                <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 pt-4 border-t border-white/5">
                  {(() => {
                    const resultsMap = new Map(
                      (candidate.results || []).map((r) => [r.assessment.toLowerCase(), r])
                    );

                    const displayList = (candidate.assessmentStack || []).map((stackName) => {
                      const matchedResult = resultsMap.get(stackName.toLowerCase());
                      if (matchedResult) {
                        return {
                          name: stackName,
                          status: matchedResult.completedAt || matchedResult.numericScore !== null ? "completed" : "pending",
                          result: matchedResult,
                        };
                      }
                      return {
                        name: stackName,
                        status: "pending",
                        result: null,
                      };
                    });

                    const finalDisplayList = displayList.length > 0
                      ? displayList
                      : (candidate.results || []).map((r) => ({
                          name: r.assessment,
                          status: r.completedAt || r.numericScore !== null ? "completed" : "pending",
                          result: r,
                        }));

                    return finalDisplayList.map((item, idx) => {
                      const Icon = getAssessmentIcon(item.name);
                      const isCompleted = item.status === "completed" && item.result;

                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          className={[
                            "relative flex flex-col justify-between rounded-xl border p-2.5 transition-all text-xs",
                            isCompleted
                              ? "border-white/10 bg-white/[0.02] dark:bg-white/[0.005]"
                              : "border-dashed border-white/5 bg-transparent"
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon className={["h-3.5 w-3.5 shrink-0", isCompleted ? "text-primary" : "text-slate-500"].join(" ")} />
                              <span className="truncate font-semibold text-slate-200">
                                {item.name}
                              </span>
                            </div>
                            {isCompleted ? (
                              <Badge className="h-4 px-1 text-[8px] font-semibold bg-green-500/10 text-green-400 border-none hover:bg-green-500/10">
                                Done
                              </Badge>
                            ) : (
                              <Badge className="h-4 px-1 text-[8px] font-semibold bg-amber-500/10 text-amber-400 border-none animate-pulse hover:bg-amber-500/10">
                                Pending
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2.5">
                            {isCompleted && item.result ? (
                              <div className="space-y-1">
                                <div className="flex items-baseline justify-between">
                                  <span className="text-sm font-bold text-white">
                                    {item.result.score}
                                  </span>
                                  {item.result.passed !== null && item.result.passed !== undefined && (
                                    <span className={["text-[9px] font-bold tracking-wider", item.result.passed ? "text-green-400" : "text-red-400"].join(" ")}>
                                      {item.result.passed ? "PASSED" : "FAILED"}
                                    </span>
                                  )}
                                </div>

                                {(() => {
                                  const key = getAssessmentKey(item.name, item.result);
                                  const isTyping = key === "typing";
                                  const isPrioritisation = key === "prioritization";
                                  const isSJT = key === "situational-judgement";
                                  const isCallSimulation = key === "call-simulation";

                                  return (
                                    <>
                                      {isTyping && (typeof item.result.wpm === 'number' || typeof item.result.accuracy === 'number') && (
                                        <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 border-t border-white/5 pt-1">
                                          {typeof item.result.wpm === 'number' && (
                                            <span><strong>{item.result.wpm}</strong> WPM</span>
                                          )}
                                          {typeof item.result.accuracy === 'number' && (
                                            <span><strong>{Math.round(item.result.accuracy)}%</strong> Acc</span>
                                          )}
                                        </div>
                                      )}

                                      {isPrioritisation && item.result.metrics && (
                                        <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 border-t border-white/5 pt-1 mt-1">
                                          <span>High: <strong>{Math.round((item.result.metrics as any).highPriorityAccuracy ?? 0)}%</strong></span>
                                          <span>Mid: <strong>{Math.round((item.result.metrics as any).mediumPriorityAccuracy ?? 0)}%</strong></span>
                                          <span>Low: <strong>{Math.round((item.result.metrics as any).lowPriorityAccuracy ?? 0)}%</strong></span>
                                        </div>
                                      )}

                                      {isSJT && item.result.metrics && (
                                        <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 border-t border-white/5 pt-1 mt-1">
                                          <span>Band: <strong className={
                                            (item.result.metrics as any).decisionBand === 'GREEN' ? "text-emerald-400" :
                                            (item.result.metrics as any).decisionBand === 'AMBER' ? "text-amber-400" : "text-rose-400"
                                          }>{(item.result.metrics as any).decisionBand ?? '—'}</strong></span>
                                          <span>Flags: <strong>{Number((item.result.metrics as any).materialRiskFlagCount ?? 0) + Number((item.result.metrics as any).moderateRiskFlagCount ?? 0)}</strong></span>
                                        </div>
                                      )}

                                      {isCallSimulation && typeof item.result.durationSeconds === 'number' && (
                                        <div className="flex gap-2 text-[9px] text-slate-400 border-t border-white/5 pt-1 mt-1">
                                          <span>Time: <strong>{Math.round(item.result.durationSeconds / 60)}m {item.result.durationSeconds % 60}s</strong></span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 italic min-h-[30px] flex items-center">
                                Awaiting completion
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function normalizeAssessmentText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/prioritisation/g, "prioritization")
    .replace(/[^a-z0-9]/g, "");
}

function getAssessmentKey(value?: string | null, result?: any) {
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

  // Resilient guess fallback if name is generic (like "Assessment")
  if (result) {
    if (typeof result.wpm === 'number' || typeof result.accuracy === 'number') {
      return "typing";
    }
    if (result.metrics) {
      const m = result.metrics;
      if (m.highPriorityAccuracy !== undefined || m.mediumPriorityAccuracy !== undefined || m.lowPriorityAccuracy !== undefined) {
        return "prioritization";
      }
      if (m.decisionBand !== undefined || m.materialRiskFlagCount !== undefined || m.moderateRiskFlagCount !== undefined) {
        return "situational-judgement";
      }
    }
    if (typeof result.durationSeconds === 'number') {
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
        <SelectTrigger className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100">
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
