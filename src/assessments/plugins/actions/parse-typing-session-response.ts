import { isAlreadyCompletedSession } from '@/lib/assessment-session-already-completed';
import {
  DEFAULT_TYPING_CONFIG,
  type TypingConfig,
  type TypingRun,
  type TypingSessionData,
} from '@/store/typing-session.store';

export const TYPING_SESSION_FALLBACK: TypingSessionData = {
  sessionId: null,
  assessmentId: null,
  runs: [],
  config: DEFAULT_TYPING_CONFIG,
};

type TypingSessionResponse = {
  sessionId: string | null;
  assessmentId: string;
  runs: TypingRun[];
  config: TypingConfig;
  alreadyCompleted?: boolean;
  completedAt?: string | null;
  score?: number | null;
};

/** Normalise Strapi typing session init payload — used by generic initAssessmentSession. */
export function parseTypingSessionResponse(body: unknown): TypingSessionData {
  const payload = body as TypingSessionResponse;

  if (isAlreadyCompletedSession(payload)) {
    return {
      sessionId: payload.sessionId ?? null,
      assessmentId: payload.assessmentId ?? null,
      runs: [],
      config: payload.config ?? DEFAULT_TYPING_CONFIG,
      alreadyCompleted: true,
      completedAt: payload.completedAt ?? null,
      score: payload.score ?? null,
    };
  }

  if (!Array.isArray(payload.runs) || !payload.config) {
    console.error('[parseTypingSessionResponse] Unexpected response shape — using fallback', body);
    return TYPING_SESSION_FALLBACK;
  }

  return {
    sessionId: payload.sessionId,
    assessmentId: payload.assessmentId ?? null,
    runs: payload.runs,
    config: {
      ...payload.config,
      difficulty: payload.config.difficulty ?? DEFAULT_TYPING_CONFIG.difficulty,
      version: payload.config.version ?? DEFAULT_TYPING_CONFIG.version,
    },
  };
}
