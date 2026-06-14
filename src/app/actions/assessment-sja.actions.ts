'use server';

import { getActionAuthContext } from '@/lib/auth/server-action-auth';
import { getServerStrapiClient } from '@/lib/strapi';

export type SjaRun = {
    id: string;
    title: string;
    scenario: string;
    prompt: string;
    options: Array<{ id: string; text: string }>;
};

export type SjaSessionData = {
    sessionId: string | null;
    assessmentId: string | null;
    runs: SjaRun[];
    config?: {
        questionCount: number;
        version?: string;
        difficulty?: string;
    };
};

const FALLBACK_SESSION: SjaSessionData = {
    sessionId: null,
    assessmentId: null,
    runs: [],
};

export async function initSjaSession(candidateSessionDocumentId?: string | null): Promise<SjaSessionData> {
    await getActionAuthContext('initSjaSession');

    try {
        const client = await getServerStrapiClient();

        const response = await client.fetch('/assessment/situational-judgement/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateSessionDocumentId }),
        });

        if (!response.ok) {
            console.error(`[initSjaSession] Strapi responded ${response.status} — using fallback`);
            return FALLBACK_SESSION;
        }

        const body = await response.json() as SjaSessionData;
        return body;
    } catch (err) {
        console.error('[initSjaSession] Network error — using fallback', err);
        return FALLBACK_SESSION;
    }
}
