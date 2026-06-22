import type { EqualityMonitoringState } from '@/types/users.types';

export interface UserProfileResponse {
    id: number | string;
    firstName?: string;
    lastName?: string;
    email?: string;
    organization?: string;
    phone?: string;
    role?: string;
    agreeToMarketing?: boolean;
    privacyConsent?: Record<string, unknown> | null;
    equalityMonitoring?: EqualityMonitoringState | null;
}

export type UserProfileUpdatePayload = Partial<{
    firstName: string | null;
    lastName: string | null;
    organization: string | null;
    phone: string | null;
    agreeToMarketing: boolean | null;
    privacyConsent: Record<string, unknown> | null;
    equalityMonitoring: EqualityMonitoringState | null;
}>;

export class UserProfileService {
    static async getProfile(): Promise<UserProfileResponse | null> {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                return null;
            }

            return (await response.json()) as UserProfileResponse;
        } catch (error) {
            console.error('[UserProfileService] getProfile failed:', error);
            return null;
        }
    }

    static async updateProfile(data: UserProfileUpdatePayload): Promise<UserProfileResponse> {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                typeof body.error === 'string' ? body.error : 'Profile update failed'
            );
        }

        return body as UserProfileResponse;
    }

    static async downloadDataExport(): Promise<void> {
        const response = await fetch('/api/user/data-export', {
            method: 'GET',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(typeof body.error === 'string' ? body.error : 'Data export failed');
        }

        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match?.[1] ?? 'ctrl-data-export.json';

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    static async requestErasure(): Promise<{ data: { status: string; message: string } }> {
        const response = await fetch('/api/user/erasure-request', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(typeof body.error === 'string' ? body.error : 'Erasure request failed');
        }

        return body as { data: { status: string; message: string } };
    }
}
