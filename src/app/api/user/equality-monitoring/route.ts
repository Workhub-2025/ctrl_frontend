import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
    return await handleEqualityMonitoring(request);
}

export async function PUT(request: NextRequest) {
    return await handleEqualityMonitoring(request);
}

async function handleEqualityMonitoring(request: NextRequest) {
    try {
        // Get the session to verify authentication
        const session = await getServerSession(authOptions);
        console.log('session: ', session);


        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const equalityMonitoring = await request.json();

        // Update user's equality monitoring data in Strapi using actual user ID
        console.log('equalityMonitoring: ', equalityMonitoring);

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

        return NextResponse.json({
            success: true,
            message: 'Equality monitoring data saved successfully',
            data
        });

    } catch (error: any) {
        console.error('Equality monitoring API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to save equality monitoring data',
                details: error.message
            },
            { status: 500 }
        );
    }
}