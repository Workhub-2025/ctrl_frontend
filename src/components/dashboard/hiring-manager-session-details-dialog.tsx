"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  Globe,
  Building,
  Check,
  Copy,
  Users,
  ChevronDown,
  ChevronUp,
  Eye,
  LockOpen,
  RefreshCw,
  Trash2,
  BarChart3,
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
  portalIconWrapClass,
  portalIconWrapLgClass,
  portalLabelClass,
  portalPanelElevatedClass,
  portalPanelNestedClass,
  portalProgressBarClass,
  portalStatTileClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHmAssessmentItemStatus, isAbandonedAssessmentResult } from "@/lib/assessment-result-status";
import { isSameAssessment } from "@/lib/hiring-manager/assessment-matching";
import { CandidateEmailInvitesPanel } from "@/components/dashboard/candidate-email-invites-panel";
import { HiringManagerCandidateReport } from "@/components/dashboard/hiring-manager-candidate-report";
import { AssessmentOverallScoreCell } from "@/components/dashboard/assessment-overall-score-cell";
import {
  PortalDetailHeader,
  portalDetailDialogContentClass,
} from "@/components/dashboard/portal/portal-dialog-ui";
import {
  formatInviteStatusLabel,
  isCandidateJoined,
} from "@/lib/hiring-manager/resolve-candidate-display-name";
import { getHmSessionDisplayName } from "@/lib/hiring-manager/session-display";
import { computeWeightedCompositeScore } from "@/lib/hiring-manager/composite-score";
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
  layout?: "dialog" | "page";
  campaignName?: string;
  campaignRole?: string;
  campaignId?: string;
  expectedAssessmentCount?: number;
  removingCandidateId?: string | null;
  onKickCandidate?: (sessionId: string, candidateId: string) => void;
  onOpenResults?: (candidate: SessionCandidate) => void;
  assessmentStack?: string[];
  onUnlockCandidate?: (candidateSessionId: string) => void;
  unlockingCandidateId?: string | null;
  onUpdateSessionStatus?: (sessionId: string, status: "closed") => void;
  updatingSessionId?: string | null;
  onDeleteSession?: (sessionId: string) => void;
  deletingSessionId?: string | null;
  onInvitesSent?: () => void | Promise<void>;
};

export function HiringManagerSessionDetailsDialog({
  session,
  open,
  onOpenChange,
  layout = "dialog",
  campaignName,
  campaignRole,
  campaignId,
  expectedAssessmentCount,
  removingCandidateId,
  onKickCandidate,
  onOpenResults,
  assessmentStack,
  onUnlockCandidate,
  unlockingCandidateId,
  onUpdateSessionStatus,
  updatingSessionId,
  onDeleteSession,
  deletingSessionId,
  onInvitesSent,
}: HiringManagerSessionDetailsDialogProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [resultsDialog, setResultsDialog] = useState<ResultsDialogState | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    setCurrentTime(Date.now());
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [open]);

  const toggleCandidateExpand = (candidateId: string) => {
    setExpandedCandidateId((current) => (current === candidateId ? null : candidateId));
  };

  const handleClose = () => {
    onOpenChange(false);
    setExpandedCandidateId(null);
    setCopiedCode(false);
  };

  const handleOpenResults = (candidate: SessionCandidate) => {
    if (onOpenResults) {
      onOpenResults(candidate);
      return;
    }
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

  const workspace = session ? (
    <HiringManagerSessionWorkspace
      session={session}
      layout={layout}
      campaignName={campaignName}
      expectedAssessmentCount={expectedAssessmentCount}
      removingCandidateId={removingCandidateId}
      onKickCandidate={onKickCandidate}
      assessmentStack={assessmentStack}
      onUnlockCandidate={onUnlockCandidate}
      unlockingCandidateId={unlockingCandidateId}
      onUpdateSessionStatus={onUpdateSessionStatus}
      updatingSessionId={updatingSessionId}
      onDeleteSession={onDeleteSession}
      deletingSessionId={deletingSessionId}
      onInvitesSent={onInvitesSent}
      onClose={handleClose}
      onOpenResults={handleOpenResults}
      copiedCode={copiedCode}
      setCopiedCode={setCopiedCode}
      expandedCandidateId={expandedCandidateId}
      toggleCandidateExpand={toggleCandidateExpand}
      currentTime={currentTime}
    />
  ) : null;

  if (layout === "page") {
    return workspace;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={() => { }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={portalDetailDialogContentClass}
        >
          {workspace}
        </DialogContent>
      </Dialog>

      <CandidateResultsDialog
        resultsDialog={resultsDialog}
        onClose={() => setResultsDialog(null)}
      />
    </>
  );
}

type HiringManagerSessionWorkspaceProps = {
  session: HiringManagerSessionListItem;
  layout: "dialog" | "page";
  campaignName?: string;
  expectedAssessmentCount?: number;
  removingCandidateId?: string | null;
  onKickCandidate?: (sessionId: string, candidateId: string) => void;
  assessmentStack?: string[];
  onUnlockCandidate?: (candidateSessionId: string) => void;
  unlockingCandidateId?: string | null;
  onUpdateSessionStatus?: (sessionId: string, status: "closed") => void;
  updatingSessionId?: string | null;
  onDeleteSession?: (sessionId: string) => void;
  deletingSessionId?: string | null;
  onInvitesSent?: () => void | Promise<void>;
  onClose: () => void;
  onOpenResults: (candidate: SessionCandidate) => void;
  copiedCode: boolean;
  setCopiedCode: (value: boolean) => void;
  expandedCandidateId: string | null;
  toggleCandidateExpand: (candidateId: string) => void;
  currentTime: number;
};

function HiringManagerSessionWorkspace({
  session,
  layout,
  campaignName,
  expectedAssessmentCount,
  removingCandidateId,
  onKickCandidate,
  assessmentStack,
  onUnlockCandidate,
  unlockingCandidateId,
  onUpdateSessionStatus,
  updatingSessionId,
  onDeleteSession,
  deletingSessionId,
  onInvitesSent,
  onClose,
  onOpenResults,
  copiedCode,
  setCopiedCode,
  expandedCandidateId,
  toggleCandidateExpand,
  currentTime,
}: HiringManagerSessionWorkspaceProps) {
  const isInPerson = !(
    session.location.toLowerCase().includes("zoom") ||
    session.location.toLowerCase().includes("remote") ||
    session.location.toLowerCase().includes("http")
  );

  const sessionDisplayName = getHmSessionDisplayName(session);

  return (
    <>
      <div className={cn("relative z-10 shrink-0", layout === "dialog" ? "px-6 pb-5 pt-6" : "pb-5")}>
        <PortalDetailHeader
          layout={layout}
          eyebrow="Session workspace"
          title={sessionDisplayName}
          icon={CalendarClock}
          badges={
            <>
              <Badge
                className={cn(
                  "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                  getStatusTone(session.status)
                )}
              >
                {session.status}
              </Badge>
              <Badge
                className={cn(
                  "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                  portalBadgeClass
                )}
              >
                {session.type}
              </Badge>
            </>
          }
          metadata={
            <p className="max-w-2xl text-xs font-medium leading-5 text-muted-foreground">
              <span>{session.campaign}</span>
              <span className="mx-1.5 text-border/80 dark:text-white/20">·</span>
              <span>{session.date}</span>
              {session.startsAt &&
              new Date(session.startsAt).getTime() > Date.now() &&
              session.status === "Upcoming" ? (
                <>
                  <span className="mx-1.5 text-border/80 dark:text-white/20">·</span>
                  <span className={cn(portalBadgeClass, "inline-flex px-1.5 py-0 text-[10px] font-semibold normal-case tracking-normal")}>
                    Scheduled
                  </span>
                </>
              ) : null}
              <span className="mx-1.5 text-border/80 dark:text-white/20">·</span>
              <span className="break-words">{session.location}</span>
            </p>
          }
          onClose={onClose}
          closeLabel="Close session workspace"
          actions={
            <>
              {session.candidateCount === 0 && onDeleteSession ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deletingSessionId === session.id}
                  onClick={() => onDeleteSession(session.id)}
                  className="h-9 rounded-lg border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
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
                          variant="outline"
                          disabled={
                            updatingSessionId === session.id ||
                            !areAllSessionCandidatesComplete(
                              session.candidates,
                              expectedAssessmentCount
                            )
                          }
                          onClick={() => onUpdateSessionStatus(session.id, "closed")}
                          className="h-9 rounded-lg border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingSessionId === session.id ? "Closing…" : "Close session"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!areAllSessionCandidatesComplete(
                      session.candidates,
                      expectedAssessmentCount
                    ) ? (
                      <TooltipContent className="max-w-xs">
                        All candidates must complete their assessments before closing this session.
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </>
          }
        />
      </div>

              <div className={cn("relative z-10 space-y-6", layout === "dialog" && "flex-1 overflow-y-auto px-6 pb-6")}>
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className={portalStatTileClass}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={portalLabelClass}>Session code</p>
                    <span className={portalIconWrapClass} aria-hidden="true">
                      <Copy className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                    <span className="flex-1 truncate font-mono text-sm font-semibold tracking-widest text-foreground">
                      {session.accessValue}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(session.accessValue);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Copy session code"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className={portalStatTileClass}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={portalLabelClass}>Occupancy</p>
                    <span className={portalIconWrapClass} aria-hidden="true">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-display text-2xl font-bold text-foreground tabular-nums">{session.candidateCount}</span>
                    <span className="text-xs font-medium text-muted-foreground">/ {session.candidateLimit} seats</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                    <div
                      className={portalProgressBarClass}
                      style={{ width: `${Math.min(100, (session.candidateCount / session.candidateLimit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className={portalStatTileClass}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={portalLabelClass}>Delivery type</p>
                    <span className={portalIconWrapClass} aria-hidden="true">
                      {session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") || session.location.toLowerCase().includes("http")
                        ? <Globe className="h-4 w-4" />
                        : <Building className="h-4 w-4" />}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {session.location.toLowerCase().includes("zoom") || session.location.toLowerCase().includes("remote") || session.location.toLowerCase().includes("http")
                      ? "Virtual"
                      : "In-person"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{session.location}</p>
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
                }
                disabledReason={
                  session.status === "Closed" || session.status === "Cancelled"
                    ? "This session is no longer accepting invites."
                    : undefined
                }
                onInvitesSent={onInvitesSent}
              />

              {/* Candidates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3 dark:border-white/10">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className={portalIconWrapClass} aria-hidden="true">
                      <Users className="h-4 w-4" />
                    </span>
                    Joined candidates
                  </h3>
                  <Badge
                    className={cn(
                      "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                      portalBadgeClass
                    )}
                  >
                    {session.candidates.length}
                  </Badge>
                </div>

                {session.candidates.length === 0 ? (
                  <div className={cn(portalPanelNestedClass, "border-dashed p-6 text-center text-sm text-muted-foreground")}>
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

                      const stackForWeights = assessmentStack || finalDisplayList.map((i) => i.name);
                      const weightedStack = stackForWeights.map((name) => ({
                        displayName: name,
                        weight: stackForWeights.length > 0 ? 100 / stackForWeights.length : 0,
                      }));
                      const overallScore = computeWeightedCompositeScore(weightedStack, candidate.results ?? []);
                      const inviteLabel = formatInviteStatusLabel(candidate.inviteStatus);
                      const hasJoined = isCandidateJoined(candidate.inviteStatus);
                      const sessionStartsAtTime = session.startsAt ? new Date(session.startsAt).getTime() : 0;
                      const isUnlockWindowOpen =
                        !sessionStartsAtTime ||
                        Number.isNaN(sessionStartsAtTime) ||
                        currentTime >= sessionStartsAtTime;
                      const showUnlockControl =
                        candidate.status === "locked" &&
                        isInPerson &&
                        Boolean(onUnlockCandidate);

                      const initials = candidate.name
                        .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

                      return (
                        <div
                          key={candidate.id}
                          className={cn(
                            portalPanelElevatedClass,
                            "rounded-xl transition-colors",
                            isExpanded && "border-primary/20"
                          )}
                        >
                          {/* Row header */}
                          <div
                            onClick={() => toggleCandidateExpand(candidate.id)}
                            className="grid cursor-pointer select-none gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-center"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={cn(portalIconWrapLgClass, "relative text-xs font-semibold uppercase")}>
                                {hasJoined ? (
                                  <span
                                    className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/25"
                                    aria-hidden="true"
                                  />
                                ) : null}
                                {initials}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold leading-snug tracking-tight text-foreground">
                                    {candidate.name}
                                  </h4>
                                  {inviteLabel ? (
                                    <Badge
                                      className={cn(
                                        "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold capitalize",
                                        portalBadgeClass
                                      )}
                                    >
                                      {inviteLabel}
                                    </Badge>
                                  ) : null}
                                  <Badge
                                    className={cn(
                                      "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                                      portalBadgeClass
                                    )}
                                  >
                                    {candidate.status === "locked"
                                      ? "Locked"
                                      : progress.completed >= progress.total
                                        ? "Completed"
                                        : progress.completed > 0
                                          ? "In progress"
                                          : "Not started"}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 break-all text-xs font-medium text-muted-foreground">
                                  {candidate.email || "No email provided"}
                                </p>
                              </div>
                            </div>

                            <div className="flex min-h-10 items-center justify-center sm:justify-self-center">
                              {showUnlockControl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onUnlockCandidate?.(candidate.id);
                                  }}
                                  disabled={!isUnlockWindowOpen || unlockingCandidateId === candidate.id}
                                  title={
                                    isUnlockWindowOpen
                                      ? "Unlock candidate"
                                      : "Unlock is available when the session starts"
                                  }
                                  className="h-9 w-[112px] shrink-0 rounded-lg px-3 text-xs font-semibold"
                                >
                                  {unlockingCandidateId === candidate.id ? (
                                    <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Unlocking</>
                                  ) : (
                                    <><LockOpen className="mr-1.5 h-3.5 w-3.5" /> Unlock</>
                                  )}
                                </Button>
                              ) : (
                                <ScoreRing value={overallScore} />
                              )}
                            </div>

                            {/* Right: stats + actions */}
                            <div className="flex items-center justify-end gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!showUnlockControl ? (
                                <div className="hidden min-w-[130px] border-r border-border/50 pr-4 dark:border-white/10 sm:block">
                                  <div className="text-right">
                                    <p className={portalLabelClass}>Overall score</p>
                                    <div className="mt-1 flex justify-end">
                                      <AssessmentOverallScoreCell
                                        assessmentStack={stackForWeights}
                                        results={candidate.results ?? []}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenResults(candidate)}
                                className="h-9 rounded-lg px-4 text-xs font-semibold"
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View results
                              </Button>

                              {onKickCandidate ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      disabled={Boolean(candidate.hasStartedAssessment) || removingCandidateId === candidate.id}
                                      onClick={() => onKickCandidate(session.id, candidate.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                      {removingCandidateId === candidate.id ? "Removing…" : "Remove candidate"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => toggleCandidateExpand(candidate.id)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={isExpanded ? "Collapse candidate details" : "Expand candidate details"}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Accordion body — segment bars */}
                          {isExpanded ? (
                            <div className="space-y-3 border-t border-border/50 p-4 dark:border-white/10">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span className="text-xs font-medium">Assessment breakdown</span>
                                <span className="text-xs font-medium">{progress.completed}/{progress.total} completed</span>
                              </div>
                              <div className="flex h-4 w-full gap-1.5">
                                {finalDisplayList.map((item, idx) => {
                                  const isCompleted = item.status === "completed";
                                  const isAbandoned = item.status === "abandoned";
                                  const scoreVal = item.result?.numericScore ?? 0;
                                  return (
                                    <div
                                      key={`${item.name}-${idx}`}
                                      className="relative h-full flex-1 overflow-hidden rounded-full border border-border/60 bg-muted/20 dark:border-white/10 dark:bg-white/[0.04]"
                                      title={`${item.name}: ${isAbandoned ? "Abandoned" : isCompleted ? `${scoreVal}%` : "Pending"}`}
                                    >
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-500",
                                          isAbandoned ? "bg-muted-foreground/40" : "bg-primary"
                                        )}
                                        style={{ width: `${isAbandoned ? 100 : isCompleted ? scoreVal : 0}%` }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex gap-1.5">
                                {finalDisplayList.map((item, idx) => {
                                  const isCompleted = item.status === "completed";
                                  const isAbandoned = item.status === "abandoned";
                                  const scoreVal = item.result?.numericScore ?? 0;
                                  return (
                                    <div key={idx} className="flex flex-1 flex-col items-center gap-0.5">
                                      <span className="w-full truncate text-center text-sm font-semibold tabular-nums text-foreground">
                                        {isAbandoned ? "Abd." : isCompleted ? `${scoreVal}%` : "—"}
                                      </span>
                                      <span className="w-full truncate text-center text-xs font-medium leading-tight text-muted-foreground">
                                        {item.name.split(" ")[0]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>
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
  const metadataParts = [
    resultsDialog.candidateEmail,
    resultsDialog.campaignName,
    resultsDialog.role,
  ].filter(Boolean);

  return (
    <Dialog open={Boolean(resultsDialog)} onOpenChange={() => { }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={portalDetailDialogContentClass}
      >
        <div className="relative z-10 shrink-0 px-6 pb-5 pt-6">
          <PortalDetailHeader
            layout="dialog"
            eyebrow="Candidate report"
            title={resultsDialog.candidateName}
            icon={BarChart3}
            onClose={onClose}
            closeLabel="Close results"
            metadata={
              metadataParts.length > 0 ? (
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
              ) : null
            }
          />
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-6">
          <HiringManagerCandidateReport
            candidateId={resultsDialog.candidateId}
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

  return (
    <div className="flex items-center justify-center">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className="stroke-muted/50"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className="stroke-primary"
            strokeLinecap="round"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold leading-none tabular-nums text-foreground">
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
