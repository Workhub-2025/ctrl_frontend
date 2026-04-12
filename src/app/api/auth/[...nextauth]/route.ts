import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { User } from 'next-auth';
import { AuthAPI } from '@/services/auth-api';
import { logAuthAuditEvent } from '@/lib/security/audit-log';
import { inferDevSeededRole, normalizeRole } from '@/lib/auth/role-model';
import {
    buildLoginAttemptKey,
    checkLoginAttemptAllowed,
    clearLoginAttempts,
    recordFailedLoginAttempt,
} from '@/lib/security/login-attempt-guard';

// Extended User type for our application
interface ExtendedUser extends User {
    role: string;
    jwt: string;
    firstName?: string;
    lastName?: string;
    organization?: string;
    phone?: string;
    equalityMonitoring?: any;
    agreeToMarketing?: boolean;
    agreeToTerms?: boolean;
    agreeToDataPrivacyPolicy?: boolean;
}

const getHeaderValue = (headers: unknown, name: string): string | undefined => {
    if (!headers || typeof headers !== 'object') return undefined;

    const normalizedName = name.toLowerCase();

    // Headers API support
    if ('get' in headers && typeof (headers as { get?: unknown }).get === 'function') {
        const value = (headers as Headers).get(normalizedName) ?? (headers as Headers).get(name);
        return value ?? undefined;
    }

    // Plain object support
    const record = headers as Record<string, string | string[] | undefined>;
    const candidate = record[name] ?? record[normalizedName];

    if (Array.isArray(candidate)) {
        return candidate[0];
    }

    return candidate;
};

const extractRequestContext = (requestLike: unknown) => {
    const headers = (requestLike as { headers?: unknown } | undefined)?.headers;
    const forwardedFor = getHeaderValue(headers, 'x-forwarded-for');
    const realIp = getHeaderValue(headers, 'x-real-ip');
    const userAgent = getHeaderValue(headers, 'user-agent') ?? 'unknown';
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    return { ipAddress, userAgent };
};

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials, req): Promise<ExtendedUser | null> {
                console.log('🔐 NextAuth authorize called with:', { email: credentials?.email });

                if (!credentials?.email || !credentials?.password) {
                    console.log('❌ Missing credentials');
                    return null;
                }

                const normalizedEmail = credentials.email.trim().toLowerCase();
                const { ipAddress, userAgent } = extractRequestContext(req);
                const attemptKey = buildLoginAttemptKey(normalizedEmail, ipAddress);

                const attemptGuard = checkLoginAttemptAllowed(attemptKey);
                if (!attemptGuard.allowed) {
                    logAuthAuditEvent('login_locked', {
                        email: normalizedEmail,
                        ipAddress,
                        userAgent,
                        retryAfterSeconds: attemptGuard.retryAfterSeconds,
                    });
                    throw new Error('LOCKED_OUT');
                }

                logAuthAuditEvent('login_attempt', {
                    email: normalizedEmail,
                    ipAddress,
                    userAgent,
                    remainingAttempts: attemptGuard.remainingAttempts,
                });

                try {
                    console.log('🔄 Calling AuthAPI.login...');
                    const authResponse = await AuthAPI.login({
                        identifier: normalizedEmail,
                        password: credentials.password,
                    });

                    console.log('🔍 Strapi Auth Response Debug:', {
                        hasJWT: !!authResponse.jwt,
                        hasUser: !!authResponse.user,
                        userEmail: authResponse.user?.email,
                        roleObject: authResponse.user?.role,
                        roleName: typeof authResponse.user?.role === 'object' && authResponse.user.role !== null ? (authResponse.user.role as any).name : 'Candidate',
                        roleType: typeof authResponse.user?.role
                    });

                    if (authResponse.jwt && authResponse.user) {
                        // Extract role name from Strapi Users & Permissions role object
                        const userRole = authResponse.user.role;
                        const fallbackDevRole = inferDevSeededRole(authResponse.user.email || normalizedEmail);
                        const roleValue = userRole
                            ? normalizeRole((typeof userRole === 'object' && userRole !== null && 'name' in userRole) ? (userRole as any).name : userRole)
                            : fallbackDevRole ?? 'candidate';

                        console.log('🎯 Role extracted from Strapi:', roleValue);

                        const user: ExtendedUser = {
                            id: authResponse.user.id.toString(),
                            email: authResponse.user.email,
                            name: `${authResponse.user.firstName || ''} ${authResponse.user.lastName || ''}`.trim(),
                            role: roleValue,
                            jwt: authResponse.jwt,
                            firstName: authResponse.user.firstName,
                            lastName: authResponse.user.lastName,
                            organization: typeof authResponse.user.organization === 'string' ? authResponse.user.organization : undefined,
                            phone: typeof authResponse.user.phone === 'string' ? authResponse.user.phone : undefined,
                            // Include equality monitoring data for routing decisions (with proper type conversion)
                            equalityMonitoring: authResponse.user.equalityMonitoring,
                            agreeToMarketing: authResponse.user.agreeToMarketing ?? undefined,
                            agreeToTerms: authResponse.user.agreeToTerms ?? undefined,
                            agreeToDataPrivacyPolicy: authResponse.user.agreeToDataPrivacyPolicy ?? undefined,
                        };

                        console.log('✅ NextAuth user object created:', {
                            ...user,
                            jwt: '[HIDDEN]',
                            equalityMonitoring: user.equalityMonitoring
                        });

                        clearLoginAttempts(attemptKey);
                        logAuthAuditEvent('login_success', {
                            email: normalizedEmail,
                            ipAddress,
                            userAgent,
                            role: roleValue,
                            userId: authResponse.user.id,
                        });
                        return user;
                    }

                    console.log('❌ Invalid Strapi response - missing JWT or user');
                    const failedAttempt = recordFailedLoginAttempt(attemptKey);
                    logAuthAuditEvent('login_failure', {
                        email: normalizedEmail,
                        ipAddress,
                        userAgent,
                        reason: 'Invalid response payload',
                        failures: failedAttempt.failures,
                        remainingAttempts: failedAttempt.remainingAttempts,
                    });

                    if (failedAttempt.lockedUntil) {
                        logAuthAuditEvent('login_locked', {
                            email: normalizedEmail,
                            ipAddress,
                            userAgent,
                            retryAfterSeconds: Math.ceil((failedAttempt.lockedUntil - Date.now()) / 1000),
                        });
                        throw new Error('LOCKED_OUT');
                    }
                    return null;
                } catch (error: any) {
                    console.error('❌ NextAuth authorization error:', error.message);
                    console.error('❌ Full error:', error);
                    const message = String(error?.message || '');
                    if (message === 'LOCKED_OUT') {
                        throw error;
                    }

                    const failedAttempt = recordFailedLoginAttempt(attemptKey);
                    logAuthAuditEvent('login_failure', {
                        email: normalizedEmail,
                        ipAddress,
                        userAgent,
                        reason: message || 'Unknown error',
                        failures: failedAttempt.failures,
                        remainingAttempts: failedAttempt.remainingAttempts,
                    });

                    if (failedAttempt.lockedUntil) {
                        logAuthAuditEvent('login_locked', {
                            email: normalizedEmail,
                            ipAddress,
                            userAgent,
                            retryAfterSeconds: Math.ceil((failedAttempt.lockedUntil - Date.now()) / 1000),
                        });
                        throw new Error('LOCKED_OUT');
                    }

                    const likelyCredentialFailure = /invalid|identifier|password|credentials/i.test(message);
                    if (likelyCredentialFailure) {
                        return null;
                    }

                    throw new Error('AUTH_SERVICE_UNAVAILABLE');
                }
            }
        })
    ],
    session: {
        strategy: 'jwt' as const,
    },
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.jwt = user.jwt;
                token.firstName = user.firstName;
                token.lastName = user.lastName;
                token.organization = user.organization;
                token.phone = user.phone;
                token.equalityMonitoring = user.equalityMonitoring;
                token.agreeToMarketing = user.agreeToMarketing;
                token.agreeToTerms = user.agreeToTerms;
                token.agreeToDataPrivacyPolicy = user.agreeToDataPrivacyPolicy;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (token) {
                session.user.id = token.sub || '';
                session.user.role = token.role;
                session.user.jwt = token.jwt;
                session.user.firstName = token.firstName;
                session.user.lastName = token.lastName;
                session.user.organization = token.organization;
                session.user.phone = token.phone;
                session.user.equalityMonitoring = token.equalityMonitoring;
                session.user.agreeToMarketing = token.agreeToMarketing;
                session.user.agreeToTerms = token.agreeToTerms;
                session.user.agreeToDataPrivacyPolicy = token.agreeToDataPrivacyPolicy;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/login',
        signOut: '/auth/login',
        error: '/auth/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
