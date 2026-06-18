export const ASSESSMENT_COMPLETED_EVENT = "ctrl:assessment-completed";
const ASSESSMENT_COMPLETED_STORAGE_KEY = "ctrl:last-assessment-completed";

export function notifyAssessmentCompleted(assessmentType: string) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    assessmentType,
    completedAt: new Date().toISOString(),
  });

  try {
    window.localStorage.setItem(ASSESSMENT_COMPLETED_STORAGE_KEY, payload);
  } catch {
    // Storage may be unavailable in private browsing; custom event still works in-tab.
  }

  window.dispatchEvent(
    new CustomEvent(ASSESSMENT_COMPLETED_EVENT, {
      detail: { assessmentType },
    })
  );
}

export function listenForAssessmentCompletion(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onCompletion = () => callback();
  const onStorage = (event: StorageEvent) => {
    if (event.key === ASSESSMENT_COMPLETED_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(ASSESSMENT_COMPLETED_EVENT, onCompletion);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onCompletion);

  return () => {
    window.removeEventListener(ASSESSMENT_COMPLETED_EVENT, onCompletion);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onCompletion);
  };
}

export function getCandidateAssessmentsReturnPath(
  candidateSessionDocumentId?: string | null,
): string {
  if (!candidateSessionDocumentId) {
    return "/candidate-dashboard/my-assessments";
  }

  return `/candidate-dashboard/my-assessments?session=${encodeURIComponent(candidateSessionDocumentId)}`;
}

export function closeAssessmentWindow(
  candidateSessionDocumentId?: string | null,
) {
  if (typeof window === "undefined") return;

  const fallbackPath = getCandidateAssessmentsReturnPath(candidateSessionDocumentId);

  try {
    window.close();
  } catch {
    // Browser decides whether script may close the tab.
  }

  window.setTimeout(() => {
    if (!window.closed) {
      window.location.assign(fallbackPath);
    }
  }, 150);
}
