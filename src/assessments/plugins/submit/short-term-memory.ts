import type { AssessmentSubmitHandler } from "./types";

type StmRecallResponse = {
  questionId: string;
  value: string;
};

type StmDistractionResponse = {
  itemId: string;
  value: string;
};

type StmRoundSubmission = {
  roundId: string;
  distractionResponses: StmDistractionResponse[];
  recallResponses: StmRecallResponse[];
};

export type ShortTermMemorySubmitPayload = {
  assessmentVersion?: string;
  difficulty?: string;
  rounds: StmRoundSubmission[];
  startedAt: string;
  completedAt: string;
  candidateSessionDocumentId?: string | null;
  questionCount?: number;
  answeredCount?: number;
  timedOut?: boolean;
  completionStatus?: "complete" | "timeout" | "partial";
};

export const shortTermMemorySubmitHandler: AssessmentSubmitHandler<ShortTermMemorySubmitPayload> = {
  traceAction: "shortTermMemorySubmit.post",
  validate(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Request body must be a JSON object" };
    }

    const value = body as Record<string, unknown>;
    if (!Array.isArray(value.rounds) || value.rounds.length < 1) {
      return { valid: false, error: "rounds must contain at least one completed round" };
    }

    for (const round of value.rounds) {
      if (!round || typeof round !== "object") {
        return { valid: false, error: "Each round must be an object" };
      }
      const item = round as Record<string, unknown>;
      if (typeof item.roundId !== "string") {
        return { valid: false, error: "Each round must include roundId" };
      }
      if (!Array.isArray(item.recallResponses)) {
        return { valid: false, error: "Each round must include recallResponses" };
      }
    }

    if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
      return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

    const timedOut =
      value.timedOut === true || value.completionStatus === "timeout";
    const expectedCount =
      typeof value.questionCount === "number" ? value.questionCount : undefined;
    const answeredCount =
      typeof value.answeredCount === "number"
        ? value.answeredCount
        : (value.rounds as StmRoundSubmission[]).reduce(
            (sum, round) =>
              sum + round.recallResponses.filter((response) => response.value?.trim()).length,
            0,
          );
    const completionStatus =
      value.completionStatus === "timeout" ||
      value.completionStatus === "partial" ||
      value.completionStatus === "complete"
        ? value.completionStatus
        : timedOut
          ? "timeout"
          : expectedCount !== undefined && answeredCount < expectedCount
            ? "partial"
            : "complete";

    return {
      valid: true,
      data: {
        assessmentVersion:
          typeof value.assessmentVersion === "string" ? value.assessmentVersion : undefined,
        difficulty: typeof value.difficulty === "string" ? value.difficulty : undefined,
        rounds: value.rounds as StmRoundSubmission[],
        startedAt: value.startedAt,
        completedAt: value.completedAt,
        candidateSessionDocumentId:
          typeof value.candidateSessionDocumentId === "string"
            ? value.candidateSessionDocumentId
            : null,
        questionCount: expectedCount,
        answeredCount,
        timedOut: completionStatus === "timeout",
        completionStatus,
      },
    };
  },
  buildStrapiBody(data) {
    return {
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      candidateSessionDocumentId: data.candidateSessionDocumentId,
      rawData: {
        assessmentType: "short-term-memory",
        assessmentVersion: data.assessmentVersion,
        difficulty: data.difficulty,
        rounds: data.rounds,
        questionCount: data.questionCount,
        answeredCount: data.answeredCount,
        timedOut: data.timedOut,
        completionStatus: data.completionStatus,
      },
    };
  },
  strapiResultsPath: "/assessment/short-term-memory/results",
};
