/**
 * Front-end mirror of the BackEnd assessment catalogue seed values.
 *
 * Single source of truth for fallback config used when Strapi is unavailable
 * or session init fails. Keep aligned with:
 *   BackEnd/ctrl_backend/src/api/assessment/plugins/register-all.ts (buildCatalogueSeed)
 *   BackEnd/ctrl_backend/src/components/assessment-config/*.json (runtime settings)
 *   BackEnd/ctrl_backend/src/api/assessment/services/typing-scoring.ts (thresholds)
 *
 * Operators: see CTRL/05-Operations/Assessment-Content-Guide.md
 */
import type { PlatformAssessmentSlug } from "@/lib/assessment-slug";

export const TYPING_WPM_THRESHOLD = 32;
export const TYPING_ACCURACY_THRESHOLD = 90;
export const TYPING_TIME_LIMIT_PER_ROUND_SECONDS = 60;
export const TYPING_ROUND_COUNT = 3;

export const SJT_QUESTION_COUNT = 20;
export const PJA_ROUND_COUNT = 15;
export const PJA_INCIDENTS_PER_ROUND = 6;
export const CALL_SIMULATION_CALL_COUNT = 2;
export const CALL_SIMULATION_REVIEW_SECONDS = 60;
export const STM_INFORMATION_SECONDS = 45;
export const STM_DISTRACTION_SECONDS = 45;
export const STM_RECALL_SECONDS = 180;
export const STM_TIME_LIMIT_SECONDS =
  STM_INFORMATION_SECONDS + STM_DISTRACTION_SECONDS + STM_RECALL_SECONDS + 30;

/** Standard live-assessment time limit shared by SJT and prioritisation. */
export const STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS = 20 * 60;

export const TYPING_TIME_LIMIT_SECONDS =
  TYPING_ROUND_COUNT * TYPING_TIME_LIMIT_PER_ROUND_SECONDS;

export type AssessmentCatalogueDefault = {
  passingScore: number;
  /** Whole-assessment time limit in seconds, when one applies. */
  timeLimitSeconds: number | null;
  /** Range string surfaced on candidate/HM cards, e.g. "20-25". */
  estimatedCompletionTime: string;
};

export const ASSESSMENT_CATALOGUE_DEFAULTS: Record<
  PlatformAssessmentSlug,
  AssessmentCatalogueDefault
> = {
  typing: {
    passingScore: 70,
    timeLimitSeconds: TYPING_TIME_LIMIT_SECONDS,
    estimatedCompletionTime: "5-10",
  },
  "situational-judgement": {
    passingScore: 70,
    timeLimitSeconds: STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS,
    estimatedCompletionTime: "20-30",
  },
  prioritisation: {
    passingScore: 65,
    timeLimitSeconds: STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS,
    estimatedCompletionTime: "20-25",
  },
  "call-simulation": {
    passingScore: 70,
    timeLimitSeconds: null,
    estimatedCompletionTime: "20-25",
  },
  "short-term-memory": {
    passingScore: 70,
    timeLimitSeconds: STM_TIME_LIMIT_SECONDS,
    estimatedCompletionTime: "5-8",
  },
};

/** Formats an estimated-completion range ("20-25") into a card label ("20-25 min"). */
export function formatEstimatedCompletion(slug: PlatformAssessmentSlug): string {
  return `${ASSESSMENT_CATALOGUE_DEFAULTS[slug].estimatedCompletionTime} min`;
}

/**
 * Candidate-card duration label. Assessments with a whole-assessment time limit
 * surface that limit (e.g. "20 min"); others show the estimated completion range.
 */
export function getAssessmentCardDuration(slug: PlatformAssessmentSlug): string {
  const { timeLimitSeconds, estimatedCompletionTime } =
    ASSESSMENT_CATALOGUE_DEFAULTS[slug];
  if (slug === "situational-judgement" || slug === "prioritisation") {
    return `${Math.round((timeLimitSeconds ?? STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS) / 60)} min`;
  }
  if (slug === "short-term-memory") {
    return `${Math.round((timeLimitSeconds ?? STM_TIME_LIMIT_SECONDS) / 60)} min`;
  }
  return `${estimatedCompletionTime} min`;
}

/** HM report fallback when Strapi omits typing `passed`. */
export function inferTypingPass(wpm: number, accuracy: number): boolean {
  return wpm >= TYPING_WPM_THRESHOLD && accuracy >= TYPING_ACCURACY_THRESHOLD;
}
