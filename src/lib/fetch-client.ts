// Use different URLs for client-side and server-side requests
const getBaseUrl = () => {
    // If we're on the server (SSR/API routes), use the internal Docker network URL
    if (typeof window === 'undefined') {
        return process.env.STRAPI_API_URL || 'http://strapi:1337/api';
    }
    // If we're in the browser (client-side), use localhost
    return process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api';
};

const TIMEOUT = 10000; // 10 seconds

// Function to get CSRF token
const getCsrfToken = async (): Promise<string | null> => {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/csrf`, {
            credentials: 'include',
        });

        if (!response.ok) {
            // CSRF not required/available, return null
            return null;
        }

        const data = await response.json();
        return data.csrfToken;
    } catch (error) {
        console.debug('CSRF token not available:', error);
        return null;
    }
};

// Function to get auth token from NextAuth session or localStorage
const getAuthToken = async (): Promise<string | null> => {
    // Server-side: try to get token from NextAuth session
    if (typeof window === 'undefined') {
        try {
            const { getServerSession } = await import('next-auth/next');
            const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
            const session = await getServerSession(authOptions);

            if (session?.user?.jwt) {
                return session.user.jwt;
            }

            console.warn('🔐 [SERVER] No JWT token found in server session');
            return null;
        } catch (error: any) {
            console.error('🔐 [SERVER] Failed to get server session:', error.message);
            return null;
        }
    } else {
        // Client-side: try NextAuth session first, then localStorage
        try {
            const { getSession } = await import('next-auth/react');
            const session = await getSession();

            if (session?.user?.jwt) {
                return session.user.jwt;
            } else {
                // Fallback to localStorage for direct AuthAPI usage
                const token = localStorage.getItem('strapi-jwt');
                return token;
            }
        } catch (sessionError: any) {
            // If NextAuth is not available, fallback to localStorage
            console.debug('NextAuth session unavailable, using localStorage token:', sessionError.message);
            const token = localStorage.getItem('strapi-jwt');
            return token;
        }
    }
};

// Helper function to create timeout promise
const createTimeoutPromise = (timeout: number): Promise<never> => {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
    });
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

        console.log(`🌐 [${environment}] Using base URL:`, baseUrl, 'for URL:', url);

        // Prepare URL (add base URL if relative)
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        console.log(`🌐 [${environment}] Full URL:`, fullUrl);        // Prepare headers
        console.log(`🌐 [${environment}] Options:`, options);

        const headers: HeadersInit = {
            ...options.headers,
        };

        // Only add Content-Type for non-FormData requests
        const isFormData = options.body instanceof FormData;
        if (!isFormData) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        // Add CSRF token for state-changing operations (but not for auth endpoints)
        const method = (options.method || 'GET').toLowerCase();
        const isAuthEndpoint = url.includes('/auth/local') || url.includes('/users-permissions/');

        // Add auth token
        const authToken = await getAuthToken();
        console.log(`🔑 [${environment}] Token available:`, !!authToken);

        if (authToken && !isAuthEndpoint) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
        }

        // Prepare fetch options
        const fetchOptions: RequestInit = {
            ...options,
            method: method.toUpperCase(),
            headers,
            credentials: 'include', // Enable credentials for CSRF cookies
        };

        console.log(`📤 [${environment}] Making ${fetchOptions.method} request to:`, fullUrl);

        // Make request with timeout
        const fetchPromise = fetch(fullUrl, fetchOptions);
        const timeoutPromise = createTimeoutPromise(TIMEOUT);

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        console.log(`📥 [${environment}] Response status:`, response.status);

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
                console.warn(`🔒 [${environment}] Unauthorized request - clearing tokens`);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('strapi-jwt');
                    window.location.href = '/auth/login';
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
    } catch (error: any) {
        // Re-throw with consistent error handling
        console.error(`💥 [${typeof window === 'undefined' ? 'SERVER' : 'CLIENT'}] Fetch error:`, error.message);
        throw new Error(error.message || 'Request failed');
    }
};

export const fetchApi = {
    get: async <T = any>(url: string, options?: RequestInit): Promise<T> => {
        const response = await fetchClient(url, { ...options, method: 'GET' });
        return response.json();
    },

    post: async <T = any>(url: string, data?: any, options?: RequestInit): Promise<T> => {
        console.log('[fetchApi.post] URL:', url, 'Data:', data, 'Options:', options);

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