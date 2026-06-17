import { formatAssessmentSlugLabel, TIMED_ASSESSMENT_SLUGS } from "@/lib/assessment-result-status";

export function formatAbandonSnapshotSummary(
  assessmentSlug: string,
  snapshot?: Record<string, unknown> | null,
  contentVersion?: string | null
): string {
  const slugLabel = formatAssessmentSlugLabel(assessmentSlug);
  const versionSuffix = contentVersion ? ` · v${contentVersion}` : "";

  if (!snapshot || Object.keys(snapshot).length === 0) {
    return `${slugLabel} abandoned${versionSuffix}`;
  }

  if (assessmentSlug === "typing") {
    const completedRuns = Array.isArray(snapshot.completedRuns)
      ? snapshot.completedRuns
      : [];
    const completedIndexes = Array.isArray(snapshot.completedRunIndexes)
      ? snapshot.completedRunIndexes
      : completedRuns.map((run: { runIndex?: number }) => run.runIndex).filter(Boolean);
    const currentRunIndex =
      typeof snapshot.currentRunIndex === "number" ? snapshot.currentRunIndex : null;

    if (completedIndexes.length > 0 && currentRunIndex !== null) {
      return `${slugLabel}: completed runs ${completedIndexes.join(", ")} · interrupted on run ${currentRunIndex + 1}${versionSuffix}`;
    }
  }

  if (assessmentSlug === "situational-judgement") {
    const scenarioIndex =
      typeof snapshot.scenarioIndex === "number" ? snapshot.scenarioIndex + 1 : null;
    const responses = Array.isArray(snapshot.responses) ? snapshot.responses.length : 0;
    if (scenarioIndex !== null) {
      return `${slugLabel}: scenario ${scenarioIndex} · ${responses} responses saved${versionSuffix}`;
    }
  }

  if (assessmentSlug === "prioritisation") {
    const finalIndex = typeof snapshot.finalIndex === "number" ? snapshot.finalIndex + 1 : null;
    const roundCount = typeof snapshot.roundCount === "number" ? snapshot.roundCount : null;
    if (finalIndex !== null) {
      return `${slugLabel}: round ${finalIndex}${roundCount ? `/${roundCount}` : ""}${versionSuffix}`;
    }
  }

  if (assessmentSlug === "call-simulation") {
    const runIndex = typeof snapshot.currentRunIndex === "number" ? snapshot.currentRunIndex + 1 : null;
    if (runIndex !== null) {
      return `${slugLabel}: call ${runIndex}${versionSuffix}`;
    }
  }

  const timedNote = TIMED_ASSESSMENT_SLUGS.has(assessmentSlug)
    ? " · restart required"
    : "";

  return `${slugLabel} abandoned${timedNote}${versionSuffix}`;
}

export function buildAssessmentRecoveryTicket(input: {
  candidateName: string;
  candidateEmail?: string | null;
  candidateSessionDocumentId: string;
  assessmentSlug: string;
  assessmentLabel?: string;
  campaignName?: string | null;
  snapshot?: Record<string, unknown> | null;
  contentVersion?: string | null;
  abandonReason?: string | null;
  abandonedAt?: string | null;
}) {
  const assessmentLabel = input.assessmentLabel ?? formatAssessmentSlugLabel(input.assessmentSlug);
  const summary = formatAbandonSnapshotSummary(
    input.assessmentSlug,
    input.snapshot,
    input.contentVersion
  );

  const subject = `Assessment recovery request — ${input.candidateName} · ${assessmentLabel}`;

  const description = [
    "A candidate assessment was abandoned and may need admin recovery.",
    "",
    `Candidate: ${input.candidateName}${input.candidateEmail ? ` (${input.candidateEmail})` : ""}`,
    `Campaign: ${input.campaignName ?? "Unknown"}`,
    `Assessment: ${assessmentLabel}`,
    `Session ID: ${input.candidateSessionDocumentId}`,
    `Summary: ${summary}`,
    input.abandonReason ? `Reason: ${input.abandonReason.replace(/_/g, " ")}` : null,
    input.abandonedAt ? `Abandoned at: ${new Date(input.abandonedAt).toLocaleString("en-GB")}` : null,
    "",
    "Please review the snapshot and unlock the assessment if the request is genuine.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    description,
    category: "assessment_issue" as const,
    priority: "high" as const,
    metadata: {
      type: "assessment_recovery",
      candidateSessionDocumentId: input.candidateSessionDocumentId,
      assessmentSlug: input.assessmentSlug,
      snapshotSummary: summary,
    },
  };
}
