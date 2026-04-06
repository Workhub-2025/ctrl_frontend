import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { applyRateLimit, extractClientIp } from '@/lib/security/api-rate-limit';
import { resolveCorrelationId, startServerActionTrace } from '@/lib/observability/server-observability';

export async function PUT(request: NextRequest) {
    const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
    const trace = startServerActionTrace('privacyConsent.put', { correlationId });
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

        const limiter = applyRateLimit({
            key: `privacy-consent:put:${session.user.id}:${extractClientIp(request)}`,
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

        const privacyConsent = await request.json();


        // Update user's privacy consent in Strapi using actual user ID
        const { fetchClient } = await import('@/lib/fetch-client');
        const response = await fetchClient(
            `/api/users/${session.user.id}`,
            {
                method: 'PUT',
                body: JSON.stringify({ privacyConsent }),
                headers: {
                    'Authorization': `Bearer ${session.user.jwt}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to update privacy consent');
        }

        const data = await response.json();
        trace.success({ userId: session.user.id });

        return NextResponse.json({
            success: true,
            message: 'Privacy consent saved successfully',
            data
        }, { headers: { 'x-correlation-id': correlationId } });

    } catch (error: any) {
        trace.failure(error);
        console.error('Privacy consent API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to save privacy consent',
                details: error.message
            },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}
