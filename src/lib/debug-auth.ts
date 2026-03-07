/**
 * Debug utility for authentication issues
 */

export const debugAuthToken = async (): Promise<void> => {
    console.log('🔍 [DEBUG] Starting authentication debug...');

    if (typeof window === 'undefined') {
        // Server-side debugging
        console.log('🖥️ [DEBUG] Running on server side');

        try {
            const { getServerSession } = await import('next-auth/next');
            const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
            const session = await getServerSession(authOptions);

            console.log('🔍 [DEBUG] Server session:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                hasJwt: !!session?.user?.jwt,
                userId: session?.user?.id,
                userEmail: session?.user?.email,
                userRole: session?.user?.role,
                jwtPreview: session?.user?.jwt ? `${session.user.jwt.substring(0, 20)}...` : 'No JWT'
            });

            if (session?.user?.jwt) {
                console.log('✅ [DEBUG] JWT token available on server');
            } else {
                console.error('❌ [DEBUG] No JWT token in server session');
            }

        } catch (error: any) {
            console.error('💥 [DEBUG] Error getting server session:', error.message);
        }
    } else {
        // Client-side debugging
        console.log('🌐 [DEBUG] Running on client side');

        try {
            const { getSession } = await import('next-auth/react');
            const session = await getSession();

            console.log('🔍 [DEBUG] Client session:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                hasJwt: !!session?.user?.jwt,
                userId: session?.user?.id,
                userEmail: session?.user?.email,
                userRole: session?.user?.role,
                jwtPreview: session?.user?.jwt ? `${session.user.jwt.substring(0, 20)}...` : 'No JWT'
            });

            // Check localStorage as fallback
            const localToken = localStorage.getItem('strapi-jwt');
            console.log('🔍 [DEBUG] localStorage token:', {
                hasToken: !!localToken,
                tokenPreview: localToken ? `${localToken.substring(0, 20)}...` : 'No token'
            });

            if (session?.user?.jwt) {
                console.log('✅ [DEBUG] JWT token available on client');
            } else if (localToken) {
                console.log('⚠️ [DEBUG] No JWT in session but found in localStorage');
            } else {
                console.error('❌ [DEBUG] No JWT token available');
            }

        } catch (error: any) {
            console.error('💥 [DEBUG] Error getting client session:', error.message);
        }
    }

    console.log('🔍 [DEBUG] Authentication debug complete');
};

/**
 * Debug environment variables
 */
export const debugEnvironment = (): void => {
    console.log('🌍 [DEBUG] Environment check:', {
        isServer: typeof window === 'undefined',
        NODE_ENV: process.env.NODE_ENV,
        STRAPI_API_URL: process.env.STRAPI_API_URL,
        NEXT_PUBLIC_STRAPI_API_URL: process.env.NEXT_PUBLIC_STRAPI_API_URL,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET'
    });
};