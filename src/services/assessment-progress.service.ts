/**
 * Assessment Progress Service
 * @deprecated Progress is stored on CandidateAssessmentAttempt. Keep this
 * compatibility wrapper until legacy server actions are removed.
 */

import { AssessmentAttemptService } from '@/services/assessment-attempt.service';
import { AssessmentProgress } from '@/types/assessments-progress.types';

export class AssessmentProgressService {
    /**
     * Save assessment progress
     */
    static async saveProgress(
        progress: AssessmentProgress,
        sessionId?: string | null,
        candidateSessionDocumentId?: string | null
    ): Promise<void> {
        void sessionId;
        try {
            if (!candidateSessionDocumentId) return;
            await AssessmentAttemptService.saveProgress({
                candidateSessionDocumentId,
                assessmentSlug: (progress as any).testType,
                progressData: progress as unknown as Record<string, unknown>,
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
        testType: T['testType'],
        candidateSessionDocumentId?: string | null
    ): Promise<T | null> {
        try {
            if (!candidateSessionDocumentId) return null;
            return AssessmentAttemptService.resumeProgress<T>(candidateSessionDocumentId, testType);
        } catch (error) {
            console.error('Error resuming assessment progress:', error);
            return null;
        }
    }

    /**
     * Clear assessment progress (after completion)
     */
    static async clearProgress(
        testType: AssessmentProgress['testType'],
        candidateSessionDocumentId?: string | null
    ): Promise<void> {
        try {
            if (!candidateSessionDocumentId) return;
            await AssessmentAttemptService.clearProgress(candidateSessionDocumentId, testType);
        } catch (error) {
            console.error('Error clearing assessment progress:', error);
        }
    }
}
