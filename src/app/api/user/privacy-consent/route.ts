import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(request: NextRequest) {
    try {
        // Get the session to verify authentication
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const privacyConsent = await request.json();

        console.log('privacyConsent::', privacyConsent);


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

        return NextResponse.json({
            success: true,
            message: 'Privacy consent saved successfully',
            data
        });

    } catch (error: any) {
        console.error('Privacy consent API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to save privacy consent',
                details: error.message
            },
            { status: 500 }
        );
    }
}

