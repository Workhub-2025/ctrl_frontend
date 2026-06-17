import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: number;
            role?: string;
            jwt?: string; // server-only in NextAuth JWT cookie; not exposed via /api/auth/session
            firstName?: string;
            lastName?: string;
            organization?: string;
            phone?: string;
            agreeToMarketing?: boolean;
            equalityMonitoring?: {
                completed?: boolean;
            };
            agreeToTerms?: boolean;
            agreeToDataPrivacyPolicy?: boolean;
        } & DefaultSession['user'];
    }

    interface User extends DefaultUser {
        role?: string;
        jwt?: string;
        firstName?: string;
        lastName?: string;
        organization?: string;
        phone?: string;
        agreeToMarketing?: boolean;
        equalityMonitoring?: {
            completed?: boolean;
        };
        agreeToTerms?: boolean;
        agreeToDataPrivacyPolicy?: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT extends DefaultJWT {
        role?: string;
        jwt?: string;
        firstName?: string;
        lastName?: string;
        organization?: string;
        phone?: string;
        agreeToMarketing?: boolean;
        equalityMonitoring?: {
            completed?: boolean;
        };
        agreeToTerms?: boolean;
        agreeToDataPrivacyPolicy?: boolean;
        lastActivity?: number;
        expired?: boolean;
    }
}