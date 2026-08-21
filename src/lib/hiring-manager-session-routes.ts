/** BFF paths for HM assessment-session (container) and candidate-session actions. */

export function getHmAssessmentSessionCloseBffPath(assessmentSessionId: string) {
  return `/api/hiring-manager/sessions/${encodeURIComponent(assessmentSessionId)}/status`;
}

export function getHmCandidateSessionResendBffPath(candidateSessionId: string) {
  return `/api/hiring-manager/candidate-sessions/${encodeURIComponent(candidateSessionId)}/resend`;
}
