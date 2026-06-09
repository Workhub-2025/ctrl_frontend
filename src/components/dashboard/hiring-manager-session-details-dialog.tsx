"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  CalendarClock,
  MapPin,
  Globe,
  Building,
  Check,
  Copy,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  const toggleCandidateExpand = (candidateId: string) => {
    setExpandedCandidateId((current) => (current === candidateId ? null : candidateId));
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setExpandedCandidateId(null);
      setCopiedCode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85vh] w-full sm:max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#0e172e] to-[#080c16]/95 text-slate-100 backdrop-blur-md p-6 shadow-2xl flex flex-col gap-5 [&>button]:text-slate-400 [&>button]:hover:text-white [&>button]:transition-colors">
        {/* Ambient background glows */}
        <div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {session && (
          <>
            <DialogHeader className="border-b border-white/5 pb-4 relative z-10 text-left pr-12 flex flex-col gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Workspace</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <DialogTitle className="text-xl font-bold text-white leading-snug">
                  {campaignName || session.campaign}
                </DialogTitle>
                <Badge className={[
                  "rounded-md border-none text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider shadow-sm shrink-0",
                  getStatusTone(session.status)
                ].join(" ")}>
                  {session.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium flex-wrap">
                <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                <span>{session.date}</span>
                <span className="text-slate-600 font-bold">·</span>
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate max-w-[200px]">{session.location}</span>
              </p>
            </DialogHeader>

            {/* Upgraded Metric Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-3 relative z-10">
              {/* Access Code Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-indigo-500/10 blur-md pointer-events-none" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Access Code</span>
                <div className="flex items-center justify-between gap-2 mt-3 bg-black/35 p-1.5 rounded-lg border border-white/5">
                  <span className="font-mono text-sm font-bold text-white tracking-wider truncate pl-1">{session.accessValue}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard?.writeText(session.accessValue);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Joined Occupancy Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-primary/10 blur-md pointer-events-none" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Occupancy</span>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-base font-black text-white">{session.candidateCount} <span className="text-xs text-slate-400 font-medium">/ {session.candidateLimit}</span></span>
                  <span className="text-[10px] font-bold text-slate-400 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">
                    {Math.round((session.candidateCount / session.candidateLimit) * 100)}% Capacity
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (session.candidateCount / session.candidateLimit) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Delivery Type Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-emerald-500/10 blur-md pointer-events-none" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Type</span>
                <div className="mt-3 flex items-center gap-2">
                  {session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") ? (
                    <Globe className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Building className="h-4 w-4 text-indigo-400" />
                  )}
                  <span className="text-xs font-bold text-white leading-none capitalize">
                    {session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") ? "Virtual (Remote)" : "In-Person"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate mt-2">{session.location}</span>
              </div>
            </div>

            {/* Candidates Section */}
            <div className="space-y-4 relative z-10 mt-2 flex-1">
              <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Joined Candidates
                </h3>
                <Badge variant="secondary" className="rounded-full border-none bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary pointer-events-none">
                  {session.candidates.length} Total
                </Badge>
              </div>

              {session.candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-sm text-center leading-relaxed text-slate-400">
                  No candidates have joined this session yet. Copy and share the session code with candidates to allow them to take the assessments.
                </div>
              ) : (
                <div className="space-y-3">
                  {session.candidates.map((candidate) => {
                    const progress = getCandidateProgress(candidate, expectedAssessmentCount);
                    const resultsHref = getResultsHref?.(candidate, session);
                    const isExpanded = expandedCandidateId === candidate.id;

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

                    const initials = candidate.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={candidate.id}
                        className={[
                          "rounded-xl border transition-all duration-300 overflow-hidden",
                          isExpanded
                            ? "border-primary/45 bg-[#0e172e]/40 shadow-[0_4px_20px_rgba(99,102,241,0.05)]"
                            : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                        ].join(" ")}
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => toggleCandidateExpand(candidate.id)}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white leading-tight truncate">{candidate.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{candidate.email || "No email provided"}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                            {/* Candidate Progress Badge */}
                            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                              <span className="text-[10px] text-slate-400 font-semibold">Progress:</span>
                              <span className="text-[10px] font-bold text-white">
                                {progress.completed}/{progress.total} Completed
                              </span>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {resultsHref && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-white/10 bg-transparent text-slate-300 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] px-3 text-xs transition-colors"
                                  asChild
                                >
                                  <Link href={resultsHref}>View results</Link>
                                </Button>
                              )}

                              {onKickCandidate && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 dark:hover:!bg-white/[0.08] transition-colors"
                                      aria-label="Candidate actions"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="border-white/10 bg-slate-900 text-slate-200"
                                  >
                                    <DropdownMenuItem
                                      disabled={Boolean(candidate.hasStartedAssessment) || removingCandidateId === candidate.id}
                                      onClick={() => onKickCandidate(session.id, candidate.id)}
                                      className="flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                      <span>{removingCandidateId === candidate.id ? "Removing..." : "Remove candidate"}</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}

                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Body */}
                        {isExpanded && (
                          <div className="border-t border-white/5 bg-black/10 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Detailed assessment metrics cards */}
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                                      "relative flex flex-col justify-between rounded-xl border p-3.5 transition-all",
                                      isCompleted
                                        ? "border-white/10 bg-white/[0.02]"
                                        : "border-dashed border-white/5 bg-white/[0.002]"
                                    ].join(" ")}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Icon className={["h-3.5 w-3.5 shrink-0", isCompleted ? "text-primary" : "text-slate-500"].join(" ")} />
                                        <span className="truncate text-xs font-bold text-slate-200">
                                          {item.name}
                                        </span>
                                      </div>
                                      {isCompleted ? (
                                        <Badge className="h-4 px-1.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border-none hover:bg-emerald-500/10">
                                          Done
                                        </Badge>
                                      ) : (
                                        <Badge className="h-4 px-1.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border-none animate-pulse hover:bg-amber-500/10">
                                          Pending
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="mt-3 relative">
                                      {isCompleted && item.result ? (
                                        <div className="space-y-1">
                                          {!isPrioritisation && (
                                            <div className="flex items-baseline justify-between">
                                              <span className="text-sm font-black text-white">
                                                {item.result.score}
                                              </span>
                                              {item.result.passed !== null && item.result.passed !== undefined && (
                                                <span className={["text-[9px] font-bold tracking-wider", item.result.passed ? "text-emerald-400" : "text-rose-400"].join(" ")}>
                                                  {item.result.passed ? "PASSED" : "REVIEW"}
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {isTyping && (typeof item.result.wpm === 'number' || typeof item.result.accuracy === 'number') && (
                                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 border-t border-white/5 pt-1 mt-1">
                                              {typeof item.result.wpm === 'number' && (
                                                <span><strong>{item.result.wpm}</strong> WPM</span>
                                              )}
                                              {typeof item.result.accuracy === 'number' && (
                                                <span><strong>{Math.round(item.result.accuracy)}%</strong> Accuracy</span>
                                              )}
                                            </div>
                                          )}

                                          {isPrioritisation && item.result.metrics && (
                                            <div className="flex flex-col gap-1.5 text-[10px] text-slate-400 pt-1">
                                              <div className="flex justify-between items-center">
                                                <span>High Priority Acc:</span>
                                                <strong className="text-slate-200">{Math.round((item.result.metrics as any).highPriorityAccuracy ?? 0)}%</strong>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <span>Mid Priority Acc:</span>
                                                <strong className="text-slate-200">{Math.round((item.result.metrics as any).mediumPriorityAccuracy ?? 0)}%</strong>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <span>Low Priority Acc:</span>
                                                <strong className="text-slate-200">{Math.round((item.result.metrics as any).lowPriorityAccuracy ?? 0)}%</strong>
                                              </div>
                                            </div>
                                          )}

                                          {isSJT && item.result.metrics && (
                                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 border-t border-white/5 pt-1 mt-1">
                                              <span>Band: <strong className={
                                                (item.result.metrics as any).decisionBand === 'GREEN' ? "text-emerald-400" :
                                                (item.result.metrics as any).decisionBand === 'AMBER' ? "text-amber-400" : "text-rose-400"
                                              }>{(item.result.metrics as any).decisionBand ?? '—'}</strong></span>
                                              <span>Flags: <strong className="text-slate-200">{Number((item.result.metrics as any).materialRiskFlagCount ?? 0) + Number((item.result.metrics as any).moderateRiskFlagCount ?? 0)}</strong></span>
                                            </div>
                                          )}

                                          {isCallSimulation && typeof item.result.durationSeconds === 'number' && (
                                            <div className="flex gap-2 text-[10px] text-slate-400 border-t border-white/5 pt-1 mt-1">
                                              <span>Time: <strong>{Math.round(item.result.durationSeconds / 60)}m {item.result.durationSeconds % 60}s</strong></span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-500 italic min-h-[30px] flex items-center">
                                          Awaiting completion
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
