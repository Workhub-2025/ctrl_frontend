import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IPublicUser } from '@/types';

interface AuthState {
    userProfile: IPublicUser | null;
    profileLoaded: boolean;
    setUserProfile: (profile: IPublicUser) => void;
    clearUserProfile: () => void;
    updateProfileField: <K extends keyof IPublicUser>(key: K, value: IPublicUser[K]) => void;
}

/**
 * Session profile cache. The domain API is authoritative.
 * This store avoids re-fetches within the same session.
 */
export const useAuthStore = create<AuthState>()(
    devtools(
        (set) => ({
            userProfile: null,
            profileLoaded: false,
            setUserProfile: (profile) =>
                set({ userProfile: profile, profileLoaded: true }, false, 'auth/setUserProfile'),
            clearUserProfile: () =>
                set({ userProfile: null, profileLoaded: false }, false, 'auth/clearUserProfile'),
            updateProfileField: (key, value) =>
                set(
                    (state) => ({
                        userProfile: state.userProfile
                            ? { ...state.userProfile, [key]: value }
                            : null,
                    }),
                    false,
                    'auth/updateProfileField'
                ),
        }),
    )
);
