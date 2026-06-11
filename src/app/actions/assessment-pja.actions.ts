'use server';

import { getActionAuthContext } from '@/lib/auth/server-action-auth';
import { getServerStrapiClient } from '@/lib/strapi';

export type PjaIncident = {
    id: string;
    letter: string;
    title: string;
    description: string;
    timeOfIncident: string;
};

export type PjaRound = {
    id: string;
    title: string;
    type?: 'practice' | 'test';
    incidents: PjaIncident[];
    hiddenPriorityBands: Record<string, 'High' | 'Medium' | 'Low'>;
    suggestedOrder?: string[];
};

export type PjaSessionData = {
    sessionId: string | null;
    assessmentId: string | null;
    runs: PjaRound[];
    config?: {
        roundCount: number;
        category: string;
    };
};

const FALLBACK_SESSION: PjaSessionData = {
    sessionId: null,
    assessmentId: null,
    runs: [],
};

export async function initPjaSession(candidateSessionDocumentId?: string | null): Promise<PjaSessionData> {
    await getActionAuthContext('initPjaSession');

    try {
        const client = await getServerStrapiClient();

        const response = await client.fetch('/assessment/prioritisation/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateSessionDocumentId }),
        });

        if (!response.ok) {
            console.error(`[initPjaSession] Strapi responded ${response.status} — using fallback`);
            return FALLBACK_SESSION;
        }

        const body = await response.json() as PjaSessionData;
        return body;
    } catch (err) {
        console.error('[initPjaSession] Network error — using fallback', err);
        return FALLBACK_SESSION;
    }
}
