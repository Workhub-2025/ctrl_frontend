import { fetchApi } from '@/lib/fetch-client';
import { IUser, StrapiAuthResponse, LoginUserData } from '@/types/users.types';
import { IRole } from '@/types/role.types';

export class AuthAPI {
    /**
     * Register a new user
     */
    static async register(userData: Partial<IUser>): Promise<StrapiAuthResponse> {
        try {
            console.log('🚀 AuthAPI.register called with data:', {
                ...userData,
                password: userData.password ? '[HIDDEN]' : 'NOT SET',
                roleId: userData.role,
                fieldsCount: Object.keys(userData).length
            });

            const response = await fetchApi.post<StrapiAuthResponse>(
                '/auth/local/register',
                userData
            );

            console.log('✅ Strapi registration response:', {
                success: !!response,
                hasJWT: !!response.jwt,
                hasUser: !!response.user,
                userId: response.user?.id,
                userEmail: response.user?.email,
                userRole: response.user?.role,
                jwtPreview: response.jwt ? `${response.jwt.substring(0, 20)}...` : 'NO JWT'
            });

            return response;
        } catch (error: any) {
            console.error('❌ AuthAPI.register failed:', {
                message: error.message,
                status: error.status,
                stack: error.stack
            });
            const errorMessage = error.message || 'Registration failed';
            throw new Error(errorMessage);
        }
    }

    /**
     * Login user (for direct API usage, not NextAuth)
     */
    static async login(credentials: LoginUserData): Promise<StrapiAuthResponse> {
        console.log('🚀 AuthAPI.login called with:', { identifier: credentials.identifier });

        try {
            console.log('📡 Making POST request to /auth/local...');
            const response = await fetchApi.post<StrapiAuthResponse>(
                '/auth/local',
                credentials
            );

            console.log('✅ Strapi response received successfully');
            console.log('🔍 Initial auth response:', {
                hasJWT: !!response.jwt,
                hasUser: !!response.user,
                userEmail: response.user?.email,
                initialRole: response.user?.role
            });

            // Step 2: Get complete user data with populated role (CountTV pattern)
            if (response.jwt) {
                console.log('🔄 Fetching complete user data with populated role...');

                try {
                    const userResponse = await fetchApi.get<StrapiAuthResponse['user']>('/users/me?populate=role', {
                        headers: {
                            'Authorization': `Bearer ${response.jwt}`
                        }
                    });

                    console.log('✅ Complete user data retrieved:', {
                        userEmail: userResponse.email,
                        roleName: typeof userResponse.role === 'object' && userResponse.role !== null ? userResponse.role.name : 'Candidate',
                        roleId: typeof userResponse.role === 'object' && userResponse.role !== null ? userResponse.role.id : 4,
                        fullRole: userResponse.role
                    });

                    // Return enhanced response with complete user data
                    return {
                        jwt: response.jwt,
                        user: {
                            ...userResponse,
                            // Ensure role is properly structured
                            role: userResponse.role
                        }
                    };
                } catch (userError: any) {
                    console.error('❌ Error fetching complete user data:', userError.message);
                    // Fallback to original response if user data fetch fails
                    return response;
                }
            }

            return response;
        } catch (error: any) {
            console.error('❌ AuthAPI.login error details:', {
                message: error.message,
                stack: error.stack
            });
            const errorMessage = error.message || 'Login failed';
            throw new Error(errorMessage);
        }
    }

    /**
     * Request password reset
     */
    static async forgotPassword(email: string): Promise<{ ok: boolean }> {
        try {
            await fetchApi.post('/api/auth/forgot-password', { email });
            return { ok: true };
        } catch (error: any) {
            const errorMessage = error.message || 'Password reset request failed';
            throw new Error(errorMessage);
        }
    }

    /**
     * Reset password with code (for direct API usage)
     */
    static async resetPassword(
        code: string,
        password: string,
        passwordConfirmation: string
    ): Promise<StrapiAuthResponse> {
        try {
            const response = await fetchApi.post<StrapiAuthResponse>(
                '/api/auth/reset-password',
                {
                    code,
                    password,
                    passwordConfirmation,
                }
            );

            // Don't automatically store JWT - let the calling code decide
            return response;
        } catch (error: any) {
            const errorMessage = error.message || 'Password reset failed';
            throw new Error(errorMessage);
        }
    }

    /**
     * Logout user (clear local storage)
     */
    static logout(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('strapi-jwt');
        }
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated(): boolean {
        if (typeof window !== 'undefined') {
            return !!localStorage.getItem('strapi-jwt');
        }
        return false;
    }

    /**
     * Get stored JWT token
     */
    static getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('strapi-jwt');
        }
        return null;
    }

    /**
     * Get all roles (for admin functionality)
     */
    static async getRoles(): Promise<IRole[]> {
        try {
            const response = await fetchApi.get<{ roles: IRole[] } | IRole[]>('/users-permissions/roles');

            // Handle both response formats: {roles: Array} or direct Array
            if (response && typeof response === 'object' && 'roles' in response) {
                return response.roles;
            }

            // If it's already an array, return it directly
            if (Array.isArray(response)) {
                return response;
            }

            throw new Error('Unexpected response format from roles API');
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to fetch roles';
            throw new Error(errorMessage);
        }
    }

    /**
     * Get role by ID
     */
    static async getRoleById(roleId: number): Promise<IRole> {
        try {
            const response = await fetchApi.get<IRole>(`/users-permissions/roles/${roleId}`);
            return response;
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to fetch role';
            throw new Error(errorMessage);
        }
    }

    /**
     * Update user role (admin only)
     */
    static async updateUserRole(userId: number, roleId: number): Promise<StrapiAuthResponse['user']> {
        try {
            const response = await fetchApi.put<StrapiAuthResponse['user']>(
                `/users/${userId}`,
                { role: roleId }
            );
            return response;
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to update user role';
            throw new Error(errorMessage);
        }
    }

}