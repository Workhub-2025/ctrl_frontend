export class AuthAPI {
    /**
     * Request password reset. CTRL emails a reset link; the response never
     * reveals whether the email has an account.
     */
    static async forgotPassword(email: string): Promise<{ ok: boolean }> {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store',
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        if (!response.ok) {
            const body = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? 'Password reset request failed');
        }
        return { ok: true };
    }

    /**
     * Reset password with code
     */
    static async resetPassword(
        code: string,
        password: string,
        passwordConfirmation: string
    ): Promise<{ ok: boolean }> {
        try {
            if (password !== passwordConfirmation) {
                throw new Error('Passwords do not match');
            }
            const { confirmFirebasePasswordRecovery } = await import(
                '@/lib/firebase-totp-browser'
            );
            await confirmFirebasePasswordRecovery(code, password);
            return { ok: true };
        } catch (error: unknown) {
            const { friendlyAuthError } = await import('@/lib/auth-error-message');
            throw new Error(
                friendlyAuthError(
                    error,
                    'This reset link is invalid or has expired. Request a new one.'
                )
            );
        }
    }

}
