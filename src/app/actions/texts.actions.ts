/**
 * Server Actions for Texts using the simplified TextsService
 * Following the fetchApi -> service -> server action pattern
 */

'use server';

import TextsService, { FindTextsParams, CreateTextData, TextUpdateData } from "@/services/texts.service";
import { ITypingText, PaginatedResponse } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminActionContext } from "@/lib/auth/server-action-auth";
import { startServerActionTrace } from "@/lib/observability/server-observability";

// Result type for consistent server action returns
type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Get typing texts with pagination and filters
 */
export const getTextsAction = async (params: FindTextsParams = {}): Promise<ActionResult<PaginatedResponse<ITypingText>>> => {
    try {
        await requireAdminActionContext('getTextsAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[getTextsAction] Called with params:', JSON.stringify(params, null, 2));
        }

        const texts = await TextsService.getTexts(params);

        if (!texts) {
            console.error('[getTextsAction] Service returned null');
            return {
                success: false,
                error: 'Failed to fetch texts - service returned null'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[getTextsAction] Success - texts count:', texts.data?.length || 0);
        }

        return {
            success: true,
            data: texts
        };
    } catch (error: any) {
        console.error('[getTextsAction] Unexpected error:', error);

        // Provide more specific error messages based on the error
        let errorMessage = 'Failed to fetch texts';
        if (error.message?.includes('Forbidden')) {
            errorMessage = 'Access denied. Please check your permissions.';
        } else if (error.message?.includes('Unauthorized')) {
            errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Legacy function to maintain backward compatibility
 */
export const fetchTypingTexts = async (
    page: number,
    pageSize: number,
    params: any
): Promise<PaginatedResponse<ITypingText> | null> => {
    try {
        const textsParams: FindTextsParams = {
            page,
            pageSize,
            ...params
        };

        const result = await getTextsAction(textsParams);
        return result.success ? result.data || null : null;
    } catch (error) {
        console.error('💥 [fetchTypingTexts] Error fetching typing texts:', error);
        return null;
    }
}

/**
 * Get text by ID
 */
export const getTextByIdAction = async (id: string | number): Promise<ActionResult<ITypingText>> => {
    try {
        await requireAdminActionContext('getTextByIdAction');
        const text = await TextsService.getTextById(id);

        if (!text) {
            return {
                success: false,
                error: 'Text not found'
            };
        }

        return {
            success: true,
            data: text
        };
    } catch (error: any) {
        console.error('[getTextByIdAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch text'
        };
    }
}

/**
 * Create new typing text
 */
export const createTextAction = async (textData: CreateTextData): Promise<ActionResult<ITypingText>> => {
    const trace = startServerActionTrace('createTextAction');
    let isSuccess = false;
    try {
        await requireAdminActionContext('createTextAction', trace.correlationId);
        console.log('✨ [createTextAction] Creating new typing text:', textData);

        const newText = await TextsService.createText(textData);

        if (!newText) {
            return {
                success: false,
                error: 'Failed to create typing text'
            };
        }

        console.log('✅ [createTextAction] Successfully created typing text');

        // Revalidate texts list
        revalidateTag('texts');
        revalidatePath('/admin/texts');

        isSuccess = true;
        return {
            success: true,
            data: newText
        };
    } catch (error: any) {
        trace.failure(error);
        console.error('💥 [createTextAction] Error creating typing text:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    } finally {
        if (isSuccess) trace.success();
    }
}

/**
 * Legacy function to maintain backward compatibility
 */
export const createTypingText = async (data: {
    title?: string;
    text: string;
    type: 'practice' | 'test';
    difficulty: 'Base' | 'Intermediate' | 'Extreme';
    assessmentVersion?: string;
    isActive?: boolean;
}): Promise<{ success: boolean; data?: ITypingText; error?: string }> => {
    const result = await createTextAction(data);
    return result;
}

/**
 * Update typing text by ID
 */
export const updateTextAction = async (
    id: string | number,
    data: TextUpdateData
): Promise<ActionResult<ITypingText>> => {
    const trace = startServerActionTrace('updateTextAction', { targetId: String(id) });
    let isSuccess = false;
    try {
        await requireAdminActionContext('updateTextAction', trace.correlationId);
        console.log('📝 [updateTextAction] Updating typing text:', { id, data });

        const updatedText = await TextsService.updateText(id, data);

        if (!updatedText) {
            return {
                success: false,
                error: 'Failed to update typing text'
            };
        }

        console.log('✅ [updateTextAction] Successfully updated typing text');

        // Revalidate related pages
        revalidateTag('texts');
        revalidatePath('/admin/texts');
        revalidatePath(`/admin/texts/${id}`);

        isSuccess = true;
        return {
            success: true,
            data: updatedText
        };
    } catch (error: any) {
        trace.failure(error, { targetId: String(id) });
        console.error('💥 [updateTextAction] Error updating typing text:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    } finally {
        if (isSuccess) trace.success({ targetId: String(id) });
    }
}

/**
 * Legacy function to maintain backward compatibility
 */
export const updateTypingText = async (
    id: string,
    data: {
        title?: string;
        text?: string;
        type?: 'practice' | 'test';
        difficulty?: 'Base' | 'Intermediate' | 'Extreme';
        assessmentVersion?: string;
        isActive?: boolean;
    }
): Promise<{ success: boolean; data?: ITypingText; error?: string }> => {
    const result = await updateTextAction(id, data);
    return result;
}

/**
 * Delete typing text by ID
 */
export const deleteTextAction = async (
    id: string | number
): Promise<ActionResult<boolean>> => {
    const trace = startServerActionTrace('deleteTextAction', { targetId: String(id) });
    let isSuccess = false;
    try {
        await requireAdminActionContext('deleteTextAction', trace.correlationId);
        console.log('🗑️ [deleteTextAction] Deleting typing text:', id);

        const success = await TextsService.deleteText(id);

        if (!success) {
            return {
                success: false,
                error: 'Failed to delete typing text'
            };
        }

        console.log('✅ [deleteTextAction] Successfully deleted typing text');

        // Revalidate texts list
        revalidateTag('texts');
        revalidatePath('/admin/texts');

        isSuccess = true;
        return {
            success: true,
            data: true
        };
    } catch (error: any) {
        trace.failure(error, { targetId: String(id) });
        console.error('💥 [deleteTextAction] Error deleting typing text:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    } finally {
        if (isSuccess) trace.success({ targetId: String(id) });
    }
}

/**
 * Legacy function to maintain backward compatibility
 */
export const deleteTypingText = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    const result = await deleteTextAction(id);
    return {
        success: result.success,
        error: result.error
    };
}

/**
 * Get texts by type (practice or test)
 */
export const getTextsByTypeAction = async (
    type: 'practice' | 'test',
    params: Omit<FindTextsParams, 'type'> = {}
): Promise<ActionResult<PaginatedResponse<ITypingText>>> => {
    try {
        const texts = await TextsService.getTextsByType(type, params);

        if (!texts) {
            return {
                success: false,
                error: `Failed to fetch ${type} texts`
            };
        }

        return {
            success: true,
            data: texts
        };
    } catch (error: any) {
        console.error(`[getTextsByTypeAction] Error fetching ${type} texts:`, error);
        return {
            success: false,
            error: error.message || `Failed to fetch ${type} texts`
        };
    }
}

/**
 * Search texts
 */
export const searchTextsAction = async (
    searchTerm: string,
    filters: Partial<FindTextsParams> = {}
): Promise<ActionResult<PaginatedResponse<ITypingText>>> => {
    try {
        const results = await TextsService.searchTexts(searchTerm, filters);

        if (!results) {
            return {
                success: false,
                error: 'Failed to search texts'
            };
        }

        return {
            success: true,
            data: results
        };
    } catch (error: any) {
        console.error('[searchTextsAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to search texts'
        };
    }
}

/**
 * Redirect actions for form submissions
 */

/**
 * Create text and redirect
 */
export async function createTextAndRedirectAction(
    textData: CreateTextData,
    redirectTo: string = '/admin/texts'
): Promise<never> {
    try {
        const result = await createTextAction(textData);

        if (!result.success) {
            redirect(`${redirectTo}?error=${encodeURIComponent(result.error || 'Failed to create text')}`);
        }

        redirect(`${redirectTo}?success=Text created successfully`);
    } catch (error: any) {
        console.error('[createTextAndRedirectAction] Error:', error);
        redirect(`${redirectTo}?error=${encodeURIComponent('Failed to create text')}`);
    }
}

/**
 * Update text and redirect
 */
export const updateTextAndRedirectAction = async (
    id: string | number,
    data: TextUpdateData,
    redirectTo: string = '/admin/texts'
): Promise<never> => {
    try {
        const result = await updateTextAction(id, data);

        if (!result.success) {
            redirect(`${redirectTo}?error=${encodeURIComponent(result.error || 'Failed to update text')}`);
        }

        redirect(`${redirectTo}?success=Text updated successfully`);
    } catch (error: any) {
        console.error('[updateTextAndRedirectAction] Error:', error);
        redirect(`${redirectTo}?error=${encodeURIComponent('Failed to update text')}`);
    }
}

/**
 * Delete text and redirect
 */
export const deleteTextAndRedirectAction = async (
    id: string | number,
    redirectTo: string = '/admin/texts'
): Promise<never> => {
    try {
        const result = await deleteTextAction(id);

        if (!result.success) {
            redirect(`${redirectTo}?error=${encodeURIComponent(result.error || 'Failed to delete text')}`);
        }

        redirect(`${redirectTo}?success=Text deleted successfully`);
    } catch (error: any) {
        console.error('[deleteTextAndRedirectAction] Error:', error);
        redirect(`${redirectTo}?error=${encodeURIComponent('Failed to delete text')}`);
    }
}
