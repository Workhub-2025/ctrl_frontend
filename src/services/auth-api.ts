import { fetchApi } from '@/lib/fetch-client';
import { IUser, StrapiAuthResponse, LoginUserData } from '@/types/users.types';
import { IRole } from '@/types/role.types';

const normalizeApiBaseUrl = (value: string | undefined, fallback: string) => {
    const trimmed = value?.trim() || fallback;
    const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

    return withoutTrailingSlash.endsWith('/api')
        ? withoutTrailingSlash
        : `${withoutTrailingSlash}/api`;
};

const getServerStrapiBaseUrl = () =>
    normalizeApiBaseUrl(
        process.env.STRAPI_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL,
        'http://strapi:1337/api'
    );

const getServerApiToken = () =>
    process.env.STRAPI_API_FULL_ACCESS_TOKEN ||
    process.env.STRAPI_API_FULL_ACCCESS_TOKEN ||
    process.env.STRAPI_API_TOKEN ||
    undefined;

const hasRole = (user: StrapiAuthResponse['user'] | undefined) =>
    Boolean(user?.role && typeof user.role === 'object');

async function fetchUserWithRoleFromServer(userId: string | number) {
    if (typeof window !== 'undefined') return null;

    const token = getServerApiToken();
    if (!token) return null;

    const response = await fetch(
        `${getServerStrapiBaseUrl()}/users/${encodeURIComponent(String(userId))}?populate=role`,
        {
            cache: 'no-store',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) return null;
    return response.json() as Promise<StrapiAuthResponse['user']>;
}

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
                '/access-code/register',
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
        try {
            const response = await fetchApi.post<StrapiAuthResponse>(
                '/auth/local',
                credentials
            );

            if (!response.jwt || !response.user) {
                throw new Error('Invalid Strapi auth response');
            }

            if (hasRole(response.user)) {
                return response;
            }

            // Fallback when backend role populate is unavailable (older Strapi builds).
            const userResponse = await fetchApi.get<StrapiAuthResponse['user']>('/users/me?populate=role', {
                headers: {
                    Authorization: `Bearer ${response.jwt}`,
                },
            });

            const serverRoleUser = hasRole(userResponse)
                ? null
                : await fetchUserWithRoleFromServer(userResponse.id ?? response.user?.id);

            return {
                jwt: response.jwt,
                user: {
                    ...userResponse,
                    ...(serverRoleUser ?? {}),
                    role: serverRoleUser?.role ?? userResponse.role,
                },
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            throw new Error(errorMessage);
        }
    }

    /**
     * Request password reset
     */
    static async forgotPassword(email: string): Promise<{ ok: boolean }> {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const endpoint =
                typeof window === 'undefined'
                    ? `${getServerStrapiBaseUrl()}/auth/forgot-password`
                    : '/api/auth/forgot-password';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail }),
                cache: 'no-store',
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error((body as { error?: string }).error || 'Password reset request failed');
            }

            return { ok: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
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
    ): Promise<{ ok: boolean }> {
        try {
            const endpoint =
                typeof window === 'undefined'
                    ? `${getServerStrapiBaseUrl()}/auth/reset-password`
                    : '/api/auth/reset-password';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, password, passwordConfirmation }),
                cache: 'no-store',
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error((body as { error?: string }).error || 'Password reset failed');
            }

            return { ok: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            throw new Error(errorMessage);
        }
    }

    /**
     * Logout user (session termination is managed by NextAuth signOut)
     */
    static logout(): void {
        // Intentionally no-op: we no longer store Strapi JWT in localStorage.
    }

    /**
     * Legacy helper: checks whether a NextAuth session cookie exists.
     */
    static isAuthenticated(): boolean {
        if (typeof document === 'undefined') return false;
        return /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(document.cookie);
    }

    /**
     * JWT is httpOnly in session strategy; no direct client token access is exposed.
     */
    static getToken(): string | null {
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
