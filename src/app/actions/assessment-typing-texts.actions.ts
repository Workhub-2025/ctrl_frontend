'use server';

import TextsService from '@/services/texts.service';
import { getActionAuthContext } from '@/lib/auth/server-action-auth';

export type TypingRun = {
    id: string;
    text: string;
};

/**
 * Fetches typing test runs from Strapi for the assessment.
 *
 * Accessible to any authenticated user (candidates, hiring managers, admins).
 * Returns practice runs first, then the scored test run, matching the
 * expected shape of the TypingTest component's `initialRuns` prop.
 *
 * Falls back to an empty array — the component has its own static fallback.
 */
export async function fetchAssessmentTypingRuns(): Promise<TypingRun[]> {
    await getActionAuthContext('fetchAssessmentTypingRuns');

    const [practiceResult, testResult] = await Promise.all([
        TextsService.getTexts({ type: 'practice', sort: 'createdAt:asc' }),
        TextsService.getTexts({ type: 'test', sort: 'createdAt:asc' }),
    ]);

    const practiceRuns: TypingRun[] = (practiceResult?.data ?? [])
        .filter((item) => item.documentId && item.text)
        .map((item) => ({
            id: item.documentId as string,
            text: item.text as string,
        }));

    const testRuns: TypingRun[] = (testResult?.data ?? [])
        .filter((item) => item.documentId && item.text)
        .map((item) => ({
            id: item.documentId as string,
            text: item.text as string,
        }));

    return [...practiceRuns, ...testRuns];
}
