import type { AssessmentSubmitHandler } from "./types";

type SjtResponse = {
  scenarioId: string;
  bestOptionId: string;
  worstOptionId: string;
};

export type SjtSubmitPayload = {
  responses: SjtResponse[];
  startedAt: string;
  completedAt: string;
  candidateSessionDocumentId?: string | null;
  assessmentVersion?: string;
  difficulty?: string;
};

export const situationalJudgementSubmitHandler: AssessmentSubmitHandler<SjtSubmitPayload> = {
  traceAction: "sjtSubmit.post",
  validate(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Request body must be a JSON object" };
    }

    const value = body as Record<string, unknown>;
    if (!Array.isArray(value.responses) || value.responses.length !== 20) {
      return { valid: false, error: "responses must contain 20 scenario responses" };
    }

    for (const response of value.responses) {
      if (!response || typeof response !== "object") {
        return { valid: false, error: "Each response must be an object" };
      }
      const item = response as Record<string, unknown>;
      if (
        typeof item.scenarioId !== "string" ||
        typeof item.bestOptionId !== "string" ||
        typeof item.worstOptionId !== "string"
      ) {
        return {
          valid: false,
          error: "Each response must include scenarioId, bestOptionId and worstOptionId",
        };
      }
      if (item.bestOptionId === item.worstOptionId) {
        return { valid: false, error: "Best and worst selections must be different" };
      }
    }

    if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
      return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

    return {
      valid: true,
      data: {
        responses: value.responses as SjtResponse[],
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
        assessmentType: "situational-judgement",
        assessmentVersion: data.assessmentVersion,
        difficulty: data.difficulty,
        responses: data.responses,
      },
    };
  },
  strapiResultsPath: "/assessment/situational-judgement/results",
};
