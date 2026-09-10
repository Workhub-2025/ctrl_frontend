import { z } from "zod";

export const REPORT_VERSION = "2.0.0";
const number = z.number().finite();
const metric = number.nullable().optional();
const records = z.array(z.record(z.string(), z.unknown())).optional();
export const reportInsightSchema = z.object({
  id: z.string(), kind: z.enum(["strength", "explore"]), title: z.string(),
  evidence: z.string(), question: z.string().optional()
});
const common = z.object({
  reportVersion: z.string(), overallScore: metric, configuredThreshold: metric,
  meetsConfiguredStandard: z.boolean().optional(), criticalFlagCount: metric,
  evidenceLabel: z.string().optional(), competencyScores: records, criticalFlags: records,
  scenarioEvidence: records, insights: z.array(reportInsightSchema).optional()
});
export const reportMetricSchemas = {
  typing: common.extend({ wpm: metric, accuracy: metric, speedScore: metric, accuracyScore: metric,
    stabilityScore: metric, speedConsistencyScore: metric, errorDistributionScore: metric,
    correctionBehaviourScore: metric, totalErrors: metric, correctedErrors: metric, correctionRatio: metric,
    averageMistakes: metric, passageEvidence: records, windowSeries: records, ratingBand: z.string().optional(),
    expectedRoundCount: metric, answeredRoundCount: metric }),
  "situational-judgement": common.extend({ decisionBand: z.string().optional(), decisionRationale: z.array(z.string()).optional(),
    competencyFloors: z.record(z.string(), number).optional(), scenarioScores: records,
    competencyBelowFloorCount: metric, materialRiskFlagCount: metric, moderateRiskFlagCount: metric, minorRiskFlagCount: metric,
    expectedQuestionCount: metric, answeredQuestionCount: metric }),
  prioritisation: common.extend({ bandAccuracy: z.object({high: metric, medium: metric, low: metric}).optional(),
    highPriorityAccuracy: metric, mediumPriorityAccuracy: metric, lowPriorityAccuracy: metric,
    criticalMisprioritisationCount: metric, highPlacedLowCount: metric, lowPlacedHighCount: metric,
    questionScores: records, lowestPerformingQuestions: records, rawPoints: metric, maximumPoints: metric,
    averageQuestionScore: metric, completionTimeSeconds: metric, outcome: z.string().optional(), outcomeBand: z.string().optional(),
    expectedQuestionCount: metric, answeredQuestionCount: metric }),
  "short-term-memory": common.extend({ factRecallAccuracy: metric, criticalFactAccuracy: metric,
    recalledFieldCount: metric, recallFieldCount: metric, sequenceScore: metric, correctionScore: metric,
    interruptionScore: metric, distractionAccuracy: metric, timelinessScore: metric, missedCriticalFacts: z.array(z.string()).optional() }),
  "call-simulation": common.extend({ timingBands: z.object({green: number, amber: number, red: number}).optional(),
    totalEarnedScore: metric, maxScore: metric, criticalErrorsCount: metric, passed: z.boolean().optional(),
    scoringStatus: z.string().optional(), expectedRoundCount: metric, answeredRoundCount: metric })
};
export type AssessmentReportMetrics = { [K in keyof typeof reportMetricSchemas]: z.infer<(typeof reportMetricSchemas)[K]> };
export function parseReportMetrics(slug: string, value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || (value as Record<string, unknown>).reportVersion !== REPORT_VERSION) return null;
  const schema = reportMetricSchemas[slug as keyof typeof reportMetricSchemas];
  const parsed = schema?.safeParse(value);
  return parsed?.success ? parsed.data : null;
}
export const reportEvidenceSchema = z.object({
  reportVersion: z.literal(REPORT_VERSION), campaignAssessmentId: z.string(), attemptId: z.string().nullable(),
  resultId: z.string().nullable(), revision: number.nullable(), releaseId: z.string().nullable(), releaseVersion: z.string().nullable(), releaseHash: z.string().nullable(),
  availability: z.enum(["available", "unavailable", "pending"]),
  sections: z.array(z.object({ id: z.string(), title: z.string(), context: z.string().optional(),
    rows: z.array(z.object({ id: z.string(), label: z.string(), response: z.string(), context: z.string().optional(),
      score: number.nullable(), maximum: number.nullable() })) }))
});
export type AssessmentReportEvidence = z.infer<typeof reportEvidenceSchema>;

export const assessmentReportRowSchema = z.object({
  attemptId: z.string(), campaignAssessmentId: z.string(), assessmentSlug: z.string(), releaseVersion: z.string(),
  releaseId: z.string().optional(), releaseHash: z.string().optional(), reportVersion: z.string().optional(),
  evidenceAvailability: z.enum(["available", "unavailable", "pending"]).optional(), status: z.string(),
  resultId: z.string().nullable(), revision: number.nullable(), overallScore: number.nullable(),
  meetsConfiguredStandard: z.boolean().nullable(), criticalFlagCount: number.nullable(), configuredThreshold: number,
  submittedAt: z.string().nullable(), completedAt: z.string().nullable(), competencyScores: records, criticalFlags: records,
  scenarioEvidence: records, reportMetrics: z.record(z.string(), z.unknown()).optional(),
  integrityEventCount: number, integrityScore: number.nullable(), scoringStalled: z.boolean()
});
