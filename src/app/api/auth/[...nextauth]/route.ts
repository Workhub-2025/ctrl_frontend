import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { User } from 'next-auth';
import { AuthAPI } from '@/services/auth-api';

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

                try {
                    console.log('🔄 Calling AuthAPI.login...');
                    const authResponse = await AuthAPI.login({
                        identifier: credentials.email,
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
                        const roleValue = (typeof userRole === 'object' && userRole !== null && 'name' in userRole) ? (userRole as any).name : 'Candidate';

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
                        return user;
                    }

                    console.log('❌ Invalid Strapi response - missing JWT or user');
                    return null;
                } catch (error: any) {
                    console.error('❌ NextAuth authorization error:', error.message);
                    console.error('❌ Full error:', error);
                    return null;
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