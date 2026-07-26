import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/services/auth-api';
import { IUser } from '@/types/users.types';
import { UserProfileService } from '@/services/user-profile.service';
import { isFirebaseAuthProvider } from '@/lib/auth/auth-provider';
import { normalizeRole, routeForRole } from '@/lib/auth/role-model';
import { clearClientSessionCache, getClientSession, primeClientSession, type ClientAuthSession } from '@/lib/auth/client-session';
import { useAuthStore } from '@/store/auth.store';
import {
    claimSessionAccessCodeWithCookie,
    completeFirebaseTotpLogin,
    loginWithFirebase,
    logoutFirebaseBrowserSession,
} from '@/lib/firebase-auth-browser';
import { readPendingSessionJoin } from '@/lib/pending-session-join';

const useFirebaseAuthentication = isFirebaseAuthProvider();

/** Same-origin relative path only — blocks open redirects via callbackUrl. */
function safeCallbackPathFromLocation(): string | null {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('callbackUrl');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
    return raw;
}

async function claimPendingJoinIfPresent(): Promise<string | null> {
    const pending = readPendingSessionJoin();
    if (!pending) return null;
    const claimed = await claimSessionAccessCodeWithCookie({
        accessCode: pending.accessCode,
        displayName: pending.displayName,
    });
    return claimed.redirectPath;
}

function provisioningRedirectForPendingJoin(redirectPath: string): string {
    const pending = readPendingSessionJoin();
    if (pending && redirectPath === '/auth/accept-invitation') {
        return '/join?verified=1';
    }
    return redirectPath;
}

export function useAuth() {
    const [session, setSession] = useState<ClientAuthSession>(null);
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
    const router = useRouter();
    const { setUserProfile, clearUserProfile, userProfile } = useAuthStore();

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
        const LOGIN_TIMEOUT_MS = 30_000;

        try {
            clearUserProfile();
            clearClientSessionCache();
            setSession(null);
            setStatus('loading');

            if (useFirebaseAuthentication) {
                const result = await loginWithFirebase(email, password);
                if (result.requiresTotp) {
                    setStatus('unauthenticated');
                    return { success: true, requiresTotp: true };
                }
                if (result.session.provisioningRequired) {
                    setStatus('unauthenticated');
                    if (result.session.redirectPath === '/auth/bootstrap') {
                        return {
                            success: true,
                            provisioningRequired: true,
                            bootstrapRequired: true,
                            bootstrapStatus: result.session.bootstrapStatus,
                            redirectPath: result.session.redirectPath,
                        };
                    }
                    const currentQuery = new URLSearchParams(window.location.search);
                    const invitationToken =
                        currentQuery.get('token') ?? currentQuery.get('invitation');
                    const destinationPath = provisioningRedirectForPendingJoin(
                        result.session.redirectPath,
                    );
                    const destination = new URL(destinationPath, window.location.origin);
                    if (destination.pathname === '/auth/accept-invitation' && invitationToken) {
                        destination.searchParams.set('token', invitationToken);
                    }
                    // Client navigation preserves Firebase's deliberately
                    // in-memory user while bootstrap/enrolment is completed.
                    router.push(`${destination.pathname}${destination.search}`);
                    return { success: true, provisioningRequired: true };
                }

                const firebaseUser = {
                    id: result.session.user.userId,
                    role: result.session.user.portalRole,
                    organization: result.session.user.organizationId,
                    authProvider: 'firebase',
                };
                const nextSession: ClientAuthSession = {
                    user: firebaseUser,
                    expires: result.session.expiresAt,
                };
                primeClientSession(nextSession);
                setSession(nextSession);
                setStatus('authenticated');
                if (result.session.user.portalRole === 'candidate') {
                    const claimedPath = await claimPendingJoinIfPresent().catch(() => null);
                    if (claimedPath) {
                        window.location.assign(claimedPath);
                        return { success: true };
                    }
                }
                router.push(safeCallbackPathFromLocation() ?? result.session.redirectPath);
                return { success: true };
            }

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
                signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(
                        body.error ?? 'Too many login attempts. Please try again later.'
                    );
                }
                if (response.status === 503) {
                    throw new Error(
                        body.error ??
                            'Authentication service is unavailable. Please try again shortly.'
                    );
                }
                throw new Error(body.error ?? 'Authentication failed: wrong user or password');
            }

            if (body.data?.requiresTotp) {
                // Keep session bootstrap idle — password step succeeded but session is not established yet.
                setStatus('unauthenticated');
                return {
                    success: true,
                    requiresTotp: true,
                    redirectPath: body.data?.redirectPath as string | undefined,
                };
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
                const destination =
                    safeCallbackPathFromLocation() ||
                    redirectPath ||
                    routeForRole(userData.role);
                // Hard navigation ensures middleware sees the new session cookie.
                window.location.assign(destination);
            } else if (redirectPath) {
                window.location.assign(safeCallbackPathFromLocation() || redirectPath);
            } else {
                const freshSession = await getClientSession({ force: true });
                if (freshSession?.user) {
                    setSession(freshSession);
                    setStatus('authenticated');
                    window.location.assign(routeForRole(freshSession.user.role));
                } else {
                    throw new Error('Authentication failed: wrong user or password');
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            setStatus('unauthenticated');
            if (
                error instanceof Error &&
                (error.name === 'TimeoutError' || error.name === 'AbortError')
            ) {
                throw new Error(
                    'Login timed out. Check your connection and try again.'
                );
            }
            throw error;
        }
    };

    const verifyTotpLogin = async (code: string) => {
        const VERIFY_TIMEOUT_MS = 30_000;

        try {
            setStatus('loading');
            if (useFirebaseAuthentication) {
                const result = await completeFirebaseTotpLogin(code);
                if (result.requiresTotp) {
                    throw new Error('Additional verification is required');
                }
                if (result.session.provisioningRequired) {
                    setStatus('unauthenticated');
                    if (result.session.redirectPath === '/auth/bootstrap') {
                        return {
                            success: true,
                            provisioningRequired: true,
                            bootstrapRequired: true,
                            bootstrapStatus: result.session.bootstrapStatus,
                            redirectPath: result.session.redirectPath,
                        };
                    }
                    const currentQuery = new URLSearchParams(window.location.search);
                    const invitationToken =
                        currentQuery.get('token') ?? currentQuery.get('invitation');
                    const destinationPath = provisioningRedirectForPendingJoin(
                        result.session.redirectPath,
                    );
                    const destination = new URL(destinationPath, window.location.origin);
                    if (destination.pathname === '/auth/accept-invitation' && invitationToken) {
                        destination.searchParams.set('token', invitationToken);
                    }
                    router.push(`${destination.pathname}${destination.search}`);
                    return { success: true, provisioningRequired: true };
                }
                const firebaseUser = {
                    id: result.session.user.userId,
                    role: result.session.user.portalRole,
                    organization: result.session.user.organizationId,
                    authProvider: 'firebase',
                };
                const nextSession: ClientAuthSession = {
                    user: firebaseUser,
                    expires: result.session.expiresAt,
                };
                primeClientSession(nextSession);
                setSession(nextSession);
                setStatus('authenticated');
                if (result.session.user.portalRole === 'candidate') {
                    const claimedPath = await claimPendingJoinIfPresent().catch(() => null);
                    if (claimedPath) {
                        window.location.assign(claimedPath);
                        return { success: true };
                    }
                }
                router.push(safeCallbackPathFromLocation() ?? result.session.redirectPath);
                return { success: true };
            }

            const response = await fetch('/api/auth/totp/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ code }),
                credentials: 'same-origin',
                signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(body.error ?? 'Too many verification attempts. Please try again later.');
                }
                throw new Error(body.error ?? 'Invalid verification code');
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
                const destination =
                    safeCallbackPathFromLocation() ||
                    redirectPath ||
                    routeForRole(userData.role);
                window.location.assign(destination);
            } else if (redirectPath) {
                window.location.assign(safeCallbackPathFromLocation() || redirectPath);
            } else {
                throw new Error('Verification succeeded but the session could not be established');
            }

            return { success: true };
        } catch (error) {
            setStatus('unauthenticated');
            throw error;
        }
    };

    const register = async (userData: Partial<IUser>) => {
        try {
            if (useFirebaseAuthentication) {
                throw new Error(
                    'Public registration is closed. Create an account from a verified invitation.'
                );
            }

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

            if (useFirebaseAuthentication) {
                await logoutFirebaseBrowserSession();
            }
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
            if (!user?.id && !session?.user?.id) {
                throw new Error('User not authenticated');
            }

            const updatedProfile = await UserProfileService.updateProfile(updateData);

            const mergedUser = {
                ...(userProfile ?? user ?? {}),
                ...updatedProfile,
            } as IUser;

            setUserProfile(mergedUser);

            if (session?.user) {
                const nextSession: ClientAuthSession = {
                    ...session,
                    user: {
                        ...session.user,
                        firstName: updatedProfile.firstName ?? session.user.firstName,
                        lastName: updatedProfile.lastName ?? session.user.lastName,
                        organization: updatedProfile.organization ?? session.user.organization,
                        phone: updatedProfile.phone ?? session.user.phone,
                        agreeToMarketing:
                            updatedProfile.agreeToMarketing ?? session.user.agreeToMarketing,
                        equalityMonitoring:
                            updatedProfile.equalityMonitoring ?? session.user.equalityMonitoring,
                    },
                };
                primeClientSession(nextSession);
                setSession(nextSession);
            }

            return mergedUser;
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
        verifyTotpLogin,
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
