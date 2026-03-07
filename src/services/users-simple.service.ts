import fetchApi from "@/lib/fetch-client";
import { PaginatedResponse, FindUsersParams, CreateUserData, UserUpdateData, IPublicUser, UserStats, IProgresStatus } from "@/types";
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

/**
 * Simplified Users Service for Server Actions
 * Direct integration with fetch-client without unnecessary abstraction layers
 */
export default class UsersService {

    private static readonly BASE_URL = '/users';
    private static readonly ROLES_URL = '/users-permissions/roles';
    private static readonly STATS_URL = '/users-permissions/users/stats';
    private static readonly ME_URL = '/users/me';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'UsersService',
        searchFields: ['username', 'email', 'firstName', 'lastName'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get current authenticated user
     */
    static async getCurrentUser(): Promise<IPublicUser | null> {
        try {
            const response = await fetchApi.get<IPublicUser>(
                `${this.ME_URL}?populate[0]=role&populate[1]=assessments`
            );
            return response;
        } catch (error) {
            console.error('[UsersService] Error fetching current user:', error);
            return null;
        }
    }

    /**
     * Get users with pagination and filters
     */
    static async getUsers(params: FindUsersParams = {}): Promise<PaginatedResponse<IPublicUser> | null> {
        try {
            const queryString = this.buildQueryString(params);
            const url = `${this.BASE_URL}?${queryString}`;

            if (process.env.NODE_ENV === 'development') {
                console.log('[UsersService] Making request to:', url);
                console.log('[UsersService] Request params:', params);
            }

            const response = await fetchApi.get<PaginatedResponse<IPublicUser>>(url);

            if (process.env.NODE_ENV === 'development') {
                console.log('[UsersService] Response received:', {
                    dataCount: response?.data?.length || 0,
                    totalFromMeta: response?.meta?.pagination?.total || 0
                });
            }

            return response;
        } catch (error: any) {
            console.error('[UsersService] Error fetching users:', error);

            // Log more details for debugging only in development
            if (process.env.NODE_ENV === 'development') {
                console.error('[UsersService] Request failed with params:', params);
            }

            return null;
        }
    }

    /**
     * Get candidates (users with 'Candidate' role) - optimized method
     */
    static async getCandidates(params: Omit<FindUsersParams, 'filters'> & {
        search?: string;
        organization?: string;
        progresStatus?: IProgresStatus;
    } = {}): Promise<PaginatedResponse<IPublicUser> | null> {
        try {
            const { search, organization, progresStatus, ...restParams } = params;

            const roles = await this.getRoles();
            const candidateRole = roles?.find(r => r.name === 'Candidate');

            // Build filters object
            const filters: any = {
                role: {
                    id: Number.parseInt(candidateRole?.id || '0')
                }
            };

            // Add search filter if provided
            if (search?.trim()) {
                const searchTerm = search.trim();
                filters.$or = [
                    { username: { $containsi: searchTerm } },
                    { email: { $containsi: searchTerm } },
                    { firstName: { $containsi: searchTerm } },
                    { lastName: { $containsi: searchTerm } }
                ];
            }

            // Add organization filter if provided
            if (organization && organization !== 'all') {
                filters.organization = { $eq: organization };
            }

            // Add progress status filter if provided
            if (progresStatus) {
                filters.progresStatus = { $eq: progresStatus };
            }

            // Always add role filter for candidates
            const candidateParams: FindUsersParams = {
                ...restParams,
                filters
            };

            return this.getUsers(candidateParams);
        } catch (error) {
            console.error('[UsersService] Error fetching candidates:', error);
            return null;
        }
    }    /**
     * Get user by ID
     */
    static async getUserById(id: string | number): Promise<IPublicUser | null> {
        try {
            const response = await fetchApi.get<{ data: IPublicUser }>(
                `${this.BASE_URL}/${id}?populate[0]=role&populate[1]=assessments`
            );
            return response.data;
        } catch (error) {
            console.error('[UsersService] Error fetching user by ID:', error);
            return null;
        }
    }

    /**
     * Get user by email
     */
    static async getUserByEmail(email: string): Promise<IPublicUser | null> {
        try {
            const response = await fetchApi.get<PaginatedResponse<IPublicUser>>(
                `${this.BASE_URL}?filters[email][$eq]=${encodeURIComponent(email)}&populate[0]=role&populate[1]=assessments`
            );

            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            console.error('[UsersService] Error fetching user by email:', error);
            return null;
        }
    }

    /**
     * Create new user
     */
    static async createUser(userData: CreateUserData): Promise<IPublicUser | null> {
        try {
            const response = await fetchApi.post<{ data: IPublicUser }>(
                this.BASE_URL,
                userData
            );
            return response.data;
        } catch (error) {
            console.error('[UsersService] Error creating user:', error);
            return null;
        }
    }

    /**
     * Update user by ID
     */
    static async updateUser(id: string | number, data: UserUpdateData): Promise<IPublicUser | null> {
        try {
            const response = await fetchApi.put<{ data: IPublicUser }>(
                `${this.BASE_URL}/${id}`,
                data
            );
            return response.data;
        } catch (error) {
            console.error('[UsersService] Error updating user:', error);
            return null;
        }
    }

    /**
     * Update current user
     */
    static async updateCurrentUser(data: UserUpdateData): Promise<IPublicUser | null> {
        try {
            const response = await fetchApi.put<IPublicUser>(
                this.ME_URL,
                data
            );
            return response;
        } catch (error) {
            console.error('[UsersService] Error updating current user:', error);
            return null;
        }
    }

    /**
     * Delete user by ID
     */
    static async deleteUser(id: string | number): Promise<boolean> {
        try {
            await fetchApi.delete(`${this.BASE_URL}/${id}`);
            return true;
        } catch (error) {
            console.error('[UsersService] Error deleting user:', error);
            return false;
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats(): Promise<UserStats | null> {
        try {
            const response = await fetchApi.get<{ data: UserStats }>(this.STATS_URL);
            return response.data;
        } catch (error) {
            console.error('[UsersService] Error fetching user stats:', error);
            return null;
        }
    }

    /**
     * Get all roles
     */
    static async getRoles(): Promise<any[] | null> {
        try {
            const response = await fetchApi.get<{ roles: any[] } | any[]>(this.ROLES_URL);

            // Handle both response formats
            if (response && typeof response === 'object' && 'roles' in response) {
                return response.roles;
            }

            if (Array.isArray(response)) {
                return response;
            }

            return null;
        } catch (error) {
            console.error('[UsersService] Error fetching roles:', error);
            return null;
        }
    }

    /**
     * Search users with advanced filters
     */
    static async searchUsers(searchTerm: string, filters: Partial<FindUsersParams> = {}): Promise<PaginatedResponse<IPublicUser> | null> {
        try {
            const params: FindUsersParams = {
                ...filters,
                search: searchTerm
            };

            return await this.getUsers(params);
        } catch (error) {
            console.error('[UsersService] Error searching users:', error);
            return null;
        }
    }

    /**
     * Check if user has completed privacy terms
     */
    static async checkPrivacyTermsCompletion(): Promise<boolean> {
        try {
            const user = await this.getCurrentUser();
            return !!(user?.agreeToDataPrivacyPolicy);
        } catch (error) {
            console.error('[UsersService] Error checking privacy terms:', error);
            return false;
        }
    }

    /**
     * Check if user has completed equality monitoring
     */
    static async checkEqualityMonitoringCompletion(): Promise<boolean> {
        try {
            const user = await this.getCurrentUser();
            return !!(user?.equalityMonitoring?.completed);
        } catch (error) {
            console.error('[UsersService] Error checking equality monitoring:', error);
            return false;
        }
    }

    /**
     * Get user completion status
     */
    static async getCompletionStatus(): Promise<{
        hasCompletedEqualityMonitoring: boolean;
    }> {
        const hasCompletedEqualityMonitoring = await this.checkEqualityMonitoringCompletion()

        return {
            hasCompletedEqualityMonitoring
        };
    }

    /**
     * Private helper method to build query string from parameters - Simplified version
     */
    private static buildQueryString(params: FindUsersParams): string {
        const searchParams = new URLSearchParams();

        // Add pagination
        this.addPaginationParams(searchParams, params);

        // Add populate fields
        this.addPopulateParams(searchParams, params);

        // Add filters (complex or simple)
        this.addFilterParams(searchParams, params);

        // Add sorting
        this.addSortingParams(searchParams, params);

        if (process.env.NODE_ENV === 'development') {
            console.log('[UsersService] Built query string:', searchParams.toString());
        }

        return searchParams.toString();
    }

    /**
     * Add pagination parameters
     */
    private static addPaginationParams(searchParams: URLSearchParams, params: FindUsersParams): void {
        if (params.page) {
            searchParams.append('pagination[page]', params.page.toString());
        }
        if (params.pageSize) {
            searchParams.append('pagination[pageSize]', params.pageSize.toString());
        }
    }

    /**
     * Add populate parameters
     */
    private static addPopulateParams(searchParams: URLSearchParams, params: FindUsersParams): void {
        const populateFields = new Set(['role', 'assessments']);

        if (params.populate && typeof params.populate === 'object') {
            Object.entries(params.populate).forEach(([key, value]) => {
                if (value === '*') {
                    populateFields.add(key);
                }
            });
        }

        Array.from(populateFields).forEach((field, index) => {
            searchParams.append(`populate[${index}]`, field);
        });
    }

    /**
     * Add filter parameters
     */
    private static addFilterParams(searchParams: URLSearchParams, params: FindUsersParams): void {
        if (params.filters && typeof params.filters === 'object') {
            BaseServiceHelper.buildFiltersFromObject(searchParams, params.filters);
        } else {
            this.addSimpleFilters(searchParams, params);
        }
    }

    /**
     * Add simple filters for backward compatibility
     */
    private static addSimpleFilters(searchParams: URLSearchParams, params: FindUsersParams): void {
        this.addSearchFilter(searchParams, params.search);
        this.addRoleFilter(searchParams, params.role?.toString());
        this.addOrganizationFilter(searchParams, params.organization);
        this.addStatusFilter(searchParams, params.status);
    }

    /**
     * Add search filter
     */
    private static addSearchFilter(searchParams: URLSearchParams, search?: string): void {
        if (!search) return;

        const searchTerm = encodeURIComponent(search);
        const searchFields = ['username', 'email', 'firstName', 'lastName'];

        searchFields.forEach((field, index) => {
            searchParams.append(`filters[$or][${index}][${field}][$containsi]`, searchTerm);
        });
    }

    /**
     * Add role filter
     */
    private static addRoleFilter(searchParams: URLSearchParams, role?: string): void {
        if (role) {
            searchParams.append('filters[role][id][$eq]', role.toString());
        }
    }

    /**
     * Add organization filter
     */
    private static addOrganizationFilter(searchParams: URLSearchParams, organization?: string): void {
        if (organization) {
            searchParams.append('filters[organization][$containsi]', encodeURIComponent(organization));
        }
    }

    /**
     * Add status filter
     */
    private static addStatusFilter(searchParams: URLSearchParams, status?: string): void {
        if (!status) return;

        switch (status) {
            case 'active':
                searchParams.append('filters[blocked][$eq]', 'false');
                searchParams.append('filters[confirmed][$eq]', 'true');
                break;
            case 'blocked':
                searchParams.append('filters[blocked][$eq]', 'true');
                break;
            case 'unconfirmed':
                searchParams.append('filters[confirmed][$eq]', 'false');
                break;
        }
    }

    /**
     * Add sorting parameters
     */
    private static addSortingParams(searchParams: URLSearchParams, params: FindUsersParams): void {
        if (params.sort) {
            if (Array.isArray(params.sort)) {
                params.sort.forEach((sortField, index) => {
                    searchParams.append(`sort[${index}]`, sortField);
                });
            } else {
                searchParams.append('sort[0]', params.sort);
            }
        } else {
            searchParams.append('sort[0]', 'createdAt:desc');
        }
    }
}
