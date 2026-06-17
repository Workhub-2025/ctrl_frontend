export type AssessmentCompletionStatus = "complete" | "timeout" | "partial";

/** Reads completion metadata from scored assessment result metrics or raw submit payload. */
export function isAssessmentTimedOut(
  source?: Record<string, unknown> | null,
): boolean {
  if (!source) return false;
  if (source.timedOut === true) return true;
  return source.completionStatus === "timeout";
}

export function resolveCompletionStatus(input: {
  timedOut: boolean;
  expectedCount: number;
  answeredCount: number;
}): AssessmentCompletionStatus {
  if (input.timedOut) return "timeout";
  if (input.answeredCount < input.expectedCount) return "partial";
  return "complete";
}

export function buildTimedAssessmentSubmitMeta(input: {
  timedOut: boolean;
  expectedCount: number;
  answeredCount: number;
}) {
  const completionStatus = resolveCompletionStatus(input);
  return {
    timedOut: input.timedOut,
    completionStatus,
    answeredCount: input.answeredCount,
  };
}

export function getAssessmentCompletionLabel(
  metrics?: Record<string, unknown> | null,
): string | null {
  if (!metrics) return null;
  if (isAssessmentTimedOut(metrics)) return "Timeout";
  if (metrics.completionStatus === "partial") return "Partial";
  return null;
}

/** Merge completion metadata into BackEnd scoring metrics from the submit rawData payload. */
export function appendCompletionMetrics(
  metrics: Record<string, unknown>,
  rawData: Record<string, unknown> | null | undefined,
  keys: { expected: string; answered: string },
): Record<string, unknown> {
  const timedOut =
    rawData?.timedOut === true || rawData?.completionStatus === "timeout";
  const expectedCount =
    typeof rawData?.questionCount === "number"
      ? rawData.questionCount
      : typeof rawData?.roundCount === "number"
        ? rawData.roundCount
        : null;
  const answeredCount =
    typeof rawData?.answeredCount === "number"
      ? rawData.answeredCount
      : typeof metrics[keys.answered] === "number"
        ? (metrics[keys.answered] as number)
        : null;

  const completionStatus: AssessmentCompletionStatus = timedOut
    ? "timeout"
    : expectedCount !== null &&
        answeredCount !== null &&
        answeredCount < expectedCount
      ? "partial"
      : "complete";

  return {
    ...metrics,
    timedOut,
    completionStatus,
    ...(expectedCount !== null ? { [keys.expected]: expectedCount } : {}),
    ...(answeredCount !== null ? { [keys.answered]: answeredCount } : {}),
  };
}
