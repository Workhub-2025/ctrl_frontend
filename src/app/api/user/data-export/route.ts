import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';
import { getServerStrapiJwt } from '@/lib/auth/strapi-jwt';
import { resolveCorrelationId, startServerActionTrace } from '@/lib/observability/server-observability';
import { applyRateLimit, extractClientIp } from '@/lib/security/api-rate-limit';

export async function GET(request: NextRequest) {
    const correlationId = resolveCorrelationId();
    const trace = startServerActionTrace('user.data-export', { correlationId });

    try {
        const session = await getServerSession(authOptions);
        const strapiJwt = await getServerStrapiJwt(request);

        if (!session?.user?.id || !strapiJwt) {
            trace.failure(new Error('Unauthorized'));
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'x-correlation-id': correlationId } });
        }

        const limiter = await applyRateLimit({
            key: `user:data-export:${session.user.id}:${extractClientIp(request)}`,
            limit: 5,
            windowMs: 60 * 60_000,
        });
        if (!limiter.allowed) {
            return NextResponse.json(
                { error: 'Too many export requests. Please try again later.' },
                { status: 429, headers: { 'x-correlation-id': correlationId, 'retry-after': String(limiter.retryAfterSeconds) } }
            );
        }

        const { getStrapiClient } = await import('@/lib/strapi');
        const strapiClient = getStrapiClient(strapiJwt);
        const exportResponse = await strapiClient.fetch('/users/me/data-export');
        const payload = await exportResponse.json();

        if (!exportResponse.ok) {
            throw new Error(payload?.error?.message || 'Data export failed');
        }

        trace.success({ userId: session.user.id });
        return new NextResponse(JSON.stringify(payload, null, 2), {
            status: 200,
            headers: {
                'content-type': 'application/json; charset=utf-8',
                'content-disposition': `attachment; filename="ctrl-data-export-${session.user.id}.json"`,
                'x-correlation-id': correlationId,
            },
        });
    } catch (error: unknown) {
        trace.failure(error instanceof Error ? error : new Error('Data export failed'));
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Data export failed' },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}
