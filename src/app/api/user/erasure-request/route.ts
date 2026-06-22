import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';
import { getServerStrapiJwt } from '@/lib/auth/strapi-jwt';
import { resolveCorrelationId, startServerActionTrace } from '@/lib/observability/server-observability';
import { applyRateLimit, extractClientIp } from '@/lib/security/api-rate-limit';
import { rejectMutatingCrossOrigin } from '@/lib/security/bff-mutation-guard';

export async function POST(request: NextRequest) {
    const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
    const trace = startServerActionTrace('user.erasure-request', { correlationId });

    try {
        const crossOriginResponse = rejectMutatingCrossOrigin(request);
        if (crossOriginResponse) return crossOriginResponse;

        const session = await getServerSession(authOptions);
        const strapiJwt = await getServerStrapiJwt(request);

        if (!session?.user?.id || !strapiJwt) {
            trace.failure(new Error('Unauthorized'));
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'x-correlation-id': correlationId } });
        }

        const limiter = await applyRateLimit({
            key: `user:erasure:${session.user.id}:${extractClientIp(request)}`,
            limit: 3,
            windowMs: 24 * 60 * 60_000,
        });
        if (!limiter.allowed) {
            return NextResponse.json(
                { error: 'Too many erasure requests. Please contact support.' },
                { status: 429, headers: { 'x-correlation-id': correlationId, 'retry-after': String(limiter.retryAfterSeconds) } }
            );
        }

        const { getStrapiClient } = await import('@/lib/strapi');
        const strapiClient = getStrapiClient(strapiJwt);
        const erasureResponse = await strapiClient.fetch('/users/me/erasure-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        const payload = await erasureResponse.json();

        if (!erasureResponse.ok) {
            throw new Error(payload?.error?.message || 'Erasure request failed');
        }

        trace.success({ userId: session.user.id, status: payload?.data?.status });
        return NextResponse.json(payload, { headers: { 'x-correlation-id': correlationId } });
    } catch (error: unknown) {
        trace.failure(error instanceof Error ? error : new Error('Erasure request failed'));
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erasure request failed' },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}
