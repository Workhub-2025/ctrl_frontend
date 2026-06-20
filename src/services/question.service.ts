/**
 * Questions Service for Server Actions
 * @deprecated The legacy `a-sja-questions` collection is no longer present.
 * Assessment content now lives in assessment-content-bank/platform sync flows.
 * Uses @strapi/client for all Strapi CMS interactions.
 */
import { getServerStrapiClient } from '@/lib/strapi';
import { IQuestion, isMCPQuestion, isTextQuestion, PaginatedResponse, QueryParamsType } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

export interface FindQuestionsParams extends QueryParamsType {
    type?: 'mcp' | 'text';
}
export default class QuestionService {
    private static readonly COLLECTION = 'a-sja-questions';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'QuestionService',
        searchFields: ['question', 'rightAnswer', 'rubric'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get questions with pagination and filters
     */
    static async getQuestions(params: FindQuestionsParams = {}): Promise<PaginatedResponse<IQuestion> | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching questions',
            async () => {
                const client = await getServerStrapiClient();
                const queryParams = BaseServiceHelper.toStrapiQueryParams(params, this.SERVICE_CONFIG);
                return client.collection(this.COLLECTION).find(queryParams) as unknown as Promise<PaginatedResponse<IQuestion>>;
            }
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
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).findOne(String(id)) as unknown as Promise<IQuestion>;
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
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).create(questionData as Record<string, unknown>) as unknown as Promise<IQuestion>;
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
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).update(String(id), data as Record<string, unknown>) as unknown as Promise<IQuestion>;
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
                const client = await getServerStrapiClient();
                await client.collection(this.COLLECTION).delete(String(id));
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
