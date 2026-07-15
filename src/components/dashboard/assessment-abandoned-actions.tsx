"use client";

import { Headset, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { normalizeSlug } from "@/lib/assessment-slug";
import {
  buildAssessmentRecoveryTicket,
  formatAbandonSnapshotSummary,
} from "@/lib/assessment-abandon-summary";
import {
  type AssessmentRecoveryMode,
  type CandidateAssessmentAttempt,
} from "@/services/assessment-attempt.service";

type AssessmentAbandonedActionsProps = {
  candidateSessionDocumentId: string;
  assessmentSlug: string;
  assessmentLabel: string;
  candidateName: string;
  candidateEmail?: string | null;
  campaignName?: string | null;
  snapshot?: Record<string, unknown> | null;
  contentVersion?: string | null;
  abandonReason?: string | null;
  abandonedAt?: string | null;
  attemptDocumentId?: string | null;
  attemptStatus?: CandidateAssessmentAttempt["attemptStatus"];
  compact?: boolean;
  onRecovered?: () => void;
  recoverFn?: (input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    action: AssessmentRecoveryMode;
    contentVersion?: string | null;
    attemptDocumentId?: string | null;
  }) => Promise<CandidateAssessmentAttempt>;
  versionsUrl?: string;
};

export function AssessmentAbandonedActions({
  candidateSessionDocumentId,
  assessmentSlug,
  assessmentLabel,
  candidateName,
  candidateEmail,
  campaignName,
  snapshot,
  contentVersion,
  abandonReason,
  abandonedAt,
  attemptDocumentId,
  attemptStatus,
  compact = false,
  onRecovered,
  recoverFn: _recoverFn,
  versionsUrl: _versionsUrl,
}: AssessmentAbandonedActionsProps) {
  const canRecover = attemptStatus === "interrupted_locked" || !attemptStatus;

  const ticket = buildAssessmentRecoveryTicket({
    candidateName,
    candidateEmail,
    candidateSessionDocumentId,
    assessmentSlug,
    assessmentLabel,
    campaignName,
    snapshot,
    contentVersion,
    abandonReason,
    abandonedAt,
  });

  const summary = formatAbandonSnapshotSummary(assessmentSlug, snapshot, contentVersion);

  return (
    <div className={compact ? "space-y-2" : "mt-3 space-y-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3"}>
      {!compact ? (
        <p className="text-xs text-orange-200/80">{summary}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canRecover ? (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-semibold text-orange-800 dark:text-orange-200">
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> Candidate can restart with fresh incidents
          </span>
        ) : null}
        <CreateTicketDialog
          triggerLabel="Escalate to support"
          defaultSubject={ticket.subject}
          defaultDescription={ticket.description}
          defaultCategory={ticket.category}
          onSuccess={onRecovered}
        >
          <Button size="sm" variant="outline">
            <Headset className="mr-2 h-3.5 w-3.5" />
            Escalate
          </Button>
        </CreateTicketDialog>
      </div>
    </div>
  );
}

export function formatAbandonedAssessmentSummary(
  assessmentName: string,
  rawData?: Record<string, unknown> | null,
  contentVersion?: string | null
) {
  return formatAbandonSnapshotSummary(
    normalizeSlug(assessmentName),
    rawData && typeof rawData === "object" && !("abandoned" in rawData && Object.keys(rawData).length === 1)
      ? rawData
      : null,
    contentVersion
  );
}
