import { fetchApi } from '@/lib/fetch-client';
import { IUser, StrapiAuthResponse, LoginUserData } from '@/types/users.types';
import { IRole } from '@/types/role.types';

export class AuthAPI {
    /**
     * Register a new user — browser must use POST /api/auth/register.
     */
    static async register(_userData: Partial<IUser>): Promise<StrapiAuthResponse> {
        throw new Error('Use POST /api/auth/register from the browser');
    }

    /**
     * Login user — browser must use POST /api/auth/login (debug page only).
     */
    static async login(credentials: LoginUserData): Promise<StrapiAuthResponse> {
        if (typeof window === 'undefined') {
            throw new Error('Use loginWithStrapiCredentials in server route handlers');
        }

        try {
            const response = await fetchApi.post<StrapiAuthResponse>(
                '/auth/local',
                credentials
            );

            if (!response.jwt || !response.user) {
                throw new Error('Invalid Strapi auth response');
            }

            return response;
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

            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail }),
                cache: 'no-store',
                signal: AbortSignal.timeout(15_000),
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
     * Reset password with code
     */
    static async resetPassword(
        code: string,
        password: string,
        passwordConfirmation: string
    ): Promise<{ ok: boolean }> {
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, password, passwordConfirmation }),
                cache: 'no-store',
                signal: AbortSignal.timeout(15_000),
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

            if (response && typeof response === 'object' && 'roles' in response) {
                return response.roles;
            }

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
