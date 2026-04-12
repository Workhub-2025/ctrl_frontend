import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminRole, normalizeRole, routeForRole } from '@/lib/auth/role-model';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // Protect admin routes - only allow admin users
        if (pathname.startsWith('/admin')) {
            if (!token) {
                const loginUrl = new URL('/auth/login', req.url);
                loginUrl.searchParams.set('callbackUrl', pathname);
                return NextResponse.redirect(loginUrl);
            }

            if (!isAdminRole(token?.role)) {
                // Redirect authenticated non-admin users to their dashboard.
                return NextResponse.redirect(new URL(routeForRole(token?.role), req.url));
            }
        }

        const normalizedRole = normalizeRole(token?.role);

        if (pathname.startsWith('/candidate-dashboard') && normalizedRole !== 'candidate') {
            return NextResponse.redirect(new URL(routeForRole(normalizedRole), req.url));
        }

        if (pathname.startsWith('/client-dashboard') && normalizedRole !== 'client') {
            return NextResponse.redirect(new URL(routeForRole(normalizedRole), req.url));
        }

        if (pathname.startsWith('/hiring-manager-dashboard') && normalizedRole !== 'hiring_manager') {
            return NextResponse.redirect(new URL(routeForRole(normalizedRole), req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // Protect admin routes - require authentication first, role check is in middleware().
                if (pathname.startsWith('/admin')) {
                    return !!token;
                }

                // Protect assessment routes - require any authenticated user
                if (pathname.startsWith('/dashboard') ||
                    pathname.startsWith('/candidate-dashboard') ||
                    pathname.startsWith('/client-dashboard') ||
                    pathname.startsWith('/hiring-manager-dashboard') ||
                    pathname.startsWith('/assessment') ||
                    pathname.startsWith('/results')) {
                    return !!token;
                }

                // Allow access to other routes
                return true;
            },
        },
        pages: {
            signIn: '/auth/login',
        },
    }
);

export const config = {
    matcher: [
        '/admin/:path*',
        '/dashboard/:path*',
        '/candidate-dashboard/:path*',
        '/client-dashboard/:path*',
        '/hiring-manager-dashboard/:path*',
        '/assessment/:path*',
        '/results/:path*'
    ]
};
