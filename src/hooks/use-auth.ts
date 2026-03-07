import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/services/auth-api';
import { IUser } from '@/types/users.types';
import UsersService from '@/services/users-simple.service';

export function useAuth() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';
    const user = session?.user;

    // Public helper function to route users based on their role
    const routeByRole = (userRole?: string) => {
        switch (userRole) {
            case 'Candidate':
            case 'candidate':
                router.push('/dashboard');
                return;
            case 'Recruiter':
            case 'recruiter':
                router.push('/recruiter-dashboard');
                return;
            case 'admin':
            case 'Admin':
                router.push('/admin');
                return;
        }
    };

    // Helper function to check if user profile is complete
    const isProfileComplete = (userData?: any) => {
        if (!userData) return false;

        // For non-candidates, profile is always considered complete
        if (userData.role !== 'Candidate' && userData.role?.name !== 'Candidate') {
            return true;
        }

        // For candidates, check if equality monitoring is completed
        return userData.equalityMonitoring?.completed === true;
    };

    // Helper function to route user after login based on role and profile
    const routeAfterLogin = (userData?: any) => {
        console.log('🔄 Routing user after login:', userData);

        // Get role name - handle both Strapi direct response and NextAuth session formats
        const userRole = userData?.role?.name || userData?.role || 'Candidate';

        console.log('🎯 Determined user role:', userRole);

        // Admin users go directly to admin panel
        if (userRole === 'admin' || userRole === 'Admin') {
            console.log('👤 Admin user, redirecting to /admin');
            router.push('/admin');
            return;
        }

        // Non-candidate users go to dashboard
        if (userRole !== 'Candidate') {
            console.log('👤 Non-candidate user, redirecting to /dashboard');
            router.push('/dashboard');
            return;
        }

        console.log('📋 Candidate user detected, checking equality monitoring state:', userData?.equalityMonitoring);

        // Candidate users: check if they want to complete optional form
        const hasCompletedEqualityMonitoring = userData?.equalityMonitoring?.completed === true;

        if (hasCompletedEqualityMonitoring) {
            console.log('✅ Candidate with completed profile, redirecting to /dashboard');
            router.push('/dashboard');
        } else {
            console.log('📋 Candidate without equality monitoring, offering optional form');
            // Show optional equality monitoring form with skip option
            router.push('/auth/equality-monitoring?optional=true');
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                console.log('❌ SignIn error:', result.error);
                throw new Error(`Authentication failed: wrong user or password`);
            }

            if (result?.ok) {
                console.log('✅ SignIn successful, getting user data for routing...');

                // Get fresh user data directly from Strapi for routing decisions
                try {
                    const userData = await UsersService.getCurrentUser();
                    console.log('📋 Fresh user data for routing:', userData);

                    // Route based on fresh user data
                    routeAfterLogin(userData);
                } catch (profileError) {
                    console.warn('⚠️ Could not get fresh profile, falling back to session', profileError);
                    // Fallback: use session data with small delay
                    setTimeout(() => {
                        if (session?.user) {
                            routeAfterLogin(session.user);
                        } else {
                            router.push('/dashboard');
                        }
                    }, 500);
                }

                return { success: true };
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
            // Clear local storage
            AuthAPI.logout();

            // Sign out from NextAuth
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
            // Note: NextAuth session won't automatically update
            // You might need to call update() from useSession if needed
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