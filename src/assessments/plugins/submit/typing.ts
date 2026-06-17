import type { AssessmentSubmitHandler } from "./types";

interface RunResult {
  runIndex: number;
  duration: number;
  typedCharacters: number;
  correctCharacters: number;
  mistakeCharacters: number;
  wpm: number;
  accuracy: number;
}

export type TypingSubmitPayload = {
  runs: RunResult[];
  startedAt: string;
  completedAt: string;
  candidateSessionDocumentId?: string | null;
  difficulty?: "Base" | "Intermediate" | "Extreme";
  assessmentVersion?: string;
};

export const typingSubmitHandler: AssessmentSubmitHandler<TypingSubmitPayload> = {
  traceAction: "typingSubmit.post",
  idempotentConflict: true,
  validate(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Request body must be a JSON object" };
    }

    const b = body as Record<string, unknown>;

    if (!Array.isArray(b.runs) || b.runs.length === 0) {
      return { valid: false, error: "runs must be a non-empty array" };
    }

    if (b.runs.length > 10) {
      return { valid: false, error: "runs array exceeds maximum allowed length" };
    }

    for (const run of b.runs as unknown[]) {
      if (
        typeof run !== "object" ||
        run === null ||
        typeof (run as Record<string, unknown>).runIndex !== "number" ||
        typeof (run as Record<string, unknown>).wpm !== "number" ||
        typeof (run as Record<string, unknown>).accuracy !== "number"
      ) {
        return {
          valid: false,
          error: "Each run must have numeric runIndex, wpm and accuracy fields",
        };
      }

      const { wpm, accuracy } = run as { wpm: number; accuracy: number };
      if (wpm < 0 || wpm > 300) {
        return { valid: false, error: `wpm value ${wpm} is out of valid range` };
      }
      if (accuracy < 0 || accuracy > 100) {
        return { valid: false, error: `accuracy value ${accuracy} is out of valid range` };
      }
    }

    if (typeof b.startedAt !== "string" || typeof b.completedAt !== "string") {
      return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

    return { valid: true, data: b as unknown as TypingSubmitPayload };
  },
  buildStrapiBody(data) {
    const assessmentRuns = data.runs.filter((r) => r.runIndex > 0);
    const practiceRuns = data.runs.filter((r) => r.runIndex === 0);

    return {
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      candidateSessionDocumentId: data.candidateSessionDocumentId,
      rawData: {
        assessmentType: "typing",
        difficulty: data.difficulty,
        assessmentVersion: data.assessmentVersion,
        rounds: assessmentRuns.map((r) => ({
          runIndex: r.runIndex,
          wpm: r.wpm,
          accuracy: r.accuracy,
          correctCharacters: r.correctCharacters,
          mistakeCharacters: r.mistakeCharacters,
          typedCharacters: r.typedCharacters,
          duration: r.duration,
        })),
        assessmentRuns,
        practiceRuns,
        averageMistakes: Math.round(
          assessmentRuns.reduce((sum, run) => sum + run.mistakeCharacters, 0) /
            Math.max(assessmentRuns.length, 1),
        ),
      },
    };
  },
  strapiResultsPath: "/assessment/typing/results",
};
