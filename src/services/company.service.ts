/**
 * Company Service for Server Actions
 * Direct integration with fetch-client for managing companies
 */
import fetchApi from "@/lib/fetch-client";
import {
    ICompany,
    CreateCompanyData,
    UpdateCompanyData,
    validateCompany,
    validateCreateCompanyData,
    validateUpdateCompanyData,
    isCompany,
    SubscriptionPlan,
    SubscriptionStatus
} from '@/types/company.types';
import { PaginatedResponse, QueryParamsType } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

export interface FindCompaniesParams extends QueryParamsType {
    subscriptionPlan?: SubscriptionPlan;
    subscriptionStatus?: SubscriptionStatus;
    onboardingCompleted?: boolean;
}

export default class CompanyService {
    private static readonly BASE_URL = '/companies';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'CompanyService',
        searchFields: ['name', 'legalName', 'primaryContactName', 'primaryContactEmail', 'city', 'state'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get companies with pagination and filters
     */
    static async getCompanies(params: FindCompaniesParams = {}): Promise<PaginatedResponse<ICompany> | null> {
        const queryString = BaseServiceHelper.buildQueryString(params, this.SERVICE_CONFIG);
        const url = `${this.BASE_URL}?${queryString}`;

        BaseServiceHelper.logRequest(this.SERVICE_CONFIG.serviceName, url, params);

        return BaseServiceHelper.handleApiRequest(
            this.SERVICE_CONFIG.serviceName,
            'fetching companies',
            () => fetchApi.get<PaginatedResponse<ICompany>>(url),
            params
        );
    }

    /**
     * Get company by ID
     */
    static async getCompanyById(id: string | number): Promise<ICompany | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching company by ID',
            async () => {
                const response = await fetchApi.get<{ data: ICompany }>(`${this.BASE_URL}/${id}`);
                return response.data;
            }
        );
    }

    /**
     * Get company by document ID
     */
    static async getCompanyByDocumentId(documentId: string): Promise<ICompany | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching company by document ID',
            async () => {
                const response = await fetchApi.get<PaginatedResponse<ICompany>>(
                    `${this.BASE_URL}?filters[documentId][$eq]=${documentId}`
                );
                return response.data?.[0] || null;
            }
        );
    }

    /**
     * Get company by external ID
     */
    static async getCompanyByExternalId(externalId: string): Promise<ICompany | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching company by external ID',
            async () => {
                const response = await fetchApi.get<PaginatedResponse<ICompany>>(
                    `${this.BASE_URL}?filters[externalId][$eq]=${externalId}`
                );
                return response.data?.[0] || null;
            }
        );
    }

    /**
     * Create new company
     */
    static async createCompany(companyData: CreateCompanyData): Promise<ICompany | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'creating company',
            async () => {
                // Validate data before sending
                const validatedData = validateCreateCompanyData(companyData);

                const response = await fetchApi.post<{ data: ICompany }>(
                    this.BASE_URL,
                    { data: validatedData }
                );
                return response.data;
            }
        );
    }

    /**
     * Update company by ID
     */
    static async updateCompany(id: string | number, data: UpdateCompanyData): Promise<ICompany | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'updating company',
            async () => {
                // Validate data before sending
                const validatedData = validateUpdateCompanyData(data);

                const response = await fetchApi.put<{ data: ICompany }>(
                    `${this.BASE_URL}/${id}`,
                    { data: validatedData }
                );
                return response.data;
            }
        );
    }

    /**
     * Delete company by ID
     */
    static async deleteCompany(id: string | number): Promise<boolean> {
        const result = await BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'deleting company',
            async () => {
                await fetchApi.delete(`${this.BASE_URL}/${id}`);
                return true;
            }
        );
        return result ?? false;
    }

    /**
     * Get companies by subscription plan
     */
    static async getCompaniesBySubscriptionPlan(
        plan: SubscriptionPlan,
        params: Omit<FindCompaniesParams, 'subscriptionPlan'> = {}
    ): Promise<PaginatedResponse<ICompany> | null> {
        const filters = {
            ...params.filters,
            subscriptionPlan: { $eq: plan }
        };
        return this.getCompanies({ ...params, filters });
    }

    /**
     * Get companies by subscription status
     */
    static async getCompaniesBySubscriptionStatus(
        status: SubscriptionStatus,
        params: Omit<FindCompaniesParams, 'subscriptionStatus'> = {}
    ): Promise<PaginatedResponse<ICompany> | null> {
        const filters = {
            ...params.filters,
            subscriptionStatus: { $eq: status }
        };
        return this.getCompanies({ ...params, filters });
    }

    /**
     * Get companies by onboarding status
     */
    static async getCompaniesByOnboardingStatus(
        completed: boolean,
        params: Omit<FindCompaniesParams, 'onboardingCompleted'> = {}
    ): Promise<PaginatedResponse<ICompany> | null> {
        const filters = {
            ...params.filters,
            onboardingCompleted: { $eq: completed }
        };
        return this.getCompanies({ ...params, filters });
    }

    /**
     * Search companies with advanced filters
     */
    static async searchCompanies(
        searchTerm: string,
        filters: Partial<FindCompaniesParams> = {}
    ): Promise<PaginatedResponse<ICompany> | null> {
        const searchFilters = BaseServiceHelper.buildSearchFilters(
            searchTerm,
            this.SERVICE_CONFIG.searchFields || []
        );
        return this.getCompanies({
            ...filters,
            filters: { ...filters.filters, ...searchFilters }
        });
    }

    /**
     * Get companies with populated users
     */
    static async getCompaniesWithUsers(params: FindCompaniesParams = {}): Promise<PaginatedResponse<ICompany> | null> {
        const populateParams = {
            ...params,
            populate: {
                users_permissions_users: {
                    fields: ['id', 'username', 'email', 'confirmed', 'blocked'],
                    populate: {
                        role: {
                            fields: ['name', 'type']
                        }
                    }
                }
            }
        };
        return this.getCompanies(populateParams);
    }

    /**
     * Update company onboarding status
     */
    static async completeOnboarding(id: string | number): Promise<ICompany | null> {
        return this.updateCompany(id, {
            onboardingCompleted: true,
            onboardingDate: new Date().toISOString()
        });
    }

    /**
     * Update subscription plan
     */
    static async updateSubscriptionPlan(
        id: string | number,
        plan: SubscriptionPlan,
        seatsLimit?: number
    ): Promise<ICompany | null> {
        const updateData: UpdateCompanyData = {
            subscriptionPlan: plan,
            subscriptionStatus: 'active'
        };

        if (seatsLimit !== undefined) {
            updateData.seatsLimit = seatsLimit;
        }

        return this.updateCompany(id, updateData);
    }

    /**
     * Update subscription status
     */
    static async updateSubscriptionStatus(
        id: string | number,
        status: SubscriptionStatus
    ): Promise<ICompany | null> {
        return this.updateCompany(id, { subscriptionStatus: status });
    }

    /**
     * Validate company data
     */
    static validateCompanyData(company: unknown): boolean {
        try {
            validateCompany(company);
            return true;
        } catch (error) {
            console.error('[CompanyService] Error validating company data:', error);
            return false;
        }
    }

    /**
     * Type guard helper
     */
    static isValidCompany(obj: any): obj is ICompany {
        return isCompany(obj);
    }

    /**
     * Get company statistics
     */
    static async getCompanyStats(): Promise<{
        total: number;
        byPlan: Record<string, number>;
        byStatus: Record<string, number>;
        onboardingCompleted: number;
        onboardingPending: number;
    } | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching company statistics',
            async () => {
                // Get all companies with minimal data for statistics
                const allCompanies = await this.getCompanies({
                    pageSize: 1000,
                    fields: ['subscriptionPlan', 'subscriptionStatus', 'onboardingCompleted']
                });

                if (!allCompanies?.data) return null;

                const companies = allCompanies.data;
                const byPlan: Record<string, number> = {};
                const byStatus: Record<string, number> = {};
                let onboardingCompleted = 0;

                companies.forEach(company => {
                    // Count by plan
                    if (company.subscriptionPlan) {
                        byPlan[company.subscriptionPlan] = (byPlan[company.subscriptionPlan] || 0) + 1;
                    }

                    // Count by status
                    if (company.subscriptionStatus) {
                        byStatus[company.subscriptionStatus] = (byStatus[company.subscriptionStatus] || 0) + 1;
                    }

                    // Count onboarding
                    if (company.onboardingCompleted) {
                        onboardingCompleted++;
                    }
                });

                return {
                    total: companies.length,
                    byPlan,
                    byStatus,
                    onboardingCompleted,
                    onboardingPending: companies.length - onboardingCompleted
                };
            }
        );
    }
}