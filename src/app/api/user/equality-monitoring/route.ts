import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { applyRateLimit, extractClientIp } from '@/lib/security/api-rate-limit';
import { resolveCorrelationId, startServerActionTrace } from '@/lib/observability/server-observability';

export async function POST(request: NextRequest) {
    return await handleEqualityMonitoring(request);
}

export async function PUT(request: NextRequest) {
    return await handleEqualityMonitoring(request);
}

async function handleEqualityMonitoring(request: NextRequest) {
    const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
    const trace = startServerActionTrace('equalityMonitoring.put', { correlationId, method: request.method });
    try {
        // Get the session to verify authentication
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            trace.failure(new Error('Unauthorized'));
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: { 'x-correlation-id': correlationId } }
            );
        }

        const limiter = await applyRateLimit({
            key: `equality-monitoring:${request.method}:${session.user.id}:${extractClientIp(request)}`,
            limit: 20,
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

        const equalityMonitoring = await request.json();

        // Make direct fetch call with proper authentication headers
        const { fetchClient } = await import('@/lib/fetch-client');
        const response = await fetchClient(
            `/api/users/${session.user.id}`,
            {
                method: 'PUT',
                body: JSON.stringify({ equalityMonitoring }),
                headers: {
                    'Authorization': `Bearer ${session.user.jwt}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to update equality monitoring data');
        }

        const data = await response.json();
        trace.success({ userId: session.user.id });

        return NextResponse.json({
            success: true,
            message: 'Equality monitoring data saved successfully',
            data
        }, { headers: { 'x-correlation-id': correlationId } });

    } catch (error: any) {
        trace.failure(error);
        console.error('Equality monitoring API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to save equality monitoring data',
                details: error.message
            },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}
