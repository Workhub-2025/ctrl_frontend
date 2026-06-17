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
  LockOpen,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { areAllSessionCandidatesComplete } from "@/lib/hiring-manager/session-completion";
import {
  portalBadgeClass,
  portalDialogShellClass,
  portalPanelClass,
  portalPanelElevatedClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHmAssessmentItemStatus, isAbandonedAssessmentResult } from "@/lib/assessment-result-status";
import { isKnownAssessmentSlug, normalizeAssessmentSlugInput, normalizeSlug, resolveAssessmentSlug } from "@/lib/assessment-slug";
import { CandidateEmailInvitesPanel } from "@/components/dashboard/candidate-email-invites-panel";
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
  onUpdateSessionStatus?: (sessionId: string, status: "closed") => void;
  updatingSessionId?: string | null;
  onDeleteSession?: (sessionId: string) => void;
  deletingSessionId?: string | null;
  campaignStatus?: "Live" | "Configured" | "Draft" | "Closed" | "Archived";
  onInvitesSent?: () => void | Promise<void>;
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
  onDeleteSession,
  deletingSessionId,
  campaignStatus,
  onInvitesSent,
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
          className={cn(
            portalDialogShellClass,
            "fixed left-1/2 top-1/2 flex h-[min(86dvh,900px)] max-h-[86dvh] w-[min(92vw,1280px)] max-w-none -translate-x-1/2 -translate-y-1/2 flex-col gap-5 p-6 [&>button]:hidden"
          )}
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
              {/* Compute isInPerson for this session */}
              {(() => {
                const isInPerson = !(session.location.toLowerCase().includes('zoom') || session.location.toLowerCase().includes('remote') || session.location.toLowerCase().includes('http'));
                return (
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
                    {session.candidateCount === 0 && onDeleteSession ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={deletingSessionId === session.id}
                        onClick={() => onDeleteSession(session.id)}
                        className="h-8 rounded-lg text-xs font-bold border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all duration-300 cursor-pointer"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {deletingSessionId === session.id ? "Deleting…" : "Delete session"}
                      </Button>
                    ) : null}
                    {session.status === "Live" &&
                    session.candidateCount > 0 &&
                    onUpdateSessionStatus ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  updatingSessionId === session.id ||
                                  !areAllSessionCandidatesComplete(
                                    session.candidates,
                                    expectedAssessmentCount
                                  )
                                }
                                onClick={() => onUpdateSessionStatus(session.id, "closed")}
                                className="h-8 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
                              >
                                {updatingSessionId === session.id ? "Closing..." : "Close Session"}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!areAllSessionCandidatesComplete(
                            session.candidates,
                            expectedAssessmentCount
                          ) ? (
                            <TooltipContent className="border-white/10 bg-slate-950 text-slate-100">
                              All candidates must complete their assessments before closing
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-medium">
                  <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                  <span>{session.date}</span>
                  {session.startsAt && new Date(session.startsAt).getTime() > Date.now() && session.status === "Upcoming" && (
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
                <div className={cn(portalPanelElevatedClass, "relative overflow-hidden p-4 shadow-sm")}>
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
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Occupancy */}
                <div className={cn(portalPanelElevatedClass, "relative overflow-hidden p-4 shadow-sm")}>
                  <div className="pointer-events-none absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-primary/10 blur-xl" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Occupancy</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white tabular-nums">{session.candidateCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ {session.candidateLimit} seats</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                    <div
                      className={portalProgressBarClass}
                      style={{ width: `${Math.min(100, (session.candidateCount / session.candidateLimit) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Delivery */}
                <div className={cn(portalPanelClass, "relative overflow-hidden p-4 shadow-sm")}>
                  <div className="pointer-events-none absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-12 w-12 rounded-full bg-primary/10 blur-xl" />
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

              <CandidateEmailInvitesPanel
                sessionId={session.id}
                deliveryMode={session.type}
                candidateCount={session.candidateCount}
                candidateLimit={session.candidateLimit}
                pendingInvites={session.pendingInvites}
                disabled={
                  session.status === "Closed"
                  || session.status === "Cancelled"
                  || campaignStatus !== "Live"
                }
                disabledReason={
                  campaignStatus !== "Live"
                    ? "Invites are available once the campaign is live."
                    : session.status === "Closed" || session.status === "Cancelled"
                      ? "This session is no longer accepting invites."
                      : undefined
                }
                onInvitesSent={onInvitesSent}
              />

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
                            status: getHmAssessmentItemStatus(matchedResult),
                            result: matchedResult,
                          }
                          : { name: stackName, status: "pending" as const, result: null };
                      });

                      const finalDisplayList = displayAssessments.length > 0
                        ? displayAssessments
                        : (candidate.results || []).map((r) => ({
                          name: r.assessment,
                          status: getHmAssessmentItemStatus(r),
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
                              ? cn(portalPanelElevatedClass, "border-primary/30 shadow-[0_4px_20px_rgba(99,102,241,0.06)]")
                              : cn(portalPanelElevatedClass, "border-white/10 hover:border-primary/20")
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
                                  <Badge className={cn(portalBadgeClass, "pointer-events-none border-none text-[10px] font-semibold")}>
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

                            {(() => {
                              const showPromptUnlock = candidate.status === 'locked' && isInPerson && onUnlockCandidate;
                              if (showPromptUnlock) {
                                return (
                                  <div className="flex items-center gap-3 col-span-2 justify-center sm:justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); onUnlockCandidate(candidate.id); }}
                                      disabled={unlockingCandidateId === candidate.id}
                                      className="h-9 rounded-xl px-4 text-xs font-semibold transition-colors"
                                    >
                                      {unlockingCandidateId === candidate.id ? (
                                        <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Unlocking...</>
                                      ) : (
                                        <><LockOpen className="mr-1.5 h-3.5 w-3.5" /> Unlock</>
                                      )}
                                    </Button>
                                  </div>
                                );
                              }
                              return (
                                <>
                                  <div className="flex justify-center sm:justify-self-center">
                                    <ScoreRing value={hasScore ? roundedOverall : null} />
                                  </div>
                                </>
                              );
                            })()}

                            {/* Right: stats + actions */}
                            <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!(candidate.status === 'locked' && isInPerson && onUnlockCandidate) && (
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
                                    const isAbandoned = item.status === "abandoned";
                                    return (
                                      <span
                                        key={`${item.name}-${idx}`}
                                        title={`${item.name}: ${isAbandoned ? "Abandoned" : isCompleted ? "Completed" : "Pending"}`}
                                        className={[
                                          "h-2.5 w-6 rounded-full border transition-colors",
                                          isAbandoned
                                            ? "border-orange-400/40 bg-orange-500/70"
                                            : isCompleted
                                            ? "border-primary/40 bg-primary shadow-[0_0_8px_rgba(99,102,241,0.24)]"
                                            : "border-white/10 bg-white/[0.04]"
                                        ].join(" ")}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenResults(candidate)}
                                className="h-9 rounded-xl border-white/10 bg-white/[0.02] px-4 text-xs font-semibold text-slate-200 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors hover:border-primary/30"
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View results
                              </Button>

                              {onKickCandidate && (
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
                                    <DropdownMenuItem
                                      disabled={Boolean(candidate.hasStartedAssessment) || removingCandidateId === candidate.id}
                                      onClick={() => onKickCandidate(session.id, candidate.id)}
                                      className="flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                      {removingCandidateId === candidate.id ? "Removing…" : "Remove candidate"}
                                    </DropdownMenuItem>
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
                                  const isAbandoned = item.status === "abandoned";
                                  const scoreVal = item.result?.numericScore ?? 0;
                                  const colorClass = isAbandoned ? "bg-orange-500" : "bg-primary";
                                  return (
                                    <div
                                      key={`${item.name}-${idx}`}
                                      className="relative flex-1 h-full bg-white/[0.04] border border-white/10 rounded-full overflow-hidden"
                                      title={`${item.name}: ${isAbandoned ? "Abandoned" : isCompleted ? `${scoreVal}%` : "Pending"}`}
                                    >
                                      <div
                                        className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
                                        style={{ width: `${isAbandoned ? 100 : isCompleted ? scoreVal : 0}%` }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Labels row */}
                              <div className="flex gap-1.5">
                                {finalDisplayList.map((item, idx) => {
                                  const isCompleted = item.status === "completed";
                                  const isAbandoned = item.status === "abandoned";
                                  const scoreVal = item.result?.numericScore ?? 0;
                                  return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                                      <span className="w-full truncate text-center text-sm font-bold tabular-nums text-slate-300">
                                        {isAbandoned ? "Abd." : isCompleted ? `${scoreVal}%` : "—"}
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
                );
              })()}
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
        className={cn(
          portalDialogShellClass,
          "fixed left-1/2 top-1/2 flex h-[min(86dvh,900px)] max-h-[86dvh] w-[min(92vw,1280px)] max-w-none -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-x-hidden p-6 [&>button]:hidden"
        )}
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
      .filter(
        (result) =>
          !isAbandonedAssessmentResult(result.assessmentStatus)
          && (result.completedAt || result.numericScore !== null)
      )
      .map((r) => r.id || r.assessment)
  ).size;
  const total = Math.max(expectedAssessmentCount || 0, candidate.results.length, completed, 1);
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

function getAssessmentKey(value?: string | null, result?: any) {
  const slug = normalizeSlug(value);
  if (isKnownAssessmentSlug(slug)) return slug;

  const resolved = resolveAssessmentSlug(value, result);
  if (resolved) return resolved;

  if (result) {
    if (typeof result.wpm === "number" || typeof result.accuracy === "number") return "typing";
    if (typeof result.durationSeconds === "number") return "call-simulation";
  }
  return "";
}

function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);
  if (expectedKey && resultKey) return expectedKey === resultKey;
  const expected = normalizeAssessmentSlugInput(expectedName);
  const result = normalizeAssessmentSlugInput(resultName);
  return expected && result ? expected.includes(result) || result.includes(expected) : false;
}
