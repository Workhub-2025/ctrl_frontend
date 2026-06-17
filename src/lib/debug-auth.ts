/**
 * Debug utility for authentication issues (development only).
 */

export const debugAuthToken = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
        console.warn('[DEBUG] debugAuthToken is disabled in production');
        return;
    }

    console.log('[DEBUG] Starting authentication debug...');

    if (typeof window === 'undefined') {
        try {
            const { getServerSession } = await import('next-auth/next');
            const { authOptions } = await import('@/lib/auth/next-auth-options');
            const { getServerStrapiJwt } = await import('@/lib/auth/strapi-jwt');
            const session = await getServerSession(authOptions);
            const strapiJwt = await getServerStrapiJwt();

            console.log('[DEBUG] Server session:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                hasServerJwt: !!strapiJwt,
                userId: session?.user?.id,
                userEmail: session?.user?.email,
                userRole: session?.user?.role,
            });
        } catch (error: unknown) {
            console.error('[DEBUG] Error getting server session:', error instanceof Error ? error.message : error);
        }
    } else {
        try {
            const { getSession } = await import('next-auth/react');
            const session = await getSession();

            console.log('[DEBUG] Client session:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                userId: session?.user?.id,
                userEmail: session?.user?.email,
                userRole: session?.user?.role,
            });
            console.log('[DEBUG] Strapi JWT is server-only — browser uses /api/strapi-proxy');
        } catch (error: unknown) {
            console.error('[DEBUG] Error getting client session:', error instanceof Error ? error.message : error);
        }
    }

    console.log('[DEBUG] Authentication debug complete');
};

export const debugEnvironment = (): void => {
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    console.log('[DEBUG] Environment check:', {
        isServer: typeof window === 'undefined',
        NODE_ENV: process.env.NODE_ENV,
        STRAPI_API_URL: process.env.STRAPI_API_URL ? 'SET' : 'NOT SET',
        NEXT_PUBLIC_STRAPI_API_URL: process.env.NEXT_PUBLIC_STRAPI_API_URL ? 'SET' : 'NOT SET',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    });
};
