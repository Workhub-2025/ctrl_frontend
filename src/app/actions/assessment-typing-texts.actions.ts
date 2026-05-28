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

/**
 * Initialises a typing test session for the authenticated candidate.
 *
 * Calls POST /api/assessment/typing/session on Strapi using the candidate's
 * own JWT so that the assessment-progress record is owned by the correct user.
 * The backend selects texts randomly from the configured pool and persists the
 * selection — reloading the page returns the same texts (idempotent).
 *
 * Falls back to FALLBACK_SESSION if Strapi is unreachable; the TypingTest
 * component has its own static text fallback for that case.
 */
export async function initTypingSession(): Promise<TypingSessionData> {
    await getActionAuthContext('initTypingSession');

    try {
        // Use the candidate's JWT so assessment-progress is linked to the correct user.
        const client = await getServerStrapiClient();

        const response = await client.fetch('/assessment/typing/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            console.error(
                `[initTypingSession] Strapi responded ${response.status} — using fallback`
            );
            return FALLBACK_SESSION;
        }

        const body = await response.json() as {
            sessionId: string;
            assessmentId: string;
            runs: TypingRun[];
            config: TypingConfig;
        };

        if (!body.sessionId || !Array.isArray(body.runs) || !body.config) {
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
            },
        };
    } catch (err) {
        console.error('[initTypingSession] Network error — using fallback', err);
        return FALLBACK_SESSION;
    }
}
