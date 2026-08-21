import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string | number;
            role?: string;
            authProvider?: 'firebase';
            firebaseUid?: string;
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
            totpEnabled?: boolean;
        } & DefaultSession['user'];
    }

    interface User extends DefaultUser {
        role?: string;
        authProvider?: 'firebase';
        firebaseUid?: string;
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
        totpEnabled?: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT extends DefaultJWT {
        role?: string;
        authProvider?: 'firebase';
        firebaseUid?: string;
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
        totpEnabled?: boolean;
        lastActivity?: number;
        expired?: boolean;
    }
}
