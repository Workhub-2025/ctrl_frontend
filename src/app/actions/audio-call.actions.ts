/**
 * Server Actions for Audio Calls using the AudioCallService
 * Following the fetchApi -> service -> server action pattern
 */

'use server';

import AudioCallService from '@/services/audio-call.service';
import { IAudioCall, AudioCallFileUpload, PaginatedResponse, UpdateAudioCallData, QueryParamsType } from '@/types';
import { requireAdminActionContext } from '@/lib/auth/server-action-auth';

// Result type for consistent server action returns
type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Get audio calls with pagination and filters
 */
export const getAudioCallsAction = async (params: QueryParamsType = {}): Promise<ActionResult<PaginatedResponse<IAudioCall>>> => {
    try {
        await requireAdminActionContext('getAudioCallsAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[getAudioCallsAction] Called with params:', params);
        }

        const audioCalls = await AudioCallService.getAudioCalls(params);

        if (!audioCalls) {
            return {
                success: false,
                error: 'Failed to fetch audio calls'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[getAudioCallsAction] Success, returned audio calls:', audioCalls.data?.length);
        }

        return {
            success: true,
            data: audioCalls
        };
    } catch (error: any) {
        console.error('[getAudioCallsAction] Unexpected error:', error);

        // Provide more specific error messages based on the error
        let errorMessage = 'Failed to fetch audio calls';
        if (error.message?.includes('Forbidden')) {
            errorMessage = 'You do not have permission to access audio calls';
        } else if (error.message?.includes('Unauthorized')) {
            errorMessage = 'Authentication required to access audio calls';
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timed out while fetching audio calls';
        } else if (error.message) {
            errorMessage = `Failed to fetch audio calls: ${error.message}`;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Get audio call by ID
 */
export const getAudioCallByIdAction = async (id: string | number): Promise<ActionResult<IAudioCall>> => {
    try {
        await requireAdminActionContext('getAudioCallByIdAction');
        const audioCall = await AudioCallService.getAudioCallById(id);

        if (!audioCall) {
            return {
                success: false,
                error: 'Audio call not found'
            };
        }

        return {
            success: true,
            data: audioCall
        };
    } catch (error: any) {
        console.error('[getAudioCallByIdAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch audio call'
        };
    }
}

/**
 * Create new audio call with file upload
 */
export const createAudioCallAction = async (audioCallData: AudioCallFileUpload): Promise<ActionResult<IAudioCall>> => {
    try {
        await requireAdminActionContext('createAudioCallAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[createAudioCallAction] Creating audio call with data:', {
                ...audioCallData,
                file: audioCallData.file ? `File: ${audioCallData.file.name} (${audioCallData.file.size} bytes)` : 'No file'
            });
        }

        const audioCall = await AudioCallService.createAudioCall(audioCallData);

        if (!audioCall) {
            return {
                success: false,
                error: 'Failed to create audio call'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[createAudioCallAction] Successfully created audio call with ID:', audioCall.id);
        }

        return {
            success: true,
            data: audioCall
        };
    } catch (error: any) {
        console.error('[createAudioCallAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create audio call'
        };
    }
}

/**
 * Update audio call by ID (metadata only)
 */
export const updateAudioCallAction = async (
    id: string | number,
    data: UpdateAudioCallData
): Promise<ActionResult<IAudioCall>> => {
    try {
        await requireAdminActionContext('updateAudioCallAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[updateAudioCallAction] Updating audio call ID:', id, 'with data:', data);
        }

        const audioCall = await AudioCallService.updateAudioCall(id, data);

        if (!audioCall) {
            return {
                success: false,
                error: 'Failed to update audio call or audio call not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[updateAudioCallAction] Successfully updated audio call ID:', id);
        }

        return {
            success: true,
            data: audioCall
        };
    } catch (error: any) {
        console.error('[updateAudioCallAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update audio call'
        };
    }
}

/**
 * Update audio call with new file and metadata
 */
export const updateAudioCallWithFileAction = async (
    id: string | number,
    audioCallData: AudioCallFileUpload
): Promise<ActionResult<IAudioCall>> => {
    try {
        await requireAdminActionContext('updateAudioCallWithFileAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[updateAudioCallWithFileAction] Updating audio call ID:', id, 'with file and data:', {
                ...audioCallData,
                file: audioCallData.file ? `File: ${audioCallData.file.name} (${audioCallData.file.size} bytes)` : 'No file'
            });
        }

        const audioCall = await AudioCallService.updateAudioCallWithFile(id, audioCallData);

        if (!audioCall) {
            return {
                success: false,
                error: 'Failed to update audio call with file or audio call not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[updateAudioCallWithFileAction] Successfully updated audio call with file ID:', id);
        }

        return {
            success: true,
            data: audioCall
        };
    } catch (error: any) {
        console.error('[updateAudioCallWithFileAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update audio call with file'
        };
    }
}

/**
 * Delete audio call by ID
 */
export const deleteAudioCallAction = async (
    id: string | number
): Promise<ActionResult<boolean>> => {
    try {
        await requireAdminActionContext('deleteAudioCallAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[deleteAudioCallAction] Deleting audio call ID:', id);
        }

        const success = await AudioCallService.deleteAudioCall(id);

        if (!success) {
            return {
                success: false,
                error: 'Failed to delete audio call or audio call not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[deleteAudioCallAction] Successfully deleted audio call ID:', id);
        }

        return {
            success: true,
            data: true
        };
    } catch (error: any) {
        console.error('[deleteAudioCallAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete audio call'
        };
    }
}

/**
 * Search audio calls with advanced filters
 */
export const searchAudioCallsAction = async (
    searchTerm: string,
    filters: Partial<QueryParamsType> = {}
): Promise<ActionResult<PaginatedResponse<IAudioCall>>> => {
    try {
        await requireAdminActionContext('searchAudioCallsAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[searchAudioCallsAction] Searching audio calls with term:', searchTerm, 'and filters:', filters);
        }

        const audioCalls = await AudioCallService.searchAudioCalls(searchTerm, filters);

        if (!audioCalls) {
            return {
                success: false,
                error: 'Failed to search audio calls'
            };
        }

        return {
            success: true,
            data: audioCalls
        };
    } catch (error: any) {
        console.error('[searchAudioCallsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to search audio calls'
        };
    }
}

/**
 * Get audio calls with transcriptions
 */
export const getAudioCallsWithTranscriptionsAction = async (
    params: Omit<QueryParamsType, 'filters'> = {}
): Promise<ActionResult<PaginatedResponse<IAudioCall>>> => {
    try {
        await requireAdminActionContext('getAudioCallsWithTranscriptionsAction');
        const audioCalls = await AudioCallService.getAudioCallsWithTranscriptions(params);

        if (!audioCalls) {
            return {
                success: false,
                error: 'Failed to fetch audio calls with transcriptions'
            };
        }

        return {
            success: true,
            data: audioCalls
        };
    } catch (error: any) {
        console.error('[getAudioCallsWithTranscriptionsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch audio calls with transcriptions'
        };
    }
}

/**
 * Get audio calls without transcriptions
 */
export const getAudioCallsWithoutTranscriptionsAction = async (
    params: Omit<QueryParamsType, 'filters'> = {}
): Promise<ActionResult<PaginatedResponse<IAudioCall>>> => {
    try {
        await requireAdminActionContext('getAudioCallsWithoutTranscriptionsAction');
        const audioCalls = await AudioCallService.getAudioCallsWithoutTranscriptions(params);

        if (!audioCalls) {
            return {
                success: false,
                error: 'Failed to fetch audio calls without transcriptions'
            };
        }

        return {
            success: true,
            data: audioCalls
        };
    } catch (error: any) {
        console.error('[getAudioCallsWithoutTranscriptionsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch audio calls without transcriptions'
        };
    }
}

/**
 * Get audio calls with rubrics
 */
export const getAudioCallsWithRubricsAction = async (
    params: Omit<QueryParamsType, 'filters'> = {}
): Promise<ActionResult<PaginatedResponse<IAudioCall>>> => {
    try {
        await requireAdminActionContext('getAudioCallsWithRubricsAction');
        const audioCalls = await AudioCallService.getAudioCallsWithRubrics(params);

        if (!audioCalls) {
            return {
                success: false,
                error: 'Failed to fetch audio calls with rubrics'
            };
        }

        return {
            success: true,
            data: audioCalls
        };
    } catch (error: any) {
        console.error('[getAudioCallsWithRubricsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch audio calls with rubrics'
        };
    }
}

/**
 * Update transcription for existing audio call
 */
export const updateTranscriptionAction = async (
    id: string | number,
    transcription: string
): Promise<ActionResult<IAudioCall>> => {
    try {
        await requireAdminActionContext('updateTranscriptionAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[updateTranscriptionAction] Updating transcription for audio call ID:', id);
        }

        const audioCall = await AudioCallService.updateTranscription(id, transcription);

        if (!audioCall) {
            return {
                success: false,
                error: 'Failed to update transcription or audio call not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[updateTranscriptionAction] Successfully updated transcription for audio call ID:', id);
        }

        return {
            success: true,
            data: audioCall
        };
    } catch (error: any) {
        console.error('[updateTranscriptionAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update transcription'
        };
    }
}

/**
 * Update rubric for existing audio call
 */
export const updateRubricAction = async (
    id: string | number,
    rubric: string
): Promise<ActionResult<IAudioCall>> => {
    try {
        await requireAdminActionContext('updateRubricAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[updateRubricAction] Updating rubric for audio call ID:', id);
        }

        const audioCall = await AudioCallService.updateRubric(id, rubric);

        if (!audioCall) {
            return {
                success: false,
                error: 'Failed to update rubric or audio call not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[updateRubricAction] Successfully updated rubric for audio call ID:', id);
        }

        return {
            success: true,
            data: audioCall
        };
    } catch (error: any) {
        console.error('[updateRubricAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update rubric'
        };
    }
}
