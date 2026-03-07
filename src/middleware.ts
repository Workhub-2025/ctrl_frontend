import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // Protect admin routes - only allow admin users
        if (pathname.startsWith('/admin')) {
            if (token?.role !== 'admin' && token?.role !== 'Admin') {
                // Redirect non-admin users to their dashboard
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // Protect admin routes - require admin role
                if (pathname.startsWith('/admin')) {
                    return !!token && (token.role === 'admin' || token.role === 'Admin');
                }

                // Protect assessment routes - require any authenticated user
                if (pathname.startsWith('/dashboard') ||
                    pathname.startsWith('/assessment') ||
                    pathname.startsWith('/results')) {
                    return !!token;
                }

                // Allow access to other routes
                return true;
            },
        },
    }
);

export const config = {
    matcher: [
        '/admin/:path*',
        '/dashboard/:path*',
        '/assessment/:path*',
        '/results/:path*'
    ]
};