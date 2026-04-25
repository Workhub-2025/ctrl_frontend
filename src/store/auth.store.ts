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
 * Cache de sesión para el perfil del usuario.
 * El servidor (Strapi) es siempre la fuente de verdad.
 * Este store evita re-fetches dentro de la misma sesión.
 * No usa persist — los datos de servidor no deben vivir en localStorage.
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
