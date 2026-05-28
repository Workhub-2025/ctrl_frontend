/**
 * Simplified Texts Service for Server Actions
 * Uses @strapi/client for all Strapi CMS interactions.
 */
import { getServerStrapiClient } from '@/lib/strapi';
import { ITypingText, PaginatedResponse } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

// Types for parameters
export interface FindTextsParams {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: 'practice' | 'test';
    difficulty?: 'Base' | 'Intermediate' | 'Advanced';
    filters?: any;
    sort?: string | string[];
    populate?: any;
}

export interface CreateTextData {
    text: string;
    type: 'practice' | 'test';
    difficulty: 'Base' | 'Intermediate' | 'Advanced';
}

export interface TextUpdateData {
    text?: string;
    type?: 'practice' | 'test';
    difficulty?: 'Base' | 'Intermediate' | 'Advanced';
}

export default class TextsService {
    private static readonly COLLECTION = 'typing-texts';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'TextsService',
        searchFields: ['text'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get typing texts with pagination and filters
     */
    static async getTexts(params: FindTextsParams = {}): Promise<PaginatedResponse<ITypingText> | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching texts',
            async () => {
                const client = await getServerStrapiClient();
                const queryParams = BaseServiceHelper.toStrapiQueryParams(params, this.SERVICE_CONFIG);
                return client.collection(this.COLLECTION).find(queryParams) as unknown as Promise<PaginatedResponse<ITypingText>>;
            }
        );
    }

    /**
     * Get text by ID
     */
    static async getTextById(id: string | number): Promise<ITypingText | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching text by ID',
            async () => {
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).findOne(String(id)) as unknown as Promise<ITypingText>;
            }
        );
    }

    /**
     * Create new typing text
     */
    static async createText(textData: CreateTextData): Promise<ITypingText | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'creating text',
            async () => {
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).create(textData as unknown as Record<string, unknown>) as unknown as Promise<ITypingText>;
            }
        );
    }

    /**
     * Update text by ID
     */
    static async updateText(id: string | number, data: TextUpdateData): Promise<ITypingText | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'updating text',
            async () => {
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).update(String(id), data as Record<string, unknown>) as unknown as Promise<ITypingText>;
            }
        );
    }

    /**
     * Delete text by ID
     */
    static async deleteText(id: string | number): Promise<boolean> {
        const result = await BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'deleting text',
            async () => {
                const client = await getServerStrapiClient();
                await client.collection(this.COLLECTION).delete(String(id));
                return true;
            }
        );
        return result ?? false;
    }

    /**
     * Get texts by type (practice or test)
     */
    static async getTextsByType(
        type: 'practice' | 'test',
        params: Omit<FindTextsParams, 'type'> = {}
    ): Promise<PaginatedResponse<ITypingText> | null> {
        const filters = BaseServiceHelper.buildTypeFilter(type, params.filters);
        return this.getTexts({ ...params, filters });
    }

    /**
     * Search texts with advanced filters
     */
    static async searchTexts(searchTerm: string, filters: Partial<FindTextsParams> = {}): Promise<PaginatedResponse<ITypingText> | null> {
        const searchFilters = BaseServiceHelper.buildSearchFilters(searchTerm, this.SERVICE_CONFIG.searchFields || []);
        return this.getTexts({
            ...filters,
            filters: { ...filters.filters, ...searchFilters }
        });
    }
}
