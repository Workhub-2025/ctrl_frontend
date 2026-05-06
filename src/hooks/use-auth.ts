import { useSession, signIn, signOut, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/services/auth-api';
import { IUser } from '@/types/users.types';
import { getCurrentUserAction } from '@/app/actions/users.actions';
import { normalizeRole, routeForRole } from '@/lib/auth/role-model';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { setUserProfile, clearUserProfile } = useAuthStore();

    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';
    const user = session?.user;

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
            console.log('✅ Candidate with completed profile, redirecting to /candidate-dashboard');
            router.push('/candidate-dashboard');
        } else {
            console.log('📋 Candidate without equality monitoring, offering optional form');
            // Show optional equality monitoring form with skip option
            router.push('/auth/equality-monitoring?optional=true');
        }
    };

    const waitForSession = async (attempts = 12, delayMs = 120) => {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const freshSession = await getSession();
            if (freshSession?.user) {
                return freshSession;
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return null;
    };

    const login = async (email: string, password: string) => {
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            // Check ok first: next-auth v4 + Next.js 15 can return error="undefined" (string)
            // even on successful login, so result?.ok is the reliable success signal.
            if (result?.ok) {
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

            // Handle real errors (exclude the spurious "undefined" string next-auth v4 sends
            // on success when running under Next.js 15).
            const errorCode = result?.error;
            if (errorCode && errorCode !== 'undefined') {
                console.log('❌ SignIn error:', errorCode);
                if (errorCode === 'LOCKED_OUT') {
                    throw new Error('Too many failed attempts. Please wait 15 minutes before trying again.');
                }
                if (errorCode === 'AUTH_SERVICE_UNAVAILABLE' || errorCode === 'Configuration') {
                    throw new Error('Authentication service is currently unavailable. Please try again shortly.');
                }
                if (errorCode === 'AccessDenied') {
                    throw new Error('Access denied for this account.');
                }
                throw new Error('Authentication failed: wrong user or password');
            }

            throw new Error(`Login failed - Status: ${result?.status || 'unknown'}`);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (userData: Partial<IUser>) => {
        try {
            console.log('🚀 Starting registration process...');

            // Use the custom AuthAPI for registration
            const response = await AuthAPI.register(userData);
            console.log('✅ Registration API response received:', { hasJWT: !!response.jwt, hasUser: !!response.user });

            if (response.user && response.jwt) {
                console.log('✅ Registration successful, redirecting to login for email confirmation...');

                // In QA/production environments, users need to confirm their email
                // before they can log in, so redirect to login page with success message
                router.push('/auth/login?message=Registration successful! Please check your email to confirm your account, then log in to continue.');
                return { success: true, user: response.user };
            }

            throw new Error('Registration failed - invalid response from server');
        } catch (error: any) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            clearUserProfile();
            await signOut({
                redirect: false,
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
