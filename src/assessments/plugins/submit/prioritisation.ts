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
};

export const prioritisationSubmitHandler: AssessmentSubmitHandler<PrioritisationSubmitPayload> = {
  traceAction: "prioritisationSubmit.post",
  validate(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Request body must be a JSON object" };
    }

    const value = body as Record<string, unknown>;
    if (!Array.isArray(value.rounds) || value.rounds.length !== 15) {
      return { valid: false, error: "rounds must contain 15 live rankings" };
    }

    for (const round of value.rounds) {
      if (!round || typeof round !== "object") {
        return { valid: false, error: "Each round must be an object" };
      }
      const item = round as Record<string, unknown>;
      if (
        typeof item.roundId !== "string" ||
        !Array.isArray(item.order) ||
        item.order.length !== 6
      ) {
        return {
          valid: false,
          error: "Each round must include roundId and 6 ranked incident IDs",
        };
      }
      if (new Set(item.order).size !== 6 || item.order.some((id) => typeof id !== "string")) {
        return { valid: false, error: "Each ranking must contain 6 unique incident IDs" };
      }
    }

    if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
      return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

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
      },
    };
  },
  strapiResultsPath: "/assessment/prioritisation/results",
};
