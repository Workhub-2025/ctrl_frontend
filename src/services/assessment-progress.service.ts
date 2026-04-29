/**
 * Assessment Progress Service
 * Handles auto-save and resume functionality for assessment tests
 */

import { fetchClient } from '@/lib/fetch-client';
import { AssessmentProgress } from '@/types/assessments-progress.types';

export class AssessmentProgressService {
    private static readonly BASE_PATH = '/assessment-progress';

    /**
     * Save assessment progress
     */
    static async saveProgress(progress: AssessmentProgress): Promise<void> {
        try {
            // Strapi controller expects payload shape: { testType, progressData, status }
            await fetchClient(`${this.BASE_PATH}/save`, {
                method: 'POST',
                body: JSON.stringify({
                    assessmentSlug: (progress as any).testType,
                    progressData: progress,
                    status: (progress as any).status,
                }),
            });
        } catch (error) {
            // Log at debug level to avoid noisy error stacks for background auto-save failures
            console.debug('Error saving assessment progress (auto-save):', error);
            // Don't throw - auto-save should be non-blocking
        }
    }

    /**
     * Resume assessment progress
     */
    static async resumeProgress<T extends AssessmentProgress>(
        testType: T['testType']
    ): Promise<T | null> {
        try {
            const response = await fetchClient(
                `${this.BASE_PATH}/resume?assessmentSlug=${testType}`,
                {
                    method: 'GET',
                }
            );

            if (response.ok) {
                const data = await response.json();
                return data.data as T;
            }

            return null;
        } catch (error) {
            console.error('Error resuming assessment progress:', error);
            return null;
        }
    }

    /**
     * Clear assessment progress (after completion)
     */
    static async clearProgress(testType: AssessmentProgress['testType']): Promise<void> {
        try {
            await fetchClient(`${this.BASE_PATH}/clear?assessmentSlug=${testType}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error('Error clearing assessment progress:', error);
        }
    }
}
