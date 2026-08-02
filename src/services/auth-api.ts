export class AuthAPI {
    /**
     * Request password reset
     */
    static async forgotPassword(email: string): Promise<{ ok: boolean }> {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { sendFirebasePasswordRecovery } = await import(
                '@/lib/firebase-totp-browser'
            );
            // Keep the response non-enumerating even if Firebase reports
            // that an address is not registered.
            await sendFirebasePasswordRecovery(normalizedEmail).catch(() => undefined);
            return { ok: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
            throw new Error(errorMessage);
        }
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
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            throw new Error(errorMessage);
        }
    }

}
