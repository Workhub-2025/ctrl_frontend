import { getClientSession } from "@/lib/auth/client-session";

const TIMEOUT = 10000; // 10 seconds

interface SessionContext {
    tenant: string | null;
}

// Browser-only session context. Server callers must pass tenant via headers or use API routes.
const getSessionContext = async (): Promise<SessionContext> => {
    if (typeof window === 'undefined') {
        return { tenant: null };
    }

    const session = await getClientSession();

    return {
        tenant: typeof session?.user?.organization === 'string' ? session.user.organization : null,
    };
};

// Enhanced fetch function with interceptor-like functionality
export const fetchClient = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    try {
        const environment = typeof window === 'undefined' ? 'SERVER' : 'CLIENT';
        const fullUrl = url.startsWith('http')
            ? url
            : url.startsWith('/')
                ? url
                : `/${url.replace(/^\/+/, '')}`;
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
        // Explicitly authorised requests already contain all required identity context.
        const skipSessionContext = hasAuthorizationHeader;
        let tenant: string | null = null;
        if (!skipSessionContext) {
            const sessionContext = await getSessionContext();
            tenant = sessionContext.tenant;
        }

        if (tenant) {
            headerRecord['x-ctrl-tenant'] = tenant;
        }

        // Determine default cache/revalidate values for GET requests
        let nextOptions = (options as any).next || undefined;
        let cacheOption = options.cache || undefined;

        if (method === 'get') {
            if (url.includes('/candidate/workspace')) {
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
                console.error(`🚫 [${environment}] Has Authorization Header: ${hasAuthorizationHeader}`);
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
