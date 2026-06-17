'use server';

import { getActionAuthContext } from '@/lib/auth/server-action-auth';
import { getServerStrapiClient } from '@/lib/strapi';
import { DEFAULT_TYPING_CONFIG } from '@/store/typing-session.store';
import type { TypingRun, TypingConfig, TypingSessionData } from '@/store/typing-session.store';

const FALLBACK_SESSION: TypingSessionData = {
  sessionId: null,
  assessmentId: null,
  runs: [],
  config: DEFAULT_TYPING_CONFIG,
};

export async function initTypingSession(
  candidateSessionDocumentId?: string | null,
): Promise<TypingSessionData> {
  await getActionAuthContext('initTypingSession');

  try {
    const client = await getServerStrapiClient();
    const response = await client.fetch('/assessment/typing/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateSessionDocumentId }),
    });

    if (!response.ok) {
      console.error(`[initTypingSession] Strapi responded ${response.status} — using fallback`);
      return FALLBACK_SESSION;
    }

    const body = (await response.json()) as {
      sessionId: string | null;
      assessmentId: string;
      runs: TypingRun[];
      config: TypingConfig;
    };

    if (!Array.isArray(body.runs) || !body.config) {
      console.error('[initTypingSession] Unexpected response shape — using fallback', body);
      return FALLBACK_SESSION;
    }

    return {
      sessionId: body.sessionId,
      assessmentId: body.assessmentId ?? null,
      runs: body.runs,
      config: {
        ...body.config,
        difficulty: body.config.difficulty ?? DEFAULT_TYPING_CONFIG.difficulty,
        version: body.config.version ?? DEFAULT_TYPING_CONFIG.version,
      },
    };
  } catch (err) {
    console.error('[initTypingSession] Network error — using fallback', err);
    return FALLBACK_SESSION;
  }
}
