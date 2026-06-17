import { PJA_INCIDENTS_PER_ROUND } from "@/lib/assessment-catalog-defaults";
import type { AssessmentSubmitHandler } from "./types";

type PrioritisationRound = {
  roundId: string;
  order: string[];
};

export type PrioritisationSubmitPayload = {
  rounds: PrioritisationRound[];
  startedAt: string;
  completedAt: string;
  candidateSessionDocumentId?: string | null;
  assessmentVersion?: string;
  difficulty?: string;
  roundCount?: number;
  answeredCount?: number;
  timedOut?: boolean;
  completionStatus?: "complete" | "timeout" | "partial";
};

export const prioritisationSubmitHandler: AssessmentSubmitHandler<PrioritisationSubmitPayload> = {
  traceAction: "prioritisationSubmit.post",
  validate(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Request body must be a JSON object" };
    }

    const value = body as Record<string, unknown>;
    if (!Array.isArray(value.rounds) || value.rounds.length < 1) {
      return { valid: false, error: "rounds must contain at least one live ranking" };
    }

    const timedOut =
      value.timedOut === true || value.completionStatus === "timeout";
    const expectedCount =
      typeof value.roundCount === "number" ? value.roundCount : undefined;

    if (
      !timedOut &&
      expectedCount !== undefined &&
      value.rounds.length !== expectedCount
    ) {
      return {
        valid: false,
        error: `rounds must contain ${expectedCount} live rankings`,
      };
    }

    if (
      timedOut &&
      expectedCount !== undefined &&
      value.rounds.length > expectedCount
    ) {
      return {
        valid: false,
        error: `rounds cannot exceed ${expectedCount} live rankings`,
      };
    }

    for (const round of value.rounds) {
      if (!round || typeof round !== "object") {
        return { valid: false, error: "Each round must be an object" };
      }
      const item = round as Record<string, unknown>;
      if (
        typeof item.roundId !== "string" ||
        !Array.isArray(item.order) ||
        item.order.length !== PJA_INCIDENTS_PER_ROUND
      ) {
        return {
          valid: false,
          error: `Each round must include roundId and ${PJA_INCIDENTS_PER_ROUND} ranked incident IDs`,
        };
      }
      if (
        new Set(item.order).size !== PJA_INCIDENTS_PER_ROUND ||
        item.order.some((id) => typeof id !== "string")
      ) {
        return {
          valid: false,
          error: `Each ranking must contain ${PJA_INCIDENTS_PER_ROUND} unique incident IDs`,
        };
      }
    }

    if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
      return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

    const answeredCount =
      typeof value.answeredCount === "number" ? value.answeredCount : value.rounds.length;
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
        rounds: value.rounds as PrioritisationRound[],
        startedAt: value.startedAt,
        completedAt: value.completedAt,
        candidateSessionDocumentId:
          typeof value.candidateSessionDocumentId === "string"
            ? value.candidateSessionDocumentId
            : null,
        assessmentVersion:
          typeof value.assessmentVersion === "string" ? value.assessmentVersion : undefined,
        difficulty: typeof value.difficulty === "string" ? value.difficulty : undefined,
        roundCount: expectedCount,
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
        assessmentType: "prioritisation",
        assessmentVersion: data.assessmentVersion,
        difficulty: data.difficulty,
        rounds: data.rounds,
        roundCount: data.roundCount,
        answeredCount: data.answeredCount,
        timedOut: data.timedOut,
        completionStatus: data.completionStatus,
      },
    };
  },
  strapiResultsPath: "/assessment/prioritisation/results",
};
