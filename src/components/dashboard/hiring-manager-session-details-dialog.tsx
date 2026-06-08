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
import { UserMinus } from "lucide-react";
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
                <div className="grid gap-2">
                  {session.candidates.map((candidate) => {
                    const progress = getCandidateProgress(candidate, expectedAssessmentCount);
                    const resultsHref = getResultsHref?.(candidate, session);

                    return (
                      <div
                        key={candidate.id}
                        className="rounded-xl border border-border bg-background p-3 shadow-sm dark:border-white/10 dark:bg-[#04070d]"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            {onKickCandidate && (
                              <KickButton
                                disabled={Boolean(candidate.hasStartedAssessment)}
                                isRemoving={removingCandidateId === candidate.id}
                                onKick={() => onKickCandidate(session.id, candidate.id)}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium text-foreground">
                                {candidate.name}
                              </p>
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
                            <Progress value={progress.percent} className="mt-3 h-2 bg-muted dark:bg-white/10" />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            {resultsHref && (
                              <Button
                                variant="outline"
                                className="h-9 rounded-md border-border bg-card px-3 text-xs text-foreground hover:bg-muted dark:border-white/10 dark:bg-[#08101d] dark:hover:bg-white/[0.05]"
                                asChild
                              >
                                <Link href={resultsHref}>View results</Link>
                              </Button>
                            )}
                          </div>
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
