import type { AssessmentSubmitHandler } from "./types";

type IncidentForm = Record<string, string | undefined>;

type CallSnapshot = {
  runIndex: number;
  scenarioKey?: string;
  form: IncidentForm;
  timestamps?: Record<string, number>;
  history?: Array<{ timestamp: number; field: string; value: string }>;
};

export type CallSimulationSubmitPayload = {
  snapshots: CallSnapshot[];
  startedAt: string;
  completedAt: string;
  candidateSessionDocumentId?: string | null;
  isBypass?: boolean;
  assessmentVersion?: string;
  difficulty?: string;
};

export const callSimulationSubmitHandler: AssessmentSubmitHandler<CallSimulationSubmitPayload> = {
  traceAction: "callSimulationSubmit.post",
  validate(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Request body must be a JSON object" };
    }

    const value = body as Record<string, unknown>;
    const isBypass = !!value.isBypass;

    if (!isBypass && (!Array.isArray(value.snapshots) || value.snapshots.length === 0)) {
      return { valid: false, error: "snapshots must contain at least one call" };
    }

    if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
      return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

    return {
      valid: true,
      data: {
        snapshots: (value.snapshots ?? []) as CallSnapshot[],
        startedAt: value.startedAt,
        completedAt: value.completedAt,
        candidateSessionDocumentId:
          typeof value.candidateSessionDocumentId === "string"
            ? value.candidateSessionDocumentId
            : null,
        isBypass,
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
        assessmentType: "call-simulation",
        assessmentVersion: data.assessmentVersion,
        difficulty: data.difficulty,
        snapshots: data.snapshots,
        calls: data.snapshots,
        isBypass: data.isBypass,
      },
    };
  },
  strapiResultsPath: "/assessment/call-simulation/results",
};
