import { getClientSession } from "@/lib/auth/client-session";

const normalizeApiBaseUrl = (value: string | undefined, fallback: string) => {
    const trimmed = value?.trim() || fallback;
    const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

    return withoutTrailingSlash.endsWith('/api')
        ? withoutTrailingSlash
        : `${withoutTrailingSlash}/api`;
};

const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

// Use different URLs for client-side and server-side requests
const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        return normalizeApiBaseUrl(
            process.env.STRAPI_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL,
            'http://strapi:1337/api'
        );
    }

    // Browser calls go through the Next.js BFF — Strapi JWT stays server-side.
    return '/api/strapi-proxy';
};

const joinUrl = (baseUrl: string, url: string) => {
    if (url.startsWith('http')) {
        return url;
    }

    return `${baseUrl}/${stripLeadingSlashes(url)}`;
};

const TIMEOUT = 10000; // 10 seconds

interface SessionContext {
    jwt: string | null;
    tenant: string | null;
}

// Function to get auth + tenant context from NextAuth session
const getSessionContext = async (): Promise<SessionContext> => {
    // Server-side: try to get token from NextAuth session
    if (typeof window === 'undefined') {
        try {
            const { getServerSession } = await import('next-auth/next');
            const { authOptions } = await import('@/lib/auth/next-auth-options');
            const session = await getServerSession(authOptions);

            return {
                jwt: null,
                tenant: typeof session?.user?.organization === 'string' ? session.user.organization : null,
            };
        } catch (error: unknown) {
            console.error(
                '🔐 [SERVER] Failed to get server session:',
                error instanceof Error ? error.message : error
            );
            return { jwt: null, tenant: null };
        }
    } else {
        const session = await getClientSession();

        return {
            jwt: null,
            tenant: typeof session?.user?.organization === 'string' ? session.user.organization : null,
        };
    }
};

// Enhanced fetch function with interceptor-like functionality
export const fetchClient = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    try {
        // Get the appropriate base URL for the current environment
        const baseUrl = getBaseUrl();
        const environment = typeof window === 'undefined' ? 'SERVER' : 'CLIENT';

        // Prepare URL (add base URL if relative)
        const isBrowserBffRoute =
            typeof window !== 'undefined' &&
            (url.startsWith('/api/') || url.startsWith('http'));
        const fullUrl = isBrowserBffRoute ? url : joinUrl(baseUrl, url);
        // Prepare headers

        const headers: HeadersInit = {
            ...options.headers,
        };
        const headerRecord = headers as Record<string, string>;

        // Only add Content-Type for non-FormData requests
        const isFormData = options.body instanceof FormData;
        if (!isFormData) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        const method = (options.method || 'GET').toLowerCase();
        const hasAuthorizationHeader =
            typeof headerRecord.Authorization === 'string' ||
            typeof headerRecord.authorization === 'string';
        const isAuthEndpoint =
            url.includes('/auth/local') ||
            url.includes('/access-code/register') ||
            url.includes('/users-permissions/') ||
            url.includes('/users/me');

        // Auth / JWT-bootstrap calls must not await getServerSession — it can hang inside route handlers.
        const skipSessionContext = isAuthEndpoint || hasAuthorizationHeader;
        let authToken: string | null = null;
        let tenant: string | null = null;
        if (!skipSessionContext) {
            const sessionContext = await getSessionContext();
            authToken = sessionContext.jwt;
            tenant = sessionContext.tenant;
        }

        if (authToken && !isAuthEndpoint && !hasAuthorizationHeader) {
            headerRecord['Authorization'] = `Bearer ${authToken}`;
        }

        if (tenant && !isAuthEndpoint) {
            headerRecord['x-ctrl-tenant'] = tenant;
        }

        // Determine default cache/revalidate values for GET requests
        let nextOptions = (options as any).next || undefined;
        let cacheOption = options.cache || undefined;

        if (method === 'get') {
            const isStaticResource =
                url.includes('/a-typing-text') ||
                url.includes('/a-sja-question') ||
                url.includes('/a-pja-question') ||
                url.includes('/a-audio-call') ||
                url.includes('/question');

            if (isStaticResource) {
                // Cache static test content for 5 minutes by default
                nextOptions = { revalidate: 300, ...nextOptions };
            } else if (url.includes('/candidate-sessions/me')) {
                // Align with portal in-memory cache (90s)
                nextOptions = { revalidate: 90, ...nextOptions };
            }
        }

        // Prepare fetch options
        const fetchOptions: RequestInit = {
            ...options,
            method: method.toUpperCase(),
            headers,
            credentials: 'include', // Enable credentials for CSRF cookies
            ...(cacheOption ? { cache: cacheOption } : {}),
            ...(nextOptions ? { next: nextOptions } as any : {}),
        };

        // Make request with timeout (AbortSignal aborts the underlying fetch)
        const response = await fetch(fullUrl, {
            ...fetchOptions,
            signal: fetchOptions.signal ?? AbortSignal.timeout(TIMEOUT),
        });

        // Handle response errors
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let rawError: any = null;
            try {
                rawError = await response.json();
                errorMessage = rawError?.error?.message || rawError?.message || errorMessage;
            } catch { /* ignore parse errors */ }
            // Handle 401 Unauthorized
            if (response.status === 401) {
                console.warn(`🔒 [${environment}] Unauthorized request`);
                if (typeof window !== 'undefined') {
                    const returnTo = encodeURIComponent(
                        `${window.location.pathname}${window.location.search}`,
                    );
                    window.location.href = `/auth/register?mode=login&callbackUrl=${returnTo}`;
                }
                throw new Error('Unauthorized - redirecting to login');
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                console.error(`🚫 [${environment}] Forbidden request - insufficient permissions`);
                console.error(`🚫 [${environment}] URL: ${fullUrl}`);
                console.error(`🚫 [${environment}] Method: ${fetchOptions.method}`);
                console.error(`🚫 [${environment}] Has Auth Token: ${!!authToken}`);
            }

            throw new Error(errorMessage);
        }

        return response;
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.name === 'TimeoutError' || error.name === 'AbortError'
                    ? 'Request timeout'
                    : error.message
                : 'Request failed';

        console.error(
            `💥 [${typeof window === 'undefined' ? 'SERVER' : 'CLIENT'}] Fetch error:`,
            message
        );
        throw new Error(message || 'Request failed');
    }
};

export const fetchApi = {
    get: async <T = any>(url: string, options?: RequestInit): Promise<T> => {
        const response = await fetchClient(url, { ...options, method: 'GET' });
        return response.json();
    },

    post: async <T = any>(url: string, data?: any, options?: RequestInit): Promise<T> => {
        // Handle FormData vs JSON data
        const isFormData = data instanceof FormData;
        let body: string | FormData | undefined;
        if (isFormData) {
            body = data;
        } else {
            body = data ? JSON.stringify(data) : undefined;
        }

        const response = await fetchClient(url, {
            ...options,
            method: 'POST',
            body,
        });
        return response.json();
    },

    put: async <T = any>(url: string, data?: any, options?: RequestInit): Promise<T> => {
        // Handle FormData vs JSON data
        const isFormData = data instanceof FormData;
        let body: string | FormData | undefined;
        if (isFormData) {
            body = data;
        } else {
            body = data ? JSON.stringify(data) : undefined;
        }

        const response = await fetchClient(url, {
            ...options,
            method: 'PUT',
            body,
        });
        return response.json();
    },

    patch: async <T = any>(url: string, data?: any, options?: RequestInit): Promise<T> => {
        const response = await fetchClient(url, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
        return response.json();
    },

    delete: async <T = any>(url: string, options?: RequestInit): Promise<T> => {
        const response = await fetchClient(url, { ...options, method: 'DELETE' });

        if (response.status === 204) {
            // No content to return
            return {} as T;
        }

        return response.json();
    },
};

export interface FetchResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
}

export const fetchWithAxiosStructure = async <T = any>(
    url: string,
    options: RequestInit = {}
): Promise<FetchResponse<T>> => {
    const response = await fetchClient(url, options);
    const data = await response.json();

    return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    };
};

export default fetchApi;
