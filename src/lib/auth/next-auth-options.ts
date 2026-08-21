import type { AuthOptions } from 'next-auth';
import { SESSION_IDLE_MAX_AGE } from '@/lib/auth/session-config';

export const authOptions: AuthOptions = {
    providers: [],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            const now = Math.floor(Date.now() / 1000);

            if (user) {
                token.role = user.role;
                token.authProvider = 'firebase';
                token.firebaseUid = user.firebaseUid;
                token.firstName = user.firstName;
                token.lastName = user.lastName;
                token.organization = user.organization;
                token.phone = user.phone;
                token.equalityMonitoring = user.equalityMonitoring;
                token.agreeToMarketing = user.agreeToMarketing;
                token.agreeToTerms = user.agreeToTerms;
                token.agreeToDataPrivacyPolicy = user.agreeToDataPrivacyPolicy;
                token.totpEnabled = user.totpEnabled === true;
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
        async session({ session, token }) {
            if (token?.expired) {
                return { ...session, user: undefined, expires: new Date(0).toISOString() };
            }

            if (token && session.user) {
                session.user.id = token.sub || '';
                session.user.email = token.email ?? session.user.email;
                session.user.name =
                  typeof token.name === 'string' && token.name.trim()
                    ? token.name
                    : `${token.firstName || ''} ${token.lastName || ''}`.trim() ||
                      session.user.name;
                session.user.role = token.role;
                session.user.authProvider = 'firebase';
                session.user.firebaseUid = token.firebaseUid;
                session.user.firstName = token.firstName;
                session.user.lastName = token.lastName;
                session.user.organization = token.organization;
                session.user.phone = token.phone;
                session.user.equalityMonitoring = token.equalityMonitoring;
                session.user.agreeToMarketing = token.agreeToMarketing;
                session.user.agreeToTerms = token.agreeToTerms;
                session.user.agreeToDataPrivacyPolicy = token.agreeToDataPrivacyPolicy;
                session.user.totpEnabled = token.totpEnabled === true;
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
