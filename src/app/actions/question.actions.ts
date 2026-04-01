/**
 * Server Actions for Questions using the QuestionService
 * Following the fetchApi -> service -> server action pattern
 */

'use server';

import QuestionService, {
    FindQuestionsParams
} from '@/services/question.service';
import { IQuestion, PaginatedResponse, } from '@/types';
import { requireAdminActionContext } from '@/lib/auth/server-action-auth';

// Result type for consistent server action returns
type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Get questions with pagination and filters
 */
export const getQuestionsAction = async (params: FindQuestionsParams = {}): Promise<ActionResult<PaginatedResponse<IQuestion>>> => {
    try {
        await requireAdminActionContext('getQuestionsAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[getQuestionsAction] Called with params:', params);
        }

        const questions = await QuestionService.getQuestions(params);

        if (!questions) {
            return {
                success: false,
                error: 'Failed to fetch questions'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[getQuestionsAction] Success, returned questions:', questions.data?.length);
        }

        return {
            success: true,
            data: questions
        };
    } catch (error: any) {
        console.error('[getQuestionsAction] Unexpected error:', error);

        // Provide more specific error messages based on the error
        let errorMessage = 'Failed to fetch questions';
        if (error.message?.includes('Forbidden')) {
            errorMessage = 'You do not have permission to access questions';
        } else if (error.message?.includes('Unauthorized')) {
            errorMessage = 'Authentication required to access questions';
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timed out while fetching questions';
        } else if (error.message) {
            errorMessage = `Failed to fetch questions: ${error.message}`;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Get question by ID
 */
export const getQuestionByIdAction = async (id: string | number): Promise<ActionResult<IQuestion>> => {
    try {
        await requireAdminActionContext('getQuestionByIdAction');
        const question = await QuestionService.getQuestionById(id);

        if (!question) {
            return {
                success: false,
                error: 'Question not found'
            };
        }

        return {
            success: true,
            data: question
        };
    } catch (error: any) {
        console.error('[getQuestionByIdAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch question'
        };
    }
}

/**
 * Create new question (MCP or Text)
 */
export const createQuestionAction = async (questionData: IQuestion): Promise<ActionResult<IQuestion>> => {
    try {
        await requireAdminActionContext('createQuestionAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[createQuestionAction] Creating question with data:', questionData);
        }

        const question = await QuestionService.createQuestion(questionData);

        if (!question) {
            return {
                success: false,
                error: 'Failed to create question'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[createQuestionAction] Successfully created question with ID:', question.documentId);
        }

        return {
            success: true,
            data: question
        };
    } catch (error: any) {
        console.error('[createQuestionAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create question'
        };
    }
}

/**
 * Update question by ID
 */
export const updateQuestionAction = async (
    id: string | number,
    data: IQuestion
): Promise<ActionResult<IQuestion>> => {
    try {
        await requireAdminActionContext('updateQuestionAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[updateQuestionAction] Updating question ID:', id, 'with data:', data);
        }

        const question = await QuestionService.updateQuestion(id, data);

        if (!question) {
            return {
                success: false,
                error: 'Failed to update question or question not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[updateQuestionAction] Successfully updated question ID:', id);
        }

        return {
            success: true,
            data: question
        };
    } catch (error: any) {
        console.error('[updateQuestionAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update question'
        };
    }
}

/**
 * Delete question by ID
 */
export const deleteQuestionAction = async (
    id: string | number
): Promise<ActionResult<boolean>> => {
    try {
        await requireAdminActionContext('deleteQuestionAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[deleteQuestionAction] Deleting question ID:', id);
        }

        const success = await QuestionService.deleteQuestion(id);

        if (!success) {
            return {
                success: false,
                error: 'Failed to delete question or question not found'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[deleteQuestionAction] Successfully deleted question ID:', id);
        }

        return {
            success: true,
            data: true
        };
    } catch (error: any) {
        console.error('[deleteQuestionAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete question'
        };
    }
}

/**
 * Get questions by type (mcp or text)
 */
export const getQuestionsByTypeAction = async (
    type: 'mcp' | 'text',
    params: Omit<FindQuestionsParams, 'type'> = {}
): Promise<ActionResult<PaginatedResponse<IQuestion>>> => {
    try {
        await requireAdminActionContext('getQuestionsByTypeAction');
        const questions = await QuestionService.getQuestionsByType(type, params);

        if (!questions) {
            return {
                success: false,
                error: `Failed to fetch ${type} questions`
            };
        }

        return {
            success: true,
            data: questions
        };
    } catch (error: any) {
        console.error('[getQuestionsByTypeAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || `Failed to fetch ${type} questions`
        };
    }
}

/**
 * Get MCP questions
 */
export const getMCPQuestionsAction = async (
    params: Omit<FindQuestionsParams, 'type'> = {}
): Promise<ActionResult<PaginatedResponse<IQuestion>>> => {
    try {
        await requireAdminActionContext('getMCPQuestionsAction');
        const questions = await QuestionService.getMCPQuestions(params);

        if (!questions) {
            return {
                success: false,
                error: 'Failed to fetch MCP questions'
            };
        }

        return {
            success: true,
            data: questions
        };
    } catch (error: any) {
        console.error('[getMCPQuestionsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch MCP questions'
        };
    }
}

/**
 * Get Text questions
 */
export const getTextQuestionsAction = async (
    params: Omit<FindQuestionsParams, 'type'> = {}
): Promise<ActionResult<PaginatedResponse<IQuestion>>> => {
    try {
        await requireAdminActionContext('getTextQuestionsAction');
        const questions = await QuestionService.getTextQuestions(params);

        if (!questions) {
            return {
                success: false,
                error: 'Failed to fetch text questions'
            };
        }

        return {
            success: true,
            data: questions
        };
    } catch (error: any) {
        console.error('[getTextQuestionsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch text questions'
        };
    }
}

/**
 * Search questions
 */
export const searchQuestionsAction = async (
    searchTerm: string,
    filters: Partial<FindQuestionsParams> = {}
): Promise<ActionResult<PaginatedResponse<IQuestion>>> => {
    try {
        await requireAdminActionContext('searchQuestionsAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[searchQuestionsAction] Searching questions with term:', searchTerm, 'and filters:', filters);
        }

        const questions = await QuestionService.searchQuestions(searchTerm, filters);

        if (!questions) {
            return {
                success: false,
                error: 'Failed to search questions'
            };
        }

        return {
            success: true,
            data: questions
        };
    } catch (error: any) {
        console.error('[searchQuestionsAction] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Failed to search questions'
        };
    }
}
