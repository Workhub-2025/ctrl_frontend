/**
 * Strapi Client
 *
 * Exposes:
 *  - `strapiServerClient`      – singleton with API token (admin / public ops)
 *  - `getStrapiClient(jwt?)`   – per-request client; uses user JWT when provided,
 *                                falls back to API token
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
    return (
        process.env.STRAPI_API_FULL_ACCESS_TOKEN ||
        process.env.STRAPI_API_TOKEN ||
        process.env.NEXT_PUBLIC_STRAPI_API_TOKEN ||
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
 * Creates a Strapi client using the user's JWT when available, otherwise
 * falls back to the server API token.
 */
export function getStrapiClient(jwt?: string | null) {
    const auth = jwt || getApiToken();
    return strapi({
        baseURL: getBaseUrl(),
        ...(auth ? { auth } : {}),
    });
}

/**
 * Server-side helper: resolves the NextAuth session JWT and returns an
 * authenticated client. Only call from Server Components or Server Actions.
 */
export async function getServerStrapiClient() {
    try {
        const { getServerSession } = await import('next-auth/next');
        const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
        const session = await getServerSession(authOptions);
        return getStrapiClient(session?.user?.jwt);
    } catch {
        return getStrapiClient();
    }
}

// ─── Legacy user-fetch helper (kept for auth endpoints) ──────────────────────

/**
 * @deprecated Use `getStrapiClient(jwt).fetch(path, opts)` instead.
 * Kept for backward compatibility with auth endpoints that pass JWT manually.
 */
export async function strapiUserFetch<T>(
    path: string,
    userJwt: string,
    options?: RequestInit
): Promise<T> {
    const response = await getStrapiClient(userJwt).fetch(path, {
        ...options,
        headers: {
            ...options?.headers,
            Authorization: `Bearer ${userJwt}`,
        },
    });
    return response.json();
}