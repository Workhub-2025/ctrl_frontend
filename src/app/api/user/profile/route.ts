import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';
import { requireFirebaseSession } from '@/lib/auth/firebase-bff-session';
import { handleBffRouteError } from '@/lib/auth/bff-route-errors';
import {
    getFirebaseUserProfile,
    updateFirebaseUserProfile,
} from '@/lib/firebase-profile-api';
import { resolveCorrelationId, startServerActionTrace } from '@/lib/observability/server-observability';
import { applyRateLimit, extractClientIp } from '@/lib/security/api-rate-limit';
import { rejectMutatingCrossOrigin } from '@/lib/security/bff-mutation-guard';
import { buildAuthorizedProfileUpdate } from '@/lib/profile-authority';

function toProfileResponse(profile: {
    id: string | number;
    firstName?: string;
    lastName?: string;
    email?: string;
    organization?: string | null;
    phone?: string | null;
    role?: string;
    createdAt?: string | null;
    emailVerified?: boolean | null;
    agreeToMarketing?: boolean | null;
    privacyConsent?: Record<string, unknown> | null;
    equalityMonitoring?: Record<string, unknown> | null;
    hasCompletedEqualityMonitoring?: boolean;
    equalityPromptDismissedAt?: string | null;
}) {
    return {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        organization: profile.organization ?? null,
        phone: profile.phone ?? undefined,
        role: profile.role,
        createdAt: profile.createdAt ?? null,
        emailVerified: profile.emailVerified ?? null,
        agreeToMarketing: profile.agreeToMarketing ?? undefined,
        privacyConsent: profile.privacyConsent ?? null,
        equalityMonitoring: profile.equalityMonitoring ?? null,
        hasCompletedEqualityMonitoring:
            profile.hasCompletedEqualityMonitoring ??
            profile.equalityMonitoring?.completed === true,
        equalityPromptDismissedAt: profile.equalityPromptDismissedAt ?? null,
    };
}

export async function GET(request: NextRequest) {
    const correlationId = resolveCorrelationId();
    const trace = startServerActionTrace('profile.get', { correlationId });
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            trace.failure(new Error('Unauthorized'));
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'x-correlation-id': correlationId } });
        }

        const limiter = await applyRateLimit({
            key: `profile:get:${session.user.id}:${extractClientIp(request)}`,
            limit: 120,
            windowMs: 60_000,
        });
        if (!limiter.allowed) {
            trace.failure(new Error('Rate limit exceeded'), { limiter });
            return NextResponse.json(
                { error: 'Too many requests. Please retry shortly.' },
                {
                    status: 429,
                    headers: {
                        'x-correlation-id': correlationId,
                        'retry-after': String(limiter.retryAfterSeconds),
                    },
                }
            );
        }

        const firebaseAuth = await requireFirebaseSession();
        const profile = await getFirebaseUserProfile(firebaseAuth.firebaseSessionCookie);
        trace.success({ userId: session.user.id, provider: 'firebase' });
        return NextResponse.json(toProfileResponse(profile), {
            headers: { 'x-correlation-id': correlationId },
        });
    } catch (error: unknown) {
        const bffError = handleBffRouteError(error, 'Failed to fetch profile');
        if (bffError.status !== 500) {
            trace.failure(error instanceof Error ? error : new Error('profile.get failed'));
            return bffError;
        }
        trace.failure(error instanceof Error ? error : new Error('profile.get failed'));
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}

export async function PUT(request: NextRequest) {
    const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
    const trace = startServerActionTrace('profile.put', { correlationId });
    try {
        const crossOriginResponse = rejectMutatingCrossOrigin(request);
        if (crossOriginResponse) return crossOriginResponse;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            trace.failure(new Error('Unauthorized'));
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'x-correlation-id': correlationId } });
        }

        const limiter = await applyRateLimit({
            key: `profile:put:${session.user.id}:${extractClientIp(request)}`,
            limit: 30,
            windowMs: 60_000,
        });
        if (!limiter.allowed) {
            trace.failure(new Error('Rate limit exceeded'), { limiter });
            return NextResponse.json(
                { error: 'Too many profile updates. Please retry shortly.' },
                {
                    status: 429,
                    headers: {
                        'x-correlation-id': correlationId,
                        'retry-after': String(limiter.retryAfterSeconds),
                    },
                }
            );
        }

        const body = await request.json();

        const decision = buildAuthorizedProfileUpdate(body, session.user.role);
        if (decision.forbiddenEqualityMonitoring) {
            trace.failure(new Error('Equality monitoring is unavailable for this portal'));
            return NextResponse.json(
                { error: 'Equality monitoring is not available for this account.' },
                { status: 403, headers: { 'x-correlation-id': correlationId } },
            );
        }
        const updateData = decision.data;

        const firebaseAuth = await requireFirebaseSession();
        const profile = await updateFirebaseUserProfile(
            firebaseAuth.firebaseSessionCookie,
            updateData,
        );
        trace.success({ userId: session.user.id, provider: 'firebase' });
        return NextResponse.json(toProfileResponse(profile), {
            headers: { 'x-correlation-id': correlationId },
        });
    } catch (error: unknown) {
        const bffError = handleBffRouteError(error, 'Failed to update profile');
        if (bffError.status !== 500) {
            trace.failure(error instanceof Error ? error : new Error('profile.put failed'));
            return bffError;
        }
        trace.failure(error instanceof Error ? error : new Error('profile.put failed'));
        console.error('Error updating user profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}
