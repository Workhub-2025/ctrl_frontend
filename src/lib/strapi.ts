/**
 * Strapi Client
 *
 * Exposes:
 *  - `strapiServerClient`      – singleton with API token (admin / public ops)
 *  - `getStrapiClient(jwt?)`   – per-request client; uses only the explicitly
 *                                supplied user JWT
 *  - `getServerStrapiClient()` – async helper that resolves NextAuth JWT and
 *                                returns an authenticated client (server-only)
 */

import { strapi } from '@strapi/client';

// ─── Config helpers ───────────────────────────────────────────────────────────

function getBaseUrl(): string {
    if (globalThis.window === undefined) {
        return process.env.STRAPI_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_API_URL ?? 'http://localhost:1337/api';
    }
    return process.env.NEXT_PUBLIC_STRAPI_API_URL ?? 'http://localhost:1337/api';
}

function getApiToken(): string | undefined {
    // Use || so empty strings also fall through to undefined — prevents
    // @strapi/client from throwing "A valid API token is required" at init.
    // NEVER read NEXT_PUBLIC_* here: those are bundled into client JS and must
    // not be usable as a full-access server token.
    return (
        process.env.STRAPI_API_FULL_ACCESS_TOKEN ||
        process.env.STRAPI_API_FULL_ACCCESS_TOKEN ||
        process.env.STRAPI_API_TOKEN ||
        undefined
    );
}

// ─── Singleton with API token (lazy to avoid module-init crash) ─────────────────

let _serverClientInstance: ReturnType<typeof strapi> | null = null;

function getServerClientInstance() {
    if (!_serverClientInstance) {
        const token = getApiToken();
        if (!token) {
            console.warn('[strapi] No API token found; unauthenticated requests may fail.');
        }
        _serverClientInstance = strapi({
            baseURL: getBaseUrl(),
            ...(token ? { auth: token } : {}),
        });
    }
    return _serverClientInstance;
}

export const strapiServerClient = new Proxy({} as ReturnType<typeof strapi>, {
    get(_, prop: string) {
        return (getServerClientInstance() as unknown as Record<string, unknown>)[prop];
    },
});

// ─── Per-request factory ──────────────────────────────────────────────────────

/**
 * Creates a Strapi client using only the explicitly supplied user's JWT.
 * Privileged service-token access must use `strapiServerClient` so an auth
 * resolution failure can never silently become a full-access request.
 */
export function getStrapiClient(jwt?: string | null) {
    return strapi({
        baseURL: getBaseUrl(),
        ...(jwt ? { auth: jwt } : {}),
    });
}

/**
 * Server-side helper: resolves the NextAuth session JWT and returns an
 * authenticated client. Only call from Server Components or Server Actions.
 */
export async function getServerStrapiClient() {
    const { getServerStrapiJwt } = await import('@/lib/auth/strapi-jwt');
    const jwt = await getServerStrapiJwt();
    if (!jwt) {
        throw new Error('Authenticated Strapi session is required.');
    }
    return getStrapiClient(jwt);
}
