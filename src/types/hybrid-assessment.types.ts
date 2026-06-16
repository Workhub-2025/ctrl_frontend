import { z } from "zod";

export const AssessmentKindSchema = z.enum([
  "typing",
  "call-simulation",
  "situational-judgement",
]);

export const CompetencyKeySchema = z.enum([
  "decision_consistency",
  "pressure_performance",
  "signal_over_noise",
  "communication_clarity",
  "operational_accuracy",
]);

export const EvidenceItemSchema = z.object({
  id: z.string(),
  source: AssessmentKindSchema,
  competency: CompetencyKeySchema,
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  metrics: z.record(z.number()).default({}),
});

export const AssessmentOutcomeSchema = z.object({
  source: AssessmentKindSchema,
  completedAt: z.string(),
  evidence: z.array(EvidenceItemSchema).min(1),
  metadata: z.record(z.string()).default({}),
});

export const HybridCompetencyScoreSchema = z.object({
  competency: CompetencyKeySchema,
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative(),
});

export const HybridAssessmentSummarySchema = z.object({
  overallScore: z.number().min(0).max(100),
  readinessBand: z.enum(["developing", "ready", "highly_ready"]),
  competencies: z.array(HybridCompetencyScoreSchema),
  outcomes: z.array(AssessmentOutcomeSchema),
  generatedAt: z.string(),
});

export type AssessmentKind = z.infer<typeof AssessmentKindSchema>;
export type CompetencyKey = z.infer<typeof CompetencyKeySchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type AssessmentOutcome = z.infer<typeof AssessmentOutcomeSchema>;
export type HybridCompetencyScore = z.infer<typeof HybridCompetencyScoreSchema>;
export type HybridAssessmentSummary = z.infer<typeof HybridAssessmentSummarySchema>;
