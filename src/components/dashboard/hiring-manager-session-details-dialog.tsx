"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserMinus,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HiringManagerSessionListItem } from "@/services/hiring-manager-portal-client.service";

type SessionCandidate = HiringManagerSessionListItem["candidates"][number];

type HiringManagerSessionDetailsDialogProps = {
  session: HiringManagerSessionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName?: string;
  expectedAssessmentCount?: number;
  removingCandidateId?: string | null;
  onKickCandidate?: (sessionId: string, candidateId: string) => void;
  getResultsHref?: (candidate: SessionCandidate, session: HiringManagerSessionListItem) => string;
  assessmentStack?: string[];
};

export function HiringManagerSessionDetailsDialog({
  session,
  open,
  onOpenChange,
  campaignName,
  expectedAssessmentCount,
  removingCandidateId,
  onKickCandidate,
  getResultsHref,
  assessmentStack,
}: HiringManagerSessionDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[1.25rem] border-border bg-card text-foreground dark:border-white/10 dark:bg-[#0b1220] sm:max-w-3xl">
        {session && (
          <>
            <DialogHeader>
              <DialogTitle>{campaignName || session.campaign}</DialogTitle>
              <DialogDescription>
                {session.date} · {session.location}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-3">
              <SessionMetric label="Session code" value={session.accessValue} />
              <SessionMetric label="Joined" value={`${session.candidateCount}/${session.candidateLimit}`} />
              <SessionMetric label="Status" value={session.status} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Joined candidates</p>
                <Badge className="rounded-md border-border bg-background text-xs text-muted-foreground hover:bg-background dark:border-white/10 dark:bg-white/[0.03]">
                  {session.candidates.length}
                </Badge>
              </div>

              {session.candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                  No candidates have joined this session yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {session.candidates.map((candidate) => {
                    const progress = getCandidateProgress(candidate, expectedAssessmentCount);
                    const resultsHref = getResultsHref?.(candidate, session);

                    const displayAssessments = (assessmentStack || []).map((stackName) => {
                      const matchedResult = (candidate.results || []).find((r) =>
                        isSameAssessment(stackName, r.assessment)
                      );
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

                    const finalDisplayList = displayAssessments.length > 0
                      ? displayAssessments
                      : (candidate.results || []).map((r) => ({
                          name: r.assessment,
                          status: r.completedAt || r.numericScore !== null ? "completed" : "pending",
                          result: r,
                        }));

                    return (
                      <div
                        key={candidate.id}
                        className="rounded-xl border border-border bg-background p-4 shadow-sm dark:border-white/10 dark:bg-[#04070d] space-y-4"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="break-words text-sm font-medium text-foreground">
                                  {candidate.name}
                                </p>
                                {onKickCandidate && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:!text-white hover:!bg-white/10 dark:hover:!bg-white/[0.08] transition-colors"
                                        aria-label="Candidate actions"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      className="border-border bg-card dark:border-white/10 dark:bg-[#0b1220] text-foreground"
                                    >
                                      <DropdownMenuItem
                                        disabled={Boolean(candidate.hasStartedAssessment) || removingCandidateId === candidate.id}
                                        onClick={() => onKickCandidate(session.id, candidate.id)}
                                        className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-red-950/30 cursor-pointer"
                                      >
                                        <UserMinus className="h-4 w-4" />
                                        <span>{removingCandidateId === candidate.id ? "Removing..." : "Remove candidate"}</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              <p className="mt-1 break-words text-xs text-muted-foreground">
                                {candidate.email || candidate.status || "Joined"}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-border bg-card p-3 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span className="font-medium text-foreground">
                                {progress.completed}/{progress.total}
                              </span>
                            </div>
                            <Progress value={progress.percent} className="mt-2.5 h-2 bg-muted dark:bg-white/10" />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                             {resultsHref && (
                               <Button
                                 variant="outline"
                                 className="h-9 rounded-md border-border bg-card px-3 text-xs text-foreground hover:!bg-muted hover:!text-foreground dark:border-white/10 dark:bg-[#08101d] dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
                                 asChild
                               >
                                 <Link href={resultsHref}>View results</Link>
                               </Button>
                             )}
                          </div>
                        </div>

                        {/* Detailed assessment metrics cards */}
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 pt-3.5 border-t border-border/40 dark:border-white/5">
                          {finalDisplayList.map((item, idx) => {
                            const Icon = getAssessmentIcon(item.name);
                            const isCompleted = item.status === "completed" && item.result;
                            const key = getAssessmentKey(item.name, item.result);
                            const isTyping = key === "typing";
                            const isPrioritisation = key === "prioritization";
                            const isSJT = key === "situational-judgement";
                            const isCallSimulation = key === "call-simulation";

                            return (
                              <div
                                key={`${item.name}-${idx}`}
                                className={[
                                  "relative flex flex-col justify-between rounded-xl border p-3 transition-all",
                                  isCompleted
                                    ? "border-border bg-card/50 dark:border-white/10 dark:bg-white/[0.02]"
                                    : "border-dashed border-border bg-muted/10 dark:border-white/5 dark:bg-white/[0.005]"
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Icon className={["h-4 w-4 shrink-0", isCompleted ? "text-primary" : "text-muted-foreground"].join(" ")} />
                                    <span className="truncate text-xs font-semibold text-foreground">
                                      {item.name}
                                    </span>
                                  </div>
                                  {isCompleted ? (
                                    <Badge className="h-4 px-1 text-[9px] font-semibold bg-green-500/10 text-green-700 dark:text-green-300 border-none hover:bg-green-500/10">
                                      Done
                                    </Badge>
                                  ) : (
                                    <Badge className="h-4 px-1 text-[9px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-none animate-pulse hover:bg-amber-500/10">
                                      Pending
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-3">
                                  {isCompleted && item.result ? (
                                    <div className="space-y-1">
                                      {!isPrioritisation && (
                                        <div className="flex items-baseline justify-between">
                                          <span className="text-base font-bold text-foreground">
                                            {item.result.score}
                                          </span>
                                          {item.result.passed !== null && item.result.passed !== undefined && (
                                            <span className={["text-[10px] font-semibold tracking-wider", item.result.passed ? "text-green-600 dark:text-green-400" : "text-red-500"].join(" ")}>
                                              {item.result.passed ? "PASSED" : "REVIEW"}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {isTyping && (typeof item.result.wpm === 'number' || typeof item.result.accuracy === 'number') && (
                                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground border-t border-border/30 pt-1 dark:border-white/5">
                                          {typeof item.result.wpm === 'number' && (
                                            <span><strong>{item.result.wpm}</strong> WPM</span>
                                          )}
                                          {typeof item.result.accuracy === 'number' && (
                                            <span><strong>{Math.round(item.result.accuracy)}%</strong> Acc</span>
                                          )}
                                        </div>
                                      )}

                                      {isPrioritisation && item.result.metrics && (
                                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground border-t border-border/30 pt-1 dark:border-white/5 mt-1">
                                          <span>High: <strong>{Math.round((item.result.metrics as any).highPriorityAccuracy ?? 0)}%</strong></span>
                                          <span>Mid: <strong>{Math.round((item.result.metrics as any).mediumPriorityAccuracy ?? 0)}%</strong></span>
                                          <span>Low: <strong>{Math.round((item.result.metrics as any).lowPriorityAccuracy ?? 0)}%</strong></span>
                                        </div>
                                      )}

                                      {isSJT && item.result.metrics && (
                                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground border-t border-border/30 pt-1 dark:border-white/5 mt-1">
                                          <span>Band: <strong className={
                                            (item.result.metrics as any).decisionBand === 'GREEN' ? "text-emerald-400" :
                                            (item.result.metrics as any).decisionBand === 'AMBER' ? "text-amber-400" : "text-rose-400"
                                          }>{(item.result.metrics as any).decisionBand ?? '—'}</strong></span>
                                          <span>Flags: <strong>{Number((item.result.metrics as any).materialRiskFlagCount ?? 0) + Number((item.result.metrics as any).moderateRiskFlagCount ?? 0)}</strong></span>
                                        </div>
                                      )}

                                      {isCallSimulation && typeof item.result.durationSeconds === 'number' && (
                                        <div className="flex gap-2 text-[10px] text-muted-foreground border-t border-border/30 pt-1 dark:border-white/5">
                                          <span>Time: <strong>{Math.round(item.result.durationSeconds / 60)}m {item.result.durationSeconds % 60}s</strong></span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground/75 italic min-h-[34px] flex items-center">
                                      Awaiting completion
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function KickButton({
  disabled,
  isRemoving,
  onKick,
}: {
  disabled: boolean;
  isRemoving: boolean;
  onKick: () => void;
}) {
  if (disabled) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground opacity-55 dark:border-white/10 dark:bg-white/[0.04]"
              aria-label="Kick"
            >
              <UserMinus className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">Kick</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isRemoving}
            onClick={onKick}
            className="h-9 w-9 shrink-0 border-red-400/25 bg-red-400/10 p-0 text-red-700 hover:border-red-400/35 hover:bg-red-400/15 hover:text-red-800 dark:text-red-100 dark:hover:text-red-50"
            aria-label="Kick"
          >
            <UserMinus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Kick</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getCandidateProgress(candidate: SessionCandidate, expectedAssessmentCount?: number) {
  const completed = new Set(
    candidate.results
      .filter((result) => result.completedAt || result.numericScore !== null)
      .map((result) => result.id || result.assessment)
  ).size;
  const total = Math.max(expectedAssessmentCount || 0, candidate.results.length, completed, 1);

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
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

function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);

  if (expectedKey && resultKey) return expectedKey === resultKey;

  const expected = normalizeAssessmentText(expectedName);
  const result = normalizeAssessmentText(resultName);
  return (expected && result) ? (expected.includes(result) || result.includes(expected)) : false;
}
