export type RestoredAssessmentProgress<TState> = {
  stageIndex: number;
  state: TState;
};

const TIMER_ANNOUNCEMENT_THRESHOLDS = [
  30 * 60,
  15 * 60,
  10 * 60,
  5 * 60,
  2 * 60,
  60,
  30,
  10,
  0,
] as const;

function accessibleDuration(seconds: number) {
  if (seconds === 0) return "Time has expired.";
  if (seconds < 60) return `${seconds} seconds remaining.`;

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"} remaining.`;
}

/**
 * Returns a concise timer announcement only when a meaningful threshold is
 * crossed. The visible timer can update every second without flooding a screen
 * reader's polite live-region queue.
 */
export function assessmentTimerAnnouncement(
  previousSeconds: number | null,
  currentSeconds: number,
) {
  if (previousSeconds === null) return accessibleDuration(currentSeconds);

  const threshold = TIMER_ANNOUNCEMENT_THRESHOLDS.find(
    (value) => previousSeconds > value && currentSeconds <= value,
  );
  return threshold === undefined ? null : accessibleDuration(threshold);
}

/**
 * Progress data crosses a persistence boundary, so treat it as untrusted even
 * when it came from the assessment API. Invalid or stale payloads fall back to
 * the beginning instead of placing the candidate on an impossible stage.
 */
export function restoreAssessmentProgress<TState>(
  progressData: unknown,
  fallbackState: TState,
  stageCount: number,
): RestoredAssessmentProgress<TState> {
  if (
    !progressData ||
    typeof progressData !== "object" ||
    Array.isArray(progressData)
  ) {
    return { stageIndex: 0, state: fallbackState };
  }

  const candidate = progressData as Record<string, unknown>;
  const stageIndex = candidate.stageIndex;
  const state = candidate.state;
  // The final graph node is completion-only and is reached after a successful
  // submission, never through saved in-progress state.
  const restorableStageCount = Math.max(1, stageCount - 1);
  const validStageIndex =
    typeof stageIndex === "number" &&
    Number.isInteger(stageIndex) &&
    stageIndex >= 0 &&
    stageIndex < restorableStageCount;
  const validState =
    state !== null && typeof state === "object" && !Array.isArray(state);

  if (!validStageIndex || !validState) {
    return { stageIndex: 0, state: fallbackState };
  }

  return { stageIndex, state: state as TState };
}
