import { getAssessmentPluginTitle } from "@/assessments/plugins/registry";
import { normalizeSlug } from "@/lib/assessment-slug";
import { formatAssessmentSlugLabel, TIMED_ASSESSMENT_SLUGS } from "@/lib/assessment-result-status";

function getAssessmentLabel(slug: string): string {
  return getAssessmentPluginTitle(slug) ?? formatAssessmentSlugLabel(slug);
}

export function formatAbandonSnapshotSummary(
  assessmentSlug: string,
  snapshot?: Record<string, unknown> | null,
  contentVersion?: string | null
): string {
  const canonicalSlug = normalizeSlug(assessmentSlug);
  const slugLabel = getAssessmentLabel(canonicalSlug);
  const versionSuffix = contentVersion ? ` · v${contentVersion}` : "";
  const recoveryPath =
    typeof snapshot?.recoveryContext === "object" &&
    snapshot.recoveryContext !== null &&
    "path" in snapshot.recoveryContext &&
    typeof snapshot.recoveryContext.path === "string"
      ? ` · ${snapshot.recoveryContext.path}`
      : "";

  if (!snapshot || Object.keys(snapshot).length === 0) {
    return `${slugLabel} abandoned${versionSuffix}`;
  }

  if (canonicalSlug === "typing") {
    const completedRuns = Array.isArray(snapshot.completedRuns)
      ? snapshot.completedRuns
      : [];
    const completedIndexes = Array.isArray(snapshot.completedRunIndexes)
      ? snapshot.completedRunIndexes
      : completedRuns.map((run: { runIndex?: number }) => run.runIndex).filter(Boolean);
    const currentRunIndex =
      typeof snapshot.currentRunIndex === "number" ? snapshot.currentRunIndex : null;

    if (completedIndexes.length > 0 && currentRunIndex !== null) {
      return `${slugLabel}: completed runs ${completedIndexes.join(", ")} · interrupted on run ${currentRunIndex + 1}${versionSuffix}${recoveryPath}`;
    }
  }

  if (canonicalSlug === "situational-judgement") {
    const scenarioIndex =
      typeof snapshot.scenarioIndex === "number" ? snapshot.scenarioIndex + 1 : null;
    const responses = Array.isArray(snapshot.responses) ? snapshot.responses.length : 0;
    if (scenarioIndex !== null) {
      return `${slugLabel}: scenario ${scenarioIndex} · ${responses} responses saved${versionSuffix}${recoveryPath}`;
    }
  }

  if (canonicalSlug === "prioritisation") {
    const finalIndex = typeof snapshot.finalIndex === "number" ? snapshot.finalIndex + 1 : null;
    const roundCount = typeof snapshot.roundCount === "number" ? snapshot.roundCount : null;
    if (finalIndex !== null) {
      return `${slugLabel}: round ${finalIndex}${roundCount ? `/${roundCount}` : ""}${versionSuffix}${recoveryPath}`;
    }
  }

  if (canonicalSlug === "call-simulation") {
    const runIndex = typeof snapshot.currentRunIndex === "number" ? snapshot.currentRunIndex + 1 : null;
    if (runIndex !== null) {
      return `${slugLabel}: call ${runIndex}${versionSuffix}${recoveryPath}`;
    }
  }

  const timedNote = TIMED_ASSESSMENT_SLUGS.has(canonicalSlug)
    ? " · restart required"
    : "";

  return `${slugLabel} abandoned${timedNote}${versionSuffix}${recoveryPath}`;
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
  const assessmentLabel =
    input.assessmentLabel ?? getAssessmentLabel(normalizeSlug(input.assessmentSlug));
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
