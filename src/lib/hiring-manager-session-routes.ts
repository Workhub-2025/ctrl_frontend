/** BFF paths for HM assessment-session (container) and candidate-session actions. */

export function getHmAssessmentSessionCloseBffPath(assessmentSessionId: string) {
  return `/api/hiring-manager/sessions/${encodeURIComponent(assessmentSessionId)}/status`;
}

export function getHmAssessmentSessionCloseStrapiPath(assessmentSessionId: string) {
  return `/hiring-manager/assessment-sessions/${encodeURIComponent(assessmentSessionId)}/close`;
}

export function getHmCandidateSessionResendBffPath(candidateSessionId: string) {
  return `/api/hiring-manager/candidate-sessions/${encodeURIComponent(candidateSessionId)}/resend`;
}

export function getHmCandidateSessionResendStrapiPath(candidateSessionId: string) {
  return `/candidate-sessions/${encodeURIComponent(candidateSessionId)}/resend`;
}
