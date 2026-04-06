import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { resolveCorrelationId, startServerActionTrace } from '@/lib/observability/server-observability';
import { applyRateLimit, extractClientIp } from '@/lib/security/api-rate-limit';

export async function GET(request: NextRequest) {
    const correlationId = resolveCorrelationId();
    const trace = startServerActionTrace('profile.get', { correlationId });
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.jwt) {
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

        // Fetch complete user profile from Strapi
        const { fetchClient } = await import('@/lib/fetch-client');
        const response = await fetchClient('/users/me?populate=*', {
            headers: {
                Authorization: `Bearer ${session.user.jwt}`,
            },
        });

        const userData = await response.json();

        trace.success({ userId: session.user.id });
        return NextResponse.json({
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            organization: userData.organization,
            phone: userData.phone,
            role: userData.role?.name || 'Candidate',
            agreeToMarketing: userData.agreeToMarketing,
            privacyConsent: userData.privacyConsent,
            equalityMonitoring: userData.equalityMonitoring,
        }, { headers: { 'x-correlation-id': correlationId } });
    } catch (error: any) {
        trace.failure(error);
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
        const session = await getServerSession(authOptions);

        if (!session?.user?.jwt) {
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
        console.log('Profile update request body:', body);

        const {
            firstName,
            lastName,
            organization,
            phone,
            agreeToMarketing,
            privacyConsent,
            equalityMonitoring
        } = body;

        // Prepare update data, only including defined fields
        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (organization !== undefined) updateData.organization = organization;
        if (phone !== undefined) updateData.phone = phone;
        if (agreeToMarketing !== undefined) updateData.agreeToMarketing = agreeToMarketing;
        if (privacyConsent !== undefined) updateData.privacyConsent = privacyConsent;
        if (equalityMonitoring !== undefined) updateData.equalityMonitoring = equalityMonitoring;

        console.log('Prepared update data:', updateData);

        // Update user profile in Strapi using proper user ID
        const { fetchClient } = await import('@/lib/fetch-client');
        const response = await fetchClient(
            `/api/users/${session.user.id}`,
            {
                method: 'PUT',
                body: JSON.stringify(updateData),
                headers: {
                    Authorization: `Bearer ${session.user.jwt}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const updatedUser = await response.json();
        console.log('Strapi response:', response.status, updatedUser);

        if (!response.ok) {
            console.error('Strapi update failed:', updatedUser);
            return NextResponse.json(
                { error: updatedUser.error?.message || 'Failed to update profile in Strapi' },
                { status: response.status, headers: { 'x-correlation-id': correlationId } }
            );
        }

        trace.success({ userId: session.user.id });
        return NextResponse.json({
            id: updatedUser.id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            organization: updatedUser.organization,
            phone: updatedUser.phone,
            role: updatedUser.role?.name || 'Candidate',
            agreeToMarketing: updatedUser.agreeToMarketing,
            privacyConsent: updatedUser.privacyConsent,
            equalityMonitoring: updatedUser.equalityMonitoring,
        }, { headers: { 'x-correlation-id': correlationId } });
    } catch (error: any) {
        trace.failure(error);
        console.error('Error updating user profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500, headers: { 'x-correlation-id': correlationId } }
        );
    }
}
