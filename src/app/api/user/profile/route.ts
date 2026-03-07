import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.jwt) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch complete user profile from Strapi
        const { fetchClient } = await import('@/lib/fetch-client');
        const response = await fetchClient('/users/me?populate=*', {
            headers: {
                Authorization: `Bearer ${session.user.jwt}`,
            },
        });

        const userData = await response.json();

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
        });
    } catch (error: any) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.jwt) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
                { status: response.status }
            );
        }

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
        });
    } catch (error: any) {
        console.error('Error updating user profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}