import { isCandidateAssessmentSubmitted } from "@/lib/candidate/assessment-progress";
import type { CandidatePortalApplication } from "@/services/candidate-session.service";

function deliveryMode(application: CandidatePortalApplication): string {
  return (application.mode ?? "").trim().toLowerCase();
}

function sessionStatus(application: CandidatePortalApplication): string {
  return (
    application.assessmentSession?.sessionStatus ??
    application.sessionStatus ??
    ""
  )
    .trim()
    .toLowerCase();
}

/**
 * Every assessment in the in-person stack has been submitted (or scored).
 * That is the 2FA pause gate — not the HM closing the session.
 */
export function isInPersonSessionFullySubmitted(
  application: CandidatePortalApplication,
): boolean {
  const assessments = application.assessments ?? [];
  if (assessments.length > 0) {
    return assessments.every((assessment) =>
      isCandidateAssessmentSubmitted(assessment.status),
    );
  }

  const total = application.completion?.total ?? 0;
  const submitted = application.completion?.completed ?? 0;
  if (total > 0) {
    return submitted >= total;
  }

  return (
    Boolean(application.completedAt) ||
    (application.portalStatus ?? "").toLowerCase() === "completed"
  );
}

/**
 * 2FA is paused while an in-person candidate still has unsubmitted work
 * in that session. Pause ends when every given task is fully submitted.
 * Cancelled sessions cannot be finished, so they also end the pause.
 */
export function isInPersonTwoFactorPaused(
  applications: readonly CandidatePortalApplication[],
): boolean {
  return applications.some((application) => {
    if (deliveryMode(application) !== "in_person") return false;
    if (sessionStatus(application) === "cancelled") return false;
    return !isInPersonSessionFullySubmitted(application);
  });
}
