"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserMinus,
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
  X,
  ArrowLeft,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerCandidateReport } from "@/components/dashboard/hiring-manager-candidate-report";
import type { HiringManagerSessionListItem } from "@/services/hiring-manager-portal-client.service";

type SessionCandidate = HiringManagerSessionListItem["candidates"][number];

export type ResultsDialogState = {
  candidateId: string;
  campaignId: string;
  candidateSessionId: string;
  candidateName: string;
  candidateEmail?: string;
  role?: string;
  campaignName?: string;
};

type HiringManagerSessionDetailsDialogProps = {
  session: HiringManagerSessionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName?: string;
  campaignRole?: string;
  campaignId?: string;
  expectedAssessmentCount?: number;
  removingCandidateId?: string | null;
  onKickCandidate?: (sessionId: string, candidateId: string) => void;
  getResultsHref?: (candidate: SessionCandidate, session: HiringManagerSessionListItem) => string;
  assessmentStack?: string[];
  onUnlockCandidate?: (candidateSessionId: string) => void;
  unlockingCandidateId?: string | null;
  onUpdateSessionStatus?: (sessionId: string, status: "live" | "closed") => void;
  updatingSessionId?: string | null;
};

export function HiringManagerSessionDetailsDialog({
  session,
  open,
  onOpenChange,
  campaignName,
  campaignRole,
  campaignId,
  expectedAssessmentCount,
  removingCandidateId,
  onKickCandidate,
  getResultsHref,
  assessmentStack,
  onUnlockCandidate,
  unlockingCandidateId,
  onUpdateSessionStatus,
  updatingSessionId,
}: HiringManagerSessionDetailsDialogProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [resultsDialog, setResultsDialog] = useState<ResultsDialogState | null>(null);

  const toggleCandidateExpand = (candidateId: string) => {
    setExpandedCandidateId((current) => (current === candidateId ? null : candidateId));
  };

  const handleClose = () => {
    onOpenChange(false);
    setExpandedCandidateId(null);
    setCopiedCode(false);
  };

  const handleOpenResults = (candidate: SessionCandidate) => {
    setResultsDialog({
      candidateId: candidate.id,
      campaignId: campaignId ?? "",
      candidateSessionId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      role: campaignRole,
      campaignName,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => { }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 h-[min(86dvh,900px)] max-h-[86dvh] w-[min(92vw,1280px)] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-[#0e172e] to-[#080c16]/95 p-6 text-slate-100 shadow-2xl backdrop-blur-md flex flex-col gap-5 [&>button]:hidden"
        >
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

          {/* X close — wrapped in div to escape [&>button]:hidden */}
          <div className="absolute right-5 top-5 z-20">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {session && (
            <>
              {/* Header */}
              <DialogHeader className="border-b border-white/5 pb-4 relative z-10 text-left pr-12 flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Workspace</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  
                  {/* Session Status Actions in Dialog */}
                  <div className="flex items-center gap-2">
                    {session.status === "Ready to issue" && onUpdateSessionStatus && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={updatingSessionId === session.id || (session.startsAt ? new Date(session.startsAt).getTime() > Date.now() : false)}
                        onClick={() => onUpdateSessionStatus(session.id, "live")}
                        className="h-8 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white disabled:opacity-40 transition-all duration-300 cursor-pointer"
                      >
                        {updatingSessionId === session.id ? "Activating..." : "Activate Session"}
                      </Button>
                    )}
                    {session.status === "Live" && onUpdateSessionStatus && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={updatingSessionId === session.id}
                        onClick={() => onUpdateSessionStatus(session.id, "closed")}
                        className="h-8 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all duration-300 cursor-pointer"
                      >
                        {updatingSessionId === session.id ? "Closing..." : "Close Session"}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-medium">
                  <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                  <span>{session.date}</span>
                  {session.startsAt && new Date(session.startsAt).getTime() > Date.now() && session.status === "Ready to issue" && (
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded ml-1 animate-pulse">
                      Scheduled
                    </span>
                  )}
                  <span className="text-slate-600">·</span>
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate max-w-[220px]">{session.location}</span>
                </p>
              </DialogHeader>

              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-3 relative z-10">
                {/* Access Code */}
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1329]/40 p-4 shadow-sm">
                  <div className="pointer-events-none absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-indigo-500/10 blur-xl" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Code</p>
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5">
                    <span className="flex-1 truncate font-mono text-sm font-bold tracking-widest text-white">
                      {session.accessValue}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(session.accessValue);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Occupancy */}
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1329]/40 p-4 shadow-sm">
                  <div className="pointer-events-none absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-primary/10 blur-xl" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Occupancy</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white tabular-nums">{session.candidateCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ {session.candidateLimit} seats</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (session.candidateCount / session.candidateLimit) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Delivery */}
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1329]/40 p-4 shadow-sm">
                  <div className="pointer-events-none absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-emerald-500/10 blur-xl" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Type</p>
                  <div className="mt-2 flex items-center gap-2">
                    {session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") || session.location.toLowerCase().includes("http")
                      ? <Globe className="h-4 w-4 text-indigo-400" />
                      : <Building className="h-4 w-4 text-slate-400" />}
                    <span className="text-sm font-bold text-white">
                      {session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") || session.location.toLowerCase().includes("http")
                        ? "Virtual"
                        : "In-Person"}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[11px] text-slate-400 font-medium">{session.location}</p>
                </div>
              </div>

              {/* Candidates */}
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Users className="h-4 w-4 text-primary" />
                    Joined Candidates
                  </h3>
                  <Badge variant="secondary" className="rounded-full border-none bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary pointer-events-none">
                    {session.candidates.length}
                  </Badge>
                </div>

                {session.candidates.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[#080c16]/50 p-6 text-sm text-center text-slate-400">
                    No candidates have joined this session yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {session.candidates.map((candidate) => {
                      const progress = getCandidateProgress(candidate, expectedAssessmentCount);
                      const isExpanded = expandedCandidateId === candidate.id;

                      const displayAssessments = (assessmentStack || []).map((stackName) => {
                        const matchedResult = (candidate.results || []).find((r) =>
                          isSameAssessment(stackName, r.assessment)
                        );
                        return matchedResult
                          ? {
                            name: stackName,
                            status: (matchedResult.completedAt || matchedResult.numericScore !== null) ? "completed" : "pending",
                            result: matchedResult,
                          }
                          : { name: stackName, status: "pending", result: null };
                      });

                      const finalDisplayList = displayAssessments.length > 0
                        ? displayAssessments
                        : (candidate.results || []).map((r) => ({
                          name: r.assessment,
                          status: (r.completedAt || r.numericScore !== null) ? "completed" : "pending",
                          result: r,
                        }));

                      // Compute overall weighted score (equal weights)
                      const stackForWeights = assessmentStack || finalDisplayList.map((i) => i.name);
                      const equalWeight = stackForWeights.length > 0 ? 100 / stackForWeights.length : 0;
                      let overallScore = 0;
                      stackForWeights.forEach((name) => {
                        const matched = finalDisplayList.find((i) => i.name === name || isSameAssessment(name, i.name));
                        if (matched?.status === "completed" && matched.result?.numericScore !== null && matched.result?.numericScore !== undefined) {
                          overallScore += (matched.result.numericScore * equalWeight) / 100;
                        }
                      });
                      const roundedOverall = Math.round(overallScore);
                      const hasScore = progress.completed > 0;

                      const initials = candidate.name
                        .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

                      return (
                        <div
                          key={candidate.id}
                          className={[
                            "rounded-2xl border transition-all duration-300",
                            isExpanded
                              ? "border-primary/30 bg-gradient-to-br from-[#0b1329]/40 to-[#080c16]/30 shadow-[0_4px_20px_rgba(99,102,241,0.06)]"
                              : "border-white/10 bg-gradient-to-br from-[#0b1329]/40 to-[#080c16]/30 hover:border-primary/20"
                          ].join(" ")}
                        >
                          {/* Row header */}
                          <div
                            onClick={() => toggleCandidateExpand(candidate.id)}
                            className="grid cursor-pointer select-none gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_104px_auto] sm:items-center"
                          >
                            {/* Left: avatar + info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-indigo-500/25 border border-primary/20 text-xs font-black text-primary uppercase shadow-sm">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-bold text-white tracking-tight leading-snug">{candidate.name}</h4>
                                  <Badge className={[
                                    "pointer-events-none rounded-md border-none text-[10px] font-semibold px-2 py-0.5",
                                    candidate.status === "locked"
                                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/10"
                                      : progress.completed >= progress.total
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : progress.completed > 0
                                          ? "bg-orange-500/10 text-orange-400"
                                          : "bg-slate-500/10 text-slate-400"
                                  ].join(" ")}>
                                    {candidate.status === "locked"
                                      ? "Locked"
                                      : progress.completed >= progress.total
                                        ? "Completed"
                                        : progress.completed > 0
                                          ? "In Progress"
                                          : "Not Started"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 break-all font-medium">{candidate.email || "No email provided"}</p>
                              </div>
                            </div>

                            <div className="flex justify-center sm:justify-self-center">
                              <ScoreRing value={hasScore ? roundedOverall : null} />
                            </div>

                            {/* Right: stats + actions */}
                            <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                              <div className="min-w-[130px] border-r border-white/5 pr-4">
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progress</p>
                                  <p className="text-sm font-extrabold text-white tabular-nums">
                                    {progress.completed}/{progress.total}
                                  </p>
                                </div>
                                <div className="mt-2 flex justify-end gap-1">
                                  {finalDisplayList.map((item, idx) => {
                                    const isCompleted = item.status === "completed";
                                    return (
                                      <span
                                        key={`${item.name}-${idx}`}
                                        title={`${item.name}: ${isCompleted ? "Completed" : "Pending"}`}
                                        className={[
                                          "h-2.5 w-6 rounded-full border transition-colors",
                                          isCompleted
                                            ? "border-emerald-400/40 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.24)]"
                                            : "border-white/10 bg-white/[0.04]"
                                        ].join(" ")}
                                      />
                                    );
                                  })}
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenResults(candidate)}
                                className="h-9 rounded-xl border-white/10 bg-white/[0.02] px-4 text-xs font-semibold text-slate-200 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors hover:border-primary/30"
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View results
                              </Button>

                              {(onKickCandidate || (candidate.status === "locked" && onUnlockCandidate)) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="border-white/10 bg-slate-900 text-slate-200">
                                    {candidate.status === "locked" && onUnlockCandidate && (
                                      <DropdownMenuItem
                                        disabled={unlockingCandidateId === candidate.id || (session.startsAt ? new Date(session.startsAt).getTime() > Date.now() : false)}
                                        onClick={() => onUnlockCandidate(candidate.id)}
                                        className="flex items-center gap-2 text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-300 cursor-pointer font-bold"
                                      >
                                        <Check className="h-4 w-4" />
                                        {unlockingCandidateId === candidate.id ? "Unlocking…" : "Unlock candidate"}
                                      </DropdownMenuItem>
                                    )}
                                    {onKickCandidate && (
                                      <DropdownMenuItem
                                        disabled={Boolean(candidate.hasStartedAssessment) || removingCandidateId === candidate.id}
                                        onClick={() => onKickCandidate(session.id, candidate.id)}
                                        className="flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                      >
                                        <UserMinus className="h-4 w-4" />
                                        {removingCandidateId === candidate.id ? "Removing…" : "Remove candidate"}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleCandidateExpand(candidate.id)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                                aria-label={isExpanded ? "Collapse candidate details" : "Expand candidate details"}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Accordion body — segment bars */}
                          {isExpanded && (
                            <div className="border-t border-white/5 bg-black/10 p-4 animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                              <div className="flex items-center justify-between text-sm text-slate-400">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assessment Breakdown</span>
                                <span className="text-xs font-semibold text-slate-400">{progress.completed}/{progress.total} completed</span>
                              </div>
                              {/* Segment bars */}
                              <div className="h-4 w-full flex gap-1.5">
                                {finalDisplayList.map((item, idx) => {
                                  const isCompleted = item.status === "completed";
                                  const scoreVal = item.result?.numericScore ?? 0;
                                  const key = getAssessmentKey(item.name, item.result);
                                  let colorClass = "bg-primary";
                                  if (key === "typing") colorClass = "bg-indigo-500";
                                  else if (key === "prioritisation") colorClass = "bg-sky-500";
                                  else if (key === "situational-judgement") colorClass = "bg-violet-500";
                                  else if (key === "call-simulation") colorClass = "bg-emerald-500";
                                  return (
                                    <div
                                      key={`${item.name}-${idx}`}
                                      className="relative flex-1 h-full bg-white/[0.04] border border-white/10 rounded-full overflow-hidden"
                                      title={`${item.name}: ${isCompleted ? `${scoreVal}%` : "Pending"}`}
                                    >
                                      <div
                                        className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
                                        style={{ width: `${isCompleted ? scoreVal : 0}%` }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Labels row */}
                              <div className="flex gap-1.5">
                                {finalDisplayList.map((item, idx) => {
                                  const isCompleted = item.status === "completed";
                                  const scoreVal = item.result?.numericScore ?? 0;
                                  return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                                      <span className="w-full truncate text-center text-sm font-bold tabular-nums text-slate-300">
                                        {isCompleted ? `${scoreVal}%` : "—"}
                                      </span>
                                      <span className="w-full truncate text-center text-xs font-medium leading-tight text-slate-500">
                                        {item.name.split(" ")[0]}
                                      </span>
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

      <CandidateResultsDialog
        resultsDialog={resultsDialog}
        onClose={() => setResultsDialog(null)}
      />
    </>
  );
}

export function CandidateResultsDialog({
  resultsDialog,
  onClose,
}: {
  resultsDialog: ResultsDialogState | null;
  onClose: () => void;
}) {
  if (!resultsDialog) return null;
  const campaignRoleLabel = [resultsDialog.campaignName, resultsDialog.role]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={Boolean(resultsDialog)} onOpenChange={() => { }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="fixed left-1/2 top-1/2 h-[min(86dvh,900px)] max-h-[86dvh] w-[min(92vw,1280px)] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-[#0e172e] to-[#080c16]/95 p-6 text-slate-100 shadow-2xl backdrop-blur-md flex flex-col gap-5 [&>button]:hidden"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="absolute right-5 top-5 z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close results"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/5 pb-4 pr-12">
          <DialogTitle className="truncate text-sm font-bold text-white">{resultsDialog.candidateName}</DialogTitle>
          {resultsDialog.candidateEmail && (
            <>
              <span className="text-slate-600">·</span>
              <span className="truncate text-xs font-medium text-slate-400">{resultsDialog.candidateEmail}</span>
            </>
          )}
          {campaignRoleLabel && (
            <>
              <span className="text-slate-600">·</span>
              <span className="truncate text-xs font-medium text-slate-300">{campaignRoleLabel}</span>
            </>
          )}
        </div>

        <div className="relative z-10">
          <HiringManagerCandidateReport
            candidateId={resultsDialog.candidateId}
            campaignId={resultsDialog.campaignId}
            candidateSessionId={resultsDialog.candidateSessionId}
            embedded
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScoreRing({ value }: { value: number | null }) {
  const normalizedValue =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : null;
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const progress = normalizedValue === null ? 0 : normalizedValue / 100;
  const scoreHue = Math.round((normalizedValue ?? 0) * 1.2);
  const scoreColor =
    normalizedValue === null ? "rgb(100 116 139)" : `hsl(${scoreHue}, 72%, 58%)`;

  return (
    <div className="flex items-center justify-center">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeLinecap="round"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black leading-none tabular-nums text-white">
            {normalizedValue === null ? "-" : normalizedValue}
          </span>
        </div>
      </div>
    </div>
  );
}

function getCandidateProgress(candidate: SessionCandidate, expectedAssessmentCount?: number) {
  const completed = new Set(
    candidate.results
      .filter((r) => r.completedAt || r.numericScore !== null)
      .map((r) => r.id || r.assessment)
  ).size;
  const total = Math.max(expectedAssessmentCount || 0, candidate.results.length, completed, 1);
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

function normalizeAssessmentText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/prioritization/g, "prioritisation")
    .replace(/[^a-z0-9]/g, "");
}

function getAssessmentKey(value?: string | null, result?: any) {
  const normalized = normalizeAssessmentText(value);
  if (normalized.includes("prioritisation") || normalized === "pja") return "prioritisation";
  if (normalized.includes("situationaljudgement") || normalized === "sjt") return "situational-judgement";
  if (normalized.includes("callsimulation")) return "call-simulation";
  if (normalized.includes("typing")) return "typing";
  if (result) {
    if (typeof result.wpm === "number" || typeof result.accuracy === "number") return "typing";
    if (result.metrics) {
      const m = result.metrics;
      if (m.highPriorityAccuracy !== undefined) return "prioritisation";
      if (m.decisionBand !== undefined) return "situational-judgement";
    }
    if (typeof result.durationSeconds === "number") return "call-simulation";
  }
  return "";
}

function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);
  if (expectedKey && resultKey) return expectedKey === resultKey;
  const expected = normalizeAssessmentText(expectedName);
  const result = normalizeAssessmentText(resultName);
  return expected && result ? expected.includes(result) || result.includes(expected) : false;
}
