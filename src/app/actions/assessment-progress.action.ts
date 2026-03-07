
/**
 * Server Actions for Assessment Progress using AssessmentProgressService
 * Follows the fetchApi -> service -> server action pattern used elsewhere
 */

'use server';

import { AssessmentProgressService } from '@/services/assessment-progress.service';
import AssessmentProgressSchema, {
    AssessmentProgress,
} from '@/types/assessments-progress.types';

// Result type for consistent server action returns
type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Save assessment progress (auto-save / background)
 */
export const saveAssessmentProgressAction = async (
    progress: AssessmentProgress
): Promise<ActionResult<boolean>> => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('[saveAssessmentProgressAction] Saving progress:', progress);
        }

        // Optionally validate incoming shape server-side with Zod
        try {
            AssessmentProgressSchema.parse(progress);
        } catch (zErr: any) {
            console.error('[saveAssessmentProgressAction] Validation failed:', zErr);
            return { success: false, error: 'Invalid progress payload' };
        }

        await AssessmentProgressService.saveProgress(progress);

        return { success: true, data: true };
    } catch (error: any) {
        console.error('[saveAssessmentProgressAction] Unexpected error:', error);
        return { success: false, error: error.message || 'Failed to save progress' };
    }
};

/**
 * Resume assessment progress for a given test type
 */
export const resumeAssessmentProgressAction = async (
    testType: AssessmentProgress['testType']
): Promise<ActionResult<AssessmentProgress | null>> => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('[resumeAssessmentProgressAction] Resuming progress for:', testType);
        }

        const progress = await AssessmentProgressService.resumeProgress(testType as any);

        if (!progress) {
            return { success: true, data: null };
        }

        return { success: true, data: progress };
    } catch (error: any) {
        console.error('[resumeAssessmentProgressAction] Unexpected error:', error);
        return { success: false, error: error.message || 'Failed to resume progress' };
    }
};

/**
 * Clear persisted assessment progress for a test type
 */
export const clearAssessmentProgressAction = async (
    testType: AssessmentProgress['testType']
): Promise<ActionResult<boolean>> => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('[clearAssessmentProgressAction] Clearing progress for:', testType);
        }

        await AssessmentProgressService.clearProgress(testType as any);

        return { success: true, data: true };
    } catch (error: any) {
        console.error('[clearAssessmentProgressAction] Unexpected error:', error);
        return { success: false, error: error.message || 'Failed to clear progress' };
    }
};

