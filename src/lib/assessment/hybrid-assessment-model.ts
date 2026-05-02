import {
  AssessmentOutcome,
  CompetencyKey,
  EvidenceItem,
  HybridAssessmentSummary,
} from "@/types";

type TypingAttempt = { wpm: number; accuracy: number };
type CallEvaluation = { completeness: number };
type SituationalEvaluation = {
  mcqAnswered: number;
  totalMcq: number;
  textAnalysesCompleted: number;
  totalTextPrompts: number;
};

interface ScoreBand {
  min: number;
  max: number;
  score: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const avg = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const makeEvidence = (
  source: AssessmentOutcome["source"],
  competency: CompetencyKey,
  score: number,
  confidence: number,
  summary: string,
  metrics: Record<string, number> = {}
): EvidenceItem => ({
  id: `${source}:${competency}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
  source,
  competency,
  score: clamp(Math.round(score), 0, 100),
  confidence: clamp(Number(confidence.toFixed(2)), 0, 1),
  summary,
  metrics,
});

const scoreFromBands = (value: number, bands: ScoreBand[]) => {
  const matched = bands.find((band) => value >= band.min && value <= band.max);
  return matched?.score ?? 0;
};

const RUBRICS = {
  typing: {
    wpmBands: [
      { min: 0, max: 24, score: 30 },
      { min: 25, max: 34, score: 45 },
      { min: 35, max: 44, score: 60 },
      { min: 45, max: 54, score: 75 },
      { min: 55, max: 1000, score: 90 },
    ] satisfies ScoreBand[],
    accuracyBands: [
      { min: 0, max: 84, score: 35 },
      { min: 85, max: 89, score: 55 },
      { min: 90, max: 94, score: 70 },
      { min: 95, max: 97, score: 84 },
      { min: 98, max: 100, score: 95 },
    ] satisfies ScoreBand[],
  },
  call: {
    completenessBands: [
      { min: 0, max: 0.49, score: 35 },
      { min: 0.5, max: 0.69, score: 58 },
      { min: 0.7, max: 0.84, score: 74 },
      { min: 0.85, max: 1, score: 90 },
    ] satisfies ScoreBand[],
  },
  situational: {
    mcqCoverageBands: [
      { min: 0, max: 0.49, score: 35 },
      { min: 0.5, max: 0.74, score: 62 },
      { min: 0.75, max: 0.9, score: 80 },
      { min: 0.91, max: 1, score: 92 },
    ] satisfies ScoreBand[],
    textCoverageBands: [
      { min: 0, max: 0.49, score: 40 },
      { min: 0.5, max: 0.74, score: 66 },
      { min: 0.75, max: 0.9, score: 82 },
      { min: 0.91, max: 1, score: 94 },
    ] satisfies ScoreBand[],
  },
};

export const buildTypingOutcome = (
  attempts: TypingAttempt[]
): AssessmentOutcome | null => {
  if (attempts.length === 0) return null;

  const meanWpm = avg(attempts.map((a) => a.wpm));
  const meanAccuracy = avg(attempts.map((a) => a.accuracy));

  const speedScore = scoreFromBands(meanWpm, RUBRICS.typing.wpmBands);
  const accuracyScore = scoreFromBands(meanAccuracy, RUBRICS.typing.accuracyBands);
  const signalScore = clamp(Math.round(accuracyScore * 0.68 + speedScore * 0.32), 0, 100);

  return {
    source: "typing",
    completedAt: new Date().toISOString(),
    evidence: [
      makeEvidence(
        "typing",
        "operational_accuracy",
        accuracyScore,
        0.86,
        "Typing accuracy captured during timed scenario logging.",
        { meanAccuracy, attempts: attempts.length }
      ),
      makeEvidence(
        "typing",
        "pressure_performance",
        speedScore,
        0.78,
        "Typing speed measured under countdown pressure.",
        { meanWpm, attempts: attempts.length }
      ),
      makeEvidence(
        "typing",
        "signal_over_noise",
        signalScore,
        0.7,
        "Consistent signal extraction from text-entry performance.",
        { meanWpm, meanAccuracy }
      ),
    ],
    metadata: {
      attempts: String(attempts.length),
      model: "hybrid-v1",
    },
  };
};

export const buildCallSimulationOutcome = (
  evaluations: CallEvaluation[]
): AssessmentOutcome | null => {
  if (evaluations.length === 0) return null;

  const completeness = avg(evaluations.map((item) => item.completeness));
  const completenessScore = scoreFromBands(
    Number(completeness.toFixed(3)),
    RUBRICS.call.completenessBands
  );
  const decisionConsistencyScore = clamp(Math.round(completenessScore * 0.88), 0, 100);

  return {
    source: "call-simulation",
    completedAt: new Date().toISOString(),
    evidence: [
      makeEvidence(
        "call-simulation",
        "communication_clarity",
        completenessScore,
        0.8,
        "Incident logs evaluated for capture quality and information clarity.",
        { completeness: Number(completeness.toFixed(3)), calls: evaluations.length }
      ),
      makeEvidence(
        "call-simulation",
        "decision_consistency",
        decisionConsistencyScore,
        0.72,
        "Call handling consistency inferred from structured reporting completion.",
        { calls: evaluations.length }
      ),
    ],
    metadata: {
      calls: String(evaluations.length),
      model: "hybrid-v1",
    },
  };
};

export const buildSituationalOutcome = (
  evaluation: SituationalEvaluation
): AssessmentOutcome => {
  const mcqCoverage =
    evaluation.totalMcq > 0 ? evaluation.mcqAnswered / evaluation.totalMcq : 0;
  const textCoverage =
    evaluation.totalTextPrompts > 0
      ? evaluation.textAnalysesCompleted / evaluation.totalTextPrompts
      : 0;

  const mcqBandScore = scoreFromBands(mcqCoverage, RUBRICS.situational.mcqCoverageBands);
  const textBandScore = scoreFromBands(textCoverage, RUBRICS.situational.textCoverageBands);
  const decisionScore = clamp(Math.round(mcqBandScore * 0.72 + textBandScore * 0.28), 0, 100);
  const pressureScore = clamp(Math.round(textBandScore * 0.65 + mcqBandScore * 0.35), 0, 100);

  return {
    source: "situational-judgement",
    completedAt: new Date().toISOString(),
    evidence: [
      makeEvidence(
        "situational-judgement",
        "decision_consistency",
        decisionScore,
        0.84,
        "Decision quality inferred from scenario completion and structured reasoning coverage.",
        {
          mcqCoverage: Number(mcqCoverage.toFixed(3)),
          textCoverage: Number(textCoverage.toFixed(3)),
        }
      ),
      makeEvidence(
        "situational-judgement",
        "pressure_performance",
        pressureScore,
        0.76,
        "Pressure judgement signal derived from response completion under scenario constraints.",
        {
          mcqCoverage: Number(mcqCoverage.toFixed(3)),
          textCoverage: Number(textCoverage.toFixed(3)),
        }
      ),
    ],
    metadata: {
      mcqAnswered: String(evaluation.mcqAnswered),
      textAnalysesCompleted: String(evaluation.textAnalysesCompleted),
      model: "hybrid-v1",
    },
  };
};

const COMPETENCY_WEIGHTS: Record<CompetencyKey, number> = {
  decision_consistency: 0.27,
  pressure_performance: 0.24,
  signal_over_noise: 0.18,
  communication_clarity: 0.16,
  operational_accuracy: 0.15,
};

const readinessBandFor = (score: number): HybridAssessmentSummary["readinessBand"] => {
  if (score >= 75) return "highly_ready";
  if (score >= 55) return "ready";
  return "developing";
};

export const aggregateHybridAssessment = (
  outcomes: AssessmentOutcome[]
): HybridAssessmentSummary => {
  const competencies = (Object.keys(COMPETENCY_WEIGHTS) as CompetencyKey[]).map(
    (competency) => {
      const evidence = outcomes
        .flatMap((o) => o.evidence)
        .filter((item) => item.competency === competency);

      const weightedScoreDenominator = evidence.reduce(
        (sum, e) => sum + e.confidence,
        0
      );
      const score =
        weightedScoreDenominator > 0
          ? evidence.reduce((sum, e) => sum + e.score * e.confidence, 0) /
            weightedScoreDenominator
          : 0;
      const confidence =
        evidence.length > 0 ? avg(evidence.map((item) => item.confidence)) : 0;

      return {
        competency,
        score: clamp(Math.round(score), 0, 100),
        confidence: clamp(Number(confidence.toFixed(2)), 0, 1),
        evidenceCount: evidence.length,
      };
    }
  );

  const overallScore = clamp(
    Math.round(
      competencies.reduce(
        (sum, item) => sum + item.score * COMPETENCY_WEIGHTS[item.competency],
        0
      )
    ),
    0,
    100
  );

  return {
    overallScore,
    readinessBand: readinessBandFor(overallScore),
    competencies,
    outcomes,
    generatedAt: new Date().toISOString(),
  };
};
