'use server';

import { getActionAuthContext } from '@/lib/auth/server-action-auth';
import { getServerStrapiClient } from '@/lib/strapi';

export type CallSimulationRun = {
    id: string;
    title: string;
    kind: 'practice' | 'final';
    scenarioKey: string;
    audioSrc: string;
};

export type CallSimulationSessionData = {
    sessionId: string | null;
    assessmentId: string | null;
    runs: CallSimulationRun[];
    config?: {
        category: string;
        callCount: number;
    };
};

const FALLBACK_SESSION: CallSimulationSessionData = {
    sessionId: null,
    assessmentId: null,
    runs: [],
};

export async function initCallSimulationSession(candidateSessionDocumentId?: string | null): Promise<CallSimulationSessionData> {
    await getActionAuthContext('initCallSimulationSession');

    try {
        const client = await getServerStrapiClient();

        const response = await client.fetch('/assessment/call-simulation/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateSessionDocumentId }),
        });

        if (!response.ok) {
            console.error(`[initCallSimulationSession] Strapi responded ${response.status} — using fallback`);
            return FALLBACK_SESSION;
        }

        const body = await response.json() as CallSimulationSessionData;
        return body;
    } catch (err) {
        console.error('[initCallSimulationSession] Network error — using fallback', err);
        return FALLBACK_SESSION;
    }
}
