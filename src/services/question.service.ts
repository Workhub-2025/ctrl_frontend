/**
 * Questions Service for Server Actions
 * Direct integration with fetch-client for managing questions
 */
import fetchApi from "@/lib/fetch-client";
import { IQuestion, isMCPQuestion, isTextQuestion, PaginatedResponse, QueryParamsType } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

export interface FindQuestionsParams extends QueryParamsType {
    type?: 'mcp' | 'text';
}
export default class QuestionService {
    private static readonly BASE_URL = '/questions';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'QuestionService',
        searchFields: ['question', 'rightAnswer', 'rubric'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get questions with pagination and filters
     */
    static async getQuestions(params: FindQuestionsParams = {}): Promise<PaginatedResponse<IQuestion> | null> {
        const queryString = BaseServiceHelper.buildQueryString(params, this.SERVICE_CONFIG);
        const url = `${this.BASE_URL}?${queryString}`;

        BaseServiceHelper.logRequest(this.SERVICE_CONFIG.serviceName, url, params);

        return BaseServiceHelper.handleApiRequest(
            this.SERVICE_CONFIG.serviceName,
            'fetching questions',
            () => fetchApi.get<PaginatedResponse<IQuestion>>(url),
            params
        );
    }

    /**
     * Get question by ID
     */
    static async getQuestionById(id: string | number): Promise<IQuestion | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching question by ID',
            async () => {
                const response = await fetchApi.get<{ data: IQuestion }>(`${this.BASE_URL}/${id}`);
                return response.data;
            }
        );
    }

    /**
     * Create new question (MCP or Text)
     */
    static async createQuestion(questionData: IQuestion): Promise<IQuestion | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'creating question',
            async () => {
                const response = await fetchApi.post<{ data: IQuestion }>(
                    this.BASE_URL,
                    { data: questionData }
                );
                return response.data;
            }
        );
    }

    /**
     * Update question by ID
     */
    static async updateQuestion(id: string | number, data: IQuestion): Promise<IQuestion | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'updating question',
            async () => {
                const response = await fetchApi.put<{ data: IQuestion }>(
                    `${this.BASE_URL}/${id}`,
                    { data }
                );
                return response.data;
            }
        );
    }

    /**
     * Delete question by ID
     */
    static async deleteQuestion(id: string | number): Promise<boolean> {
        const result = await BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'deleting question',
            async () => {
                await fetchApi.delete(`${this.BASE_URL}/${id}`);
                return true;
            }
        );
        return result ?? false;
    }

    /**
     * Get questions by type (mcp or text)
     */
    static async getQuestionsByType(
        type: 'mcp' | 'text',
        params: Omit<FindQuestionsParams, 'type'> = {}
    ): Promise<PaginatedResponse<IQuestion> | null> {
        const filters = BaseServiceHelper.buildTypeFilter(type, params.filters);
        return this.getQuestions({ ...params, filters });
    }

    /**
     * Get only MCP questions with type safety
     */
    static async getMCPQuestions(params: Omit<FindQuestionsParams, 'type'> = {}): Promise<PaginatedResponse<IQuestion> | null> {
        return await this.getQuestionsByType('mcp', params);
    }

    /**
     * Get only Text questions with type safety
     */
    static async getTextQuestions(params: Omit<FindQuestionsParams, 'type'> = {}): Promise<PaginatedResponse<IQuestion> | null> {
        return await this.getQuestionsByType('text', params);
    }

    /**
     * Search questions with advanced filters
     */
    static async searchQuestions(searchTerm: string, filters: Partial<FindQuestionsParams> = {}): Promise<PaginatedResponse<IQuestion> | null> {
        const searchFilters = BaseServiceHelper.buildSearchFilters(searchTerm, this.SERVICE_CONFIG.searchFields || []);
        return this.getQuestions({
            ...filters,
            filters: { ...filters.filters, ...searchFilters }
        });
    }

    /**
     * Validate question data based on type
     */
    static validateQuestionData(question: IQuestion): boolean {
        try {
            if (isMCPQuestion(question)) {
                return !!(question.question && question.rightAnswer);
            }

            if (isTextQuestion(question)) {
                return !!question.question;
            }

            return false;
        } catch (error) {
            console.error('[QuestionService] Error validating question data:', error);
            return false;
        }
    }

}
