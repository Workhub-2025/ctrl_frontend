import CredentialsProvider from 'next-auth/providers/credentials';
import type { User } from 'next-auth';
import { logAuthAuditEvent } from '@/lib/security/audit-log';
import {
    authenticateCredentials,
    CredentialAuthError,
} from '@/lib/auth/credential-auth';
import { SESSION_IDLE_MAX_AGE } from '@/lib/auth/session-config';

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

    if ('get' in headers && typeof (headers as { get?: unknown }).get === 'function') {
        const value = (headers as Headers).get(normalizedName) ?? (headers as Headers).get(name);
        return value ?? undefined;
    }

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
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const normalizedEmail = credentials.email.trim().toLowerCase();
                const context = extractRequestContext(req);

                try {
                    const { authResponse, role } = await authenticateCredentials({
                        email: normalizedEmail,
                        password: credentials.password,
                        context,
                    });

                    const user = authResponse.user!;

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        role,
                        jwt: authResponse.jwt!,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        organization: typeof user.organization === 'string' ? user.organization : undefined,
                        phone: typeof user.phone === 'string' ? user.phone : undefined,
                        equalityMonitoring: user.equalityMonitoring,
                        agreeToMarketing: user.agreeToMarketing ?? undefined,
                        agreeToTerms: user.agreeToTerms ?? undefined,
                        agreeToDataPrivacyPolicy: user.agreeToDataPrivacyPolicy ?? undefined,
                    };
                } catch (error) {
                    if (error instanceof CredentialAuthError) {
                        if (error.code === 'LOCKED') {
                            throw new Error('LOCKED_OUT');
                        }
                        if (error.code === 'INVALID') {
                            return null;
                        }
                        if (error.code === 'RATE_LIMITED') {
                            throw new Error('LOCKED_OUT');
                        }
                    }

                    logAuthAuditEvent('login_failure', {
                        email: normalizedEmail,
                        ipAddress: context.ipAddress,
                        userAgent: context.userAgent,
                        reason: 'Auth service unavailable',
                    });
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
            const now = Math.floor(Date.now() / 1000);

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
                token.lastActivity = now;
                return token;
            }

            const lastActivity = typeof token.lastActivity === 'number' ? token.lastActivity : now;
            if (now - lastActivity > SESSION_IDLE_MAX_AGE) {
                return { expired: true };
            }

            token.lastActivity = now;
            return token;
        },
        async session({ session, token }: any) {
            if (token?.expired) {
                return { ...session, user: undefined, expires: new Date(0).toISOString() };
            }

            if (token) {
                session.user.id = token.sub || '';
                session.user.role = token.role;
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
