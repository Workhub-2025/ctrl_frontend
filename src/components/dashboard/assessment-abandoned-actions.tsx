"use client";

import { useState } from "react";
import { Headset, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { AssessmentRecoveryDialog } from "@/components/assessment/shared";
import {
  buildAssessmentRecoveryTicket,
  formatAbandonSnapshotSummary,
} from "@/lib/assessment-abandon-summary";
import {
  AssessmentAttemptService,
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
  compact?: boolean;
  onRecovered?: () => void;
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
  compact = false,
  onRecovered,
}: AssessmentAbandonedActionsProps) {
  const [recoverOpen, setRecoverOpen] = useState(false);

  const attempt: CandidateAssessmentAttempt = {
    candidateSessionDocumentId,
    assessmentSlug,
    contentVersion,
    snapshot,
    abandonReason,
    abandonedAt,
    candidateSession: { campaign: { name: campaignName ?? undefined } },
  };

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
        <Button size="sm" variant="secondary" onClick={() => setRecoverOpen(true)}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Recover
        </Button>
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
        recoverFn={AssessmentAttemptService.recover.bind(AssessmentAttemptService)}
        versionsUrl="/api/assessment/versions"
      />
    </div>
  );
}

export function formatAbandonedAssessmentSummary(
  assessmentName: string,
  rawData?: Record<string, unknown> | null,
  contentVersion?: string | null
) {
  const slug = assessmentName
    .toLowerCase()
    .replace(/prioritization/g, "prioritisation")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const normalizedSlug = slug.includes("situational")
    ? "situational-judgement"
    : slug.includes("prioritisation") || slug === "pja"
      ? "prioritisation"
      : slug.includes("call")
        ? "call-simulation"
        : slug.includes("typing")
          ? "typing"
          : slug;

  return formatAbandonSnapshotSummary(
    normalizedSlug,
    rawData && typeof rawData === "object" && !("abandoned" in rawData && Object.keys(rawData).length === 1)
      ? rawData
      : null,
    contentVersion
  );
}
