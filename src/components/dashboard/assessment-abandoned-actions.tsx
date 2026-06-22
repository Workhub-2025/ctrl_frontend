"use client";

import { useState } from "react";
import { Headset, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { AssessmentRecoveryDialog } from "@/components/assessment/shared";
import { normalizeSlug } from "@/lib/assessment-slug";
import {
  buildAssessmentRecoveryTicket,
  formatAbandonSnapshotSummary,
} from "@/lib/assessment-abandon-summary";
import {
  AssessmentAttemptService,
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
  recoverFn = AssessmentAttemptService.recover.bind(AssessmentAttemptService),
  versionsUrl = "/api/assessment/versions",
}: AssessmentAbandonedActionsProps) {
  const [recoverOpen, setRecoverOpen] = useState(false);

  const attempt: CandidateAssessmentAttempt = {
    documentId: attemptDocumentId ?? undefined,
    candidateSessionDocumentId,
    assessmentSlug,
    contentVersion,
    snapshot,
    abandonReason,
    abandonedAt,
    attemptStatus,
    candidateSession: { campaign: { name: campaignName ?? undefined } },
  };

  const canRecover = attemptStatus === "abandoned_locked" || !attemptStatus;

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
          <Button size="sm" variant="secondary" onClick={() => setRecoverOpen(true)}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Recover
          </Button>
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

      <AssessmentRecoveryDialog
        attempt={attempt}
        open={recoverOpen}
        onOpenChange={setRecoverOpen}
        onRecovered={onRecovered}
        recoverFn={recoverFn}
        versionsUrl={versionsUrl}
      />
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
