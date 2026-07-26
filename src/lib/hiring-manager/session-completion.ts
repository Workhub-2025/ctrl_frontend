type SessionCandidateResult = {
  id?: string;
  assessment?: string;
  assessmentStatus?: string | null;
  completedAt?: string | null;
  numericScore?: number | null;
};

type SessionCandidate = {
  results: SessionCandidateResult[];
};

export function getCandidateAssessmentProgress(
  candidate: SessionCandidate,
  expectedAssessmentCount?: number
) {
  const completed = new Set(
    candidate.results
      .filter((result) => {
        const status = result.assessmentStatus;
        if (status === "abandoned") return false;
        if (status === "submitted" || status === "scoring" || status === "completed") {
          return true;
        }
        return Boolean(result.completedAt || result.numericScore !== null);
      })
      .map((result) => result.id || result.assessment)
  ).size;
  const total = Math.max(expectedAssessmentCount || 0, candidate.results.length, completed, 1);
  return { completed, total };
}

export function areAllSessionCandidatesComplete(
  candidates: SessionCandidate[],
  expectedAssessmentCount?: number
) {
  if (candidates.length === 0) return false;

  return candidates.every((candidate) => {
    const progress = getCandidateAssessmentProgress(candidate, expectedAssessmentCount);
    return progress.completed >= progress.total;
  });
}
