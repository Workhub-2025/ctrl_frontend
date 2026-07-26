import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import {
    guardAssessmentApiRoute,
    guardAuthenticatedApiRoute,
    guardPortalApiRoute,
} from "@/lib/auth/bff-api-middleware";
import { isAdminPortalRole, normalizeRole, routeForRole } from "@/lib/auth/role-model";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { buildContentSecurityPolicy } from "@/lib/security/content-security-policy";
import {
    isPortalMfaEnrollmentPath,
    portalMfaEnrollmentRequired,
} from "@/lib/auth/portal-mfa-enrollment";

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;
        const requestHeaders = new Headers(req.headers);
        let contentSecurityPolicy: string | null = null;

        if (process.env.NODE_ENV === "production") {
            const nonce = btoa(crypto.randomUUID());
            contentSecurityPolicy = buildContentSecurityPolicy(nonce);
            requestHeaders.set("x-nonce", nonce);
            requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
        }

        // One production CSRF boundary for every authenticated BFF mutation.
        // Stripe webhooks are deliberately outside this matcher and verify signatures instead.
        if (
            pathname.startsWith('/api/') &&
            !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())
        ) {
            const crossOriginResponse = rejectCrossOriginRequest(req);
            if (crossOriginResponse) return crossOriginResponse;

            const contentLength = Number(req.headers.get("content-length") ?? "0");
            if (Number.isFinite(contentLength) && contentLength > 2 * 1024 * 1024) {
                return NextResponse.json({ error: "Payload too large" }, { status: 413 });
            }

            // A broad safety net for every portal mutation. Route-specific
            // limits remain in place for expensive or abuse-prone operations.
            const actor = token?.sub
                ? `user:${String(token.sub)}`
                : `ip:${extractClientIp(req)}`;
            const rateLimit = await applyRateLimit({
                key: `bff-mutation:${pathname}:${actor}`,
                limit: 120,
                windowMs: 60_000,
            });
            if (!rateLimit.allowed) {
                return NextResponse.json(
                    { error: "Too many requests. Please wait and try again." },
                    {
                        status: 429,
                        headers: {
                            "Retry-After": String(rateLimit.retryAfterSeconds),
                            "X-RateLimit-Limit": String(rateLimit.limit),
                            "X-RateLimit-Remaining": "0",
                        },
                    },
                );
            }
        }

        const mustEnrollPortalMfa = portalMfaEnrollmentRequired({
            enabled: process.env.REQUIRE_PORTAL_MFA_ENROLLMENT === "true",
            role: token?.role,
            totpEnabled: token?.totpEnabled,
        });
        if (mustEnrollPortalMfa && !isPortalMfaEnrollmentPath(pathname)) {
            if (pathname.startsWith("/api/")) {
                return NextResponse.json(
                    {
                        error: "Two-factor authentication enrolment is required.",
                        code: "PORTAL_MFA_ENROLLMENT_REQUIRED",
                    },
                    { status: 403 },
                );
            }
            const enrollmentUrl = new URL("/profile", req.url);
            enrollmentUrl.searchParams.set("tab", "security");
            enrollmentUrl.searchParams.set("enroll", "1");
            return NextResponse.redirect(enrollmentUrl);
        }

        const portalApiResponse = guardPortalApiRoute(pathname, !!token, token?.role);
        if (portalApiResponse) {
            return portalApiResponse;
        }

        const assessmentApiResponse = guardAssessmentApiRoute(pathname, !!token);
        if (assessmentApiResponse) {
            return assessmentApiResponse;
        }

        const authenticatedApiResponse = guardAuthenticatedApiRoute(pathname, !!token);
        if (authenticatedApiResponse) {
            return authenticatedApiResponse;
        }

        // Protect admin routes - only allow admin users
        if (pathname.startsWith('/admin')) {
            if (!token) {
                const loginUrl = new URL('/auth/login', req.url);
                loginUrl.searchParams.set('callbackUrl', pathname);
                return NextResponse.redirect(loginUrl);
            }

            if (!isAdminPortalRole(token?.role)) {
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

        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });
        if (contentSecurityPolicy) {
            response.headers.set("Content-Security-Policy", contentSecurityPolicy);
        }
        return response;
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                if (
                    pathname.startsWith('/api/hiring-manager') ||
                    pathname.startsWith('/api/client') ||
                    pathname.startsWith('/api/admin') ||
                    pathname.startsWith('/api/candidate') ||
                    pathname.startsWith('/api/assessment') ||
                    pathname.startsWith('/api/user')
                ) {
                    return true;
                }

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
                    pathname.startsWith('/results') ||
                    pathname.startsWith('/profile')) {
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
        {
            source: '/((?!api/auth|api/webhooks/stripe|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ]
};
