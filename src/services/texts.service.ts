/**
 * Simplified Texts Service for Server Actions
 * Direct integration with fetch-client without unnecessary abstraction layers
 */
import fetchApi from "@/lib/fetch-client";
import { ITypingText, PaginatedResponse } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

// Types for parameters
export interface FindTextsParams {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: 'practice' | 'test';
    filters?: any;
    sort?: string | string[];
    populate?: any;
}

export interface CreateTextData {
    text: string;
    type: 'practice' | 'test';
}

export interface TextUpdateData {
    text?: string;
    type?: 'practice' | 'test';
}

export default class TextsService {
    private static readonly BASE_URL = '/typing-texts';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'TextsService',
        searchFields: ['text'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get typing texts with pagination and filters
     */
    static async getTexts(params: FindTextsParams = {}): Promise<PaginatedResponse<ITypingText> | null> {
        const queryString = BaseServiceHelper.buildQueryString(params, this.SERVICE_CONFIG);
        const url = `${this.BASE_URL}?${queryString}`;

        BaseServiceHelper.logRequest(this.SERVICE_CONFIG.serviceName, url, params);

        return BaseServiceHelper.handleApiRequest(
            this.SERVICE_CONFIG.serviceName,
            'fetching texts',
            () => fetchApi.get<PaginatedResponse<ITypingText>>(url),
            params
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
                const response = await fetchApi.get<{ data: ITypingText }>(`${this.BASE_URL}/${id}`);
                return response.data;
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
                const response = await fetchApi.post<{ data: ITypingText }>(
                    this.BASE_URL,
                    { data: textData }
                );
                return response.data;
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
                const response = await fetchApi.put<{ data: ITypingText }>(
                    `${this.BASE_URL}/${id}`,
                    { data }
                );
                return response.data;
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
                await fetchApi.delete(`${this.BASE_URL}/${id}`);
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
