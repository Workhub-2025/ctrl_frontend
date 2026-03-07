/**
 * Base Service Helper
 * Common utilities for all service classes to reduce code duplication
 */

export interface BaseServiceParams {
    page?: number;
    pageSize?: number;
    search?: string;
    filters?: any;
    sort?: string | string[];
    populate?: any;
}

export interface ServiceConfig {
    serviceName: string;
    searchFields?: string[];
    defaultSort?: string;
}

export class BaseServiceHelper {
    /**
     * Build query string from parameters - Universal method
     */
    static buildQueryString(
        params: BaseServiceParams,
        config: ServiceConfig,
        options?: {
            additionalFilters?: Record<string, any>;
        }
    ): string {
        const searchParams = new URLSearchParams();

        // Pagination
        this.addPaginationParams(searchParams, params);

        // Handle complex filters or simple search
        if (params.filters && typeof params.filters === 'object') {
            this.buildFiltersFromObject(searchParams, params.filters);
        } else {
            this.addSimpleSearchAndFilters(searchParams, params, config.searchFields || [], options?.additionalFilters);
        }

        // Sorting
        this.addSortingParams(searchParams, params, config.defaultSort);

        // Populate
        this.addPopulateParams(searchParams, params);

        if (process.env.NODE_ENV === 'development') {
            console.log(`[${config.serviceName}] Built query string:`, searchParams.toString());
        }

        return searchParams.toString();
    }

    /**
     * Add pagination parameters
     */
    private static addPaginationParams(searchParams: URLSearchParams, params: BaseServiceParams): void {
        if (params.page) {
            searchParams.append('pagination[page]', params.page.toString());
        }
        if (params.pageSize) {
            searchParams.append('pagination[pageSize]', params.pageSize.toString());
        }
    }

    /**
     * Add simple search and filters for backward compatibility
     */
    private static addSimpleSearchAndFilters(
        searchParams: URLSearchParams,
        params: BaseServiceParams,
        searchFields: string[],
        additionalFilters?: Record<string, any>
    ): void {
        // Handle search across multiple fields
        if (params.search && searchFields.length > 0) {
            const searchTerm = encodeURIComponent(params.search);
            if (searchFields.length === 1) {
                // Single field search
                searchParams.append(`filters[${searchFields[0]}][$containsi]`, searchTerm);
            } else {
                // Multiple field search with $or
                searchFields.forEach((field, index) => {
                    searchParams.append(`filters[$or][${index}][${field}][$containsi]`, searchTerm);
                });
            }
        }

        // Add additional simple filters
        if (additionalFilters) {
            Object.entries(additionalFilters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(`filters[${key}][$eq]`, String(value));
                }
            });
        }
    }

    /**
     * Add sorting parameters
     */
    private static addSortingParams(searchParams: URLSearchParams, params: BaseServiceParams, defaultSort = 'createdAt:desc'): void {
        if (params.sort) {
            if (Array.isArray(params.sort)) {
                params.sort.forEach((sortItem, index) => {
                    searchParams.append(`sort[${index}]`, sortItem);
                });
            } else {
                searchParams.append('sort[0]', params.sort);
            }
        } else {
            searchParams.append('sort[0]', defaultSort);
        }
    }

    /**
     * Add populate parameters
     */
    private static addPopulateParams(searchParams: URLSearchParams, params: BaseServiceParams): void {
        if (params.populate) {
            if (typeof params.populate === 'string') {
                // Simple populate: populate=*
                searchParams.append('populate', params.populate);
            } else if (Array.isArray(params.populate)) {
                // Array of relations: populate[0]=field1&populate[1]=field2
                params.populate.forEach((item, index) => {
                    if (typeof item === 'string') {
                        searchParams.append(`populate[${index}]`, item);
                    } else if (typeof item === 'object') {
                        // Complex populate object
                        this.buildPopulateFromObject(searchParams, item, `populate[${index}]`);
                    }
                });
            } else if (typeof params.populate === 'object') {
                // Object populate: populate[relation][fields][0]=field1
                this.buildPopulateFromObject(searchParams, params.populate, 'populate');
            }
        }
    }

    /**
     * Build populate parameters from object structure
     */
    private static buildPopulateFromObject(searchParams: URLSearchParams, populate: any, prefix: string): void {
        Object.entries(populate).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }

            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        this.buildPopulateFromObject(searchParams, item, `${prefix}[${key}][${index}]`);
                    } else if (item !== undefined && item !== null) {
                        searchParams.append(`${prefix}[${key}][${index}]`, String(item));
                    }
                });
            } else if (typeof value === 'object') {
                this.buildPopulateFromObject(searchParams, value, `${prefix}[${key}]`);
            } else {
                searchParams.append(`${prefix}[${key}]`, String(value));
            }
        });
    }

    /**
     * Build filters from complex object structure - Fixed version
     */
    static buildFiltersFromObject(searchParams: URLSearchParams, filters: any, prefix: string = 'filters'): void {
        Object.entries(filters).forEach(([key, value]) => {
            // Skip undefined and null values
            if (value === undefined || value === null) {
                return;
            }

            if (Array.isArray(value)) {
                // Handle arrays like $or conditions
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        this.buildFiltersFromObject(searchParams, item, `${prefix}[${key}][${index}]`);
                    } else if (item !== undefined && item !== null) {
                        searchParams.append(`${prefix}[${key}][${index}]`, String(item));
                    }
                });
            } else if (typeof value === 'object') {
                // Recursive for nested objects (non-null objects)
                this.buildFiltersFromObject(searchParams, value, `${prefix}[${key}]`);
            } else {
                // Simple primitive values only - use String() instead of JSON.stringify()
                searchParams.append(`${prefix}[${key}]`, String(value));
            }
        });
    }

    /**
     * Standard development logging for requests
     */
    static logRequest(serviceName: string, url: string, params: any): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${serviceName}] Making request to:`, url);
            console.log(`[${serviceName}] Request params:`, params);
        }
    }

    /**
     * Standard development logging for responses
     */
    static logResponse(serviceName: string, response: any): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${serviceName}] Response received:`, {
                dataCount: response?.data?.length || 0,
                totalFromMeta: response?.meta?.pagination?.total || 0
            });
        }
    }

    /**
     * Standard error logging
     */
    static logError(serviceName: string, operation: string, error: any, params?: any): void {
        console.error(`[${serviceName}] Error ${operation}:`, error);

        if (process.env.NODE_ENV === 'development' && params) {
            console.error(`[${serviceName}] Request failed with params:`, params);
        }
    }

    /**
     * Handle standard API response with logging
     */
    static async handleApiRequest<T>(
        serviceName: string,
        operation: string,
        apiCall: () => Promise<T>,
        params?: any
    ): Promise<T | null> {
        try {
            const response = await apiCall();

            if (params) {
                this.logResponse(serviceName, response);
            }

            return response;
        } catch (error) {
            this.logError(serviceName, operation, error, params);
            return null;
        }
    }

    /**
     * Build type-specific filters helper
     */
    static buildTypeFilter(type: string, additionalFilters?: any): any {
        return {
            ...additionalFilters,
            type: { $eq: type }
        };
    }

    /**
     * Build search filters for multiple fields
     */
    static buildSearchFilters(searchTerm: string, fields: string[]): any {
        if (!searchTerm.trim() || fields.length === 0) return {};

        const trimmedSearch = searchTerm.trim();
        return {
            $or: fields.map(field => ({
                [field]: { $containsi: trimmedSearch }
            }))
        };
    }

    /**
     * Create basic try-catch wrapper for service methods
     */
    static async executeSafely<T>(
        serviceName: string,
        operation: string,
        fn: () => Promise<T>,
        params?: any
    ): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.logError(serviceName, operation, error, params);
            return null;
        }
    }
}

export default BaseServiceHelper;