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

  let response;
  try {
    const client = await getServerStrapiClient();
    response = await client.fetch('/assessment/typing/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateSessionDocumentId }),
    });
  } catch (err) {
    console.error('[initTypingSession] Network error — using fallback', err);
    return FALLBACK_SESSION;
  }

  if (!response.ok) {
    console.error(`[initTypingSession] Strapi responded ${response.status}`);
    let errorMessage = 'Failed to load assessment';
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  try {
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
    console.error('[initTypingSession] Response parsing error — using fallback', err);
    return FALLBACK_SESSION;
  }
}
