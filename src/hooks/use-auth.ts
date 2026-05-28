import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/services/auth-api';
import { IUser } from '@/types/users.types';
import { getCurrentUserAction } from '@/app/actions/users.actions';
import { normalizeRole, routeForRole } from '@/lib/auth/role-model';
import { useAuthStore } from '@/store/auth.store';

type ClientSession = {
    user?: any;
    expires?: string;
} | null;

export function useAuth() {
    const [session, setSession] = useState<ClientSession>(null);
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
    const router = useRouter();
    const { setUserProfile, clearUserProfile } = useAuthStore();

    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';
    const user = session?.user;

    const loadSession = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/session', {
                credentials: 'same-origin',
                cache: 'no-store',
            });

            if (!response.ok) {
                setSession(null);
                setStatus('unauthenticated');
                return null;
            }

            const nextSession = await response.json();
            const hasUser = !!nextSession?.user;

            setSession(hasUser ? nextSession : null);
            setStatus(hasUser ? 'authenticated' : 'unauthenticated');
            return hasUser ? nextSession : null;
        } catch {
            setSession(null);
            setStatus('unauthenticated');
            return null;
        }
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
        if (normalizeRole(userData.role?.name || userData.role) !== 'candidate') {
            return true;
        }

        // For candidates, check if equality monitoring is completed
        return userData.equalityMonitoring?.completed === true;
    };

    // Helper function to route user after login based on role and profile
    const routeAfterLogin = (userData?: any) => {
        console.log('🔄 Routing user after login:', userData);

        // Get role name - handle both Strapi direct response and NextAuth session formats
        const userRole = normalizeRole(userData?.role?.name || userData?.role || 'candidate');

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

        console.log('📋 Candidate user detected, checking equality monitoring state:', userData?.equalityMonitoring);

        // Candidate users: check if they want to complete optional form
        const hasCompletedEqualityMonitoring = userData?.equalityMonitoring?.completed === true;

        if (hasCompletedEqualityMonitoring) {
            console.log('✅ Candidate with completed profile, redirecting to /candidate-dashboard/my-assessments');
            router.push('/candidate-dashboard/my-assessments');
        } else {
            console.log('📋 Candidate without equality monitoring, offering optional form');
            // Show optional equality monitoring form with skip option
            router.push('/auth/equality-monitoring?optional=true');
        }
    };

    const waitForSession = async (attempts = 12, delayMs = 120) => {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const freshSession = await loadSession();
            if (freshSession?.user) {
                return freshSession;
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return null;
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email,
                    password,
                    callbackUrl: routeForRole(undefined),
                }),
                credentials: 'same-origin',
            });

            if (response.redirected && !response.url.includes('/auth/login')) {
                console.log('✅ SignIn successful, getting user data for routing...');

                const freshSession = await waitForSession();

                // Get fresh user data directly from Strapi for routing decisions
                try {
                    const result = await getCurrentUserAction();
                    const userData = result.success ? result.data : null;
                    console.log('📋 Fresh user data for routing:', userData);

                    if (userData) {
                        const resolvedUserData = userData.role
                            ? userData
                            : {
                                ...userData,
                                role: freshSession?.user?.role || session?.user?.role || 'candidate',
                            };
                        // Persist profile in Zustand store
                        setUserProfile(resolvedUserData as IUser);
                        // Route based on fresh user data
                        routeAfterLogin(resolvedUserData);
                    } else if (freshSession?.user) {
                        console.warn('⚠️ Profile lookup returned null, routing from session');
                        routeAfterLogin(freshSession.user);
                    } else {
                        routeByRole(session?.user?.role);
                    }
                } catch (profileError) {
                    console.warn('⚠️ Could not get fresh profile, falling back to session', profileError);
                    // Fallback: use freshly loaded session data if available
                    if (freshSession?.user) {
                        routeAfterLogin(freshSession.user);
                    } else if (session?.user) {
                        routeAfterLogin(session.user);
                    } else {
                        routeByRole();
                    }
                }

                return { success: true };
            }

            throw new Error('Authentication failed: wrong user or password');
        } catch (error) {
            console.error('Login error:', error);
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
            const redirectTo = result?.data?.redirectTo || routeForRole(registeredUser?.role);

            if (!registeredUser) {
                throw new Error('Registration failed - invalid response from server');
            }

            setUserProfile(registeredUser as IUser);
            await loadSession();
            router.push(redirectTo);

            return { success: true, user: registeredUser };
        } catch (error: any) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            clearUserProfile();
            setSession(null);
            setStatus('unauthenticated');

            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin',
            });

            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateProfile = async (updateData: Partial<IUser>) => {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Profile update failed');
            }

            const updatedUser = await response.json();
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
