import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/services/auth-api';
import { IUser } from '@/types/users.types';
import { updateCurrentUserAction } from '@/app/actions/users.actions';
import { normalizeRole, routeForRole } from '@/lib/auth/role-model';
import { clearClientSessionCache, getClientSession, primeClientSession, type ClientAuthSession } from '@/lib/auth/client-session';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
    const [session, setSession] = useState<ClientAuthSession>(null);
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
    const router = useRouter();
    const { setUserProfile, clearUserProfile } = useAuthStore();

    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';
    const user = session?.user;

    const loadSession = useCallback(async (options?: { force?: boolean }) => {
        const nextSession = await getClientSession({ force: options?.force });
        const hasUser = !!nextSession?.user;

        setSession(hasUser ? nextSession : null);
        setStatus(hasUser ? 'authenticated' : 'unauthenticated');
        return hasUser ? nextSession : null;
    }, []);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    // Public helper function to route users based on their role
    const routeByRole = (userRole?: string) => {
        router.push(routeForRole(userRole));
    };

    // Helper function to check if user profile is complete
    const isProfileComplete = (userData?: any) => {
        if (!userData) return false;

        // For non-candidates, profile is always considered complete
        if (normalizeRole(userData.role) !== 'candidate') {
            return true;
        }

        // For candidates, check if equality monitoring is completed
        return !!userData.equalityMonitoring && Object.keys(userData.equalityMonitoring).length > 0;
    };

    // Helper function to route user after login based on role and profile
    const routeAfterLogin = (userData?: any) => {
        console.log('🔄 Routing user after login:', userData);

        // Get role name - handle both Strapi direct response and NextAuth session formats
        const userRole = normalizeRole(userData?.role || 'candidate');

        console.log('🎯 Determined user role:', userRole);

        // Admin users go directly to admin panel
        if (userRole === 'admin') {
            console.log('👤 Admin user, redirecting by role');
            routeByRole(userRole);
            return;
        }

        // Non-candidate users go by their role routing
        if (userRole !== 'candidate') {
            console.log('👤 Non-candidate user, redirecting by role');
            routeByRole(userRole);
            return;
        }

        console.log('👤 Candidate user, redirecting to dashboard');
        router.push('/candidate-dashboard/');
    };

    const login = async (email: string, password: string) => {
        try {
            clearUserProfile();
            clearClientSessionCache();
            setSession(null);
            setStatus('loading');

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: new URLSearchParams({
                    email,
                    password,
                }),
                credentials: 'same-origin',
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(
                        body.error ?? 'Too many login attempts. Please try again later.'
                    );
                }
                throw new Error(body.error ?? 'Authentication failed: wrong user or password');
            }

            const userData = body.data?.user;
            const redirectPath = body.data?.redirectPath as string | undefined;

            if (userData) {
                const nextSession: ClientAuthSession = {
                    user: userData,
                    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                };
                primeClientSession(nextSession);
                setSession(nextSession);
                setStatus('authenticated');
                setUserProfile(userData as IUser);
                routeAfterLogin(userData);
            } else if (redirectPath) {
                router.push(redirectPath);
            } else {
                const freshSession = await getClientSession({ force: true });
                if (freshSession?.user) {
                    setSession(freshSession);
                    setStatus('authenticated');
                    routeAfterLogin(freshSession.user);
                } else {
                    throw new Error('Authentication failed: wrong user or password');
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            setStatus('unauthenticated');
            throw error;
        }
    };

    const register = async (userData: Partial<IUser>) => {
        try {
            console.log('🚀 Starting registration process...');

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'same-origin',
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(result?.error || 'Registration failed');
            }

            const registeredUser = result?.data?.user;

            if (!registeredUser) {
                throw new Error('Registration failed - invalid response from server');
            }

            setUserProfile(registeredUser as IUser);
            await loadSession({ force: true });
            routeAfterLogin(registeredUser);

            return { success: true, user: registeredUser };
        } catch (error: any) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            clearUserProfile();
            clearClientSessionCache();
            setSession(null);
            setStatus('unauthenticated');

            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            router.replace('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateProfile = async (updateData: Partial<IUser>) => {
        try {
            const userId = user?.id || session?.user?.id;
            if (!userId) {
                throw new Error('User not authenticated');
            }

            // Bypass strict type checking to allow nullable fields mapped from Partial<IUser>
            const response = await updateCurrentUserAction(userId, updateData as any);

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Profile update failed');
            }

            const updatedUser = response.data;
            // Sync updated profile into Zustand store
            setUserProfile(updatedUser as IUser);
            return updatedUser;
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        }
    };

    return {
        // Session data
        user,
        isLoading,
        isAuthenticated,
        session,

        // Auth methods
        login,
        register,
        logout,
        updateProfile,
        routeByRole,
        routeAfterLogin,
        isProfileComplete,

        // Direct access to AuthAPI methods for advanced use cases
        forgotPassword: AuthAPI.forgotPassword,
        resetPassword: AuthAPI.resetPassword,
    };
}
