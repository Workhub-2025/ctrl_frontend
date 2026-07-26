/**
 * Thin legacy CMS HTTP client (replaces @strapi/client).
 * Quarantined for production dual-path; Firebase Preview must not use this.
 */

import { getCmsApiBaseUrl, stripLeadingSlashes } from "@/legacy-cms/server-url";

type CmsFetchInit = RequestInit & { params?: Record<string, string | number | boolean | undefined> };

function getApiToken(): string | undefined {
  return (
    process.env.STRAPI_API_FULL_ACCESS_TOKEN ||
    process.env.STRAPI_API_FULL_ACCCESS_TOKEN ||
    process.env.STRAPI_API_TOKEN ||
    undefined
  );
}

function buildUrl(path: string, params?: CmsFetchInit["params"]) {
  const url = new URL(
    stripLeadingSlashes(path),
    `${getCmsApiBaseUrl().replace(/\/?$/, "/")}`,
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export type CmsClient = {
  fetch: <T = unknown>(path: string, init?: CmsFetchInit) => Promise<T>;
  collection: (name: string) => {
    find: (params?: Record<string, unknown>) => Promise<{ data: unknown[] }>;
    findOne: (
      id: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown }>;
    create: (data: Record<string, unknown>) => Promise<{ data: unknown }>;
    update: (
      id: string,
      data: Record<string, unknown>,
    ) => Promise<{ data: unknown }>;
    delete: (id: string) => Promise<{ data: unknown }>;
  };
};

function createClient(authToken?: string | null): CmsClient {
  const token = authToken || getApiToken();

  async function cmsFetch<T = unknown>(path: string, init?: CmsFetchInit): Promise<T> {
    const { params, ...rest } = init ?? {};
    const headers = new Headers(rest.headers);
    if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(buildUrl(path, params), {
      cache: "no-store",
      ...rest,
      headers,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        (body as { error?: { message?: string } | string } | null)?.error;
      throw new Error(
        typeof message === "string"
          ? message
          : message?.message || `Legacy CMS responded ${response.status}`,
      );
    }
    return body as T;
  }

  return {
    fetch: cmsFetch,
    collection(name: string) {
      return {
        find(params) {
          return cmsFetch(`/${name}`, {
            params: params as CmsFetchInit["params"],
          });
        },
        findOne(id, params) {
          return cmsFetch(`/${name}/${encodeURIComponent(id)}`, {
            params: params as CmsFetchInit["params"],
          });
        },
        update(id, data) {
          return cmsFetch(`/${name}/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: JSON.stringify({ data }),
          });
        },
        create(data) {
          return cmsFetch(`/${name}`, {
            method: "POST",
            body: JSON.stringify({ data }),
          });
        },
        delete(id) {
          return cmsFetch(`/${name}/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
        },
      };
    },
  };
}

let _serverClient: CmsClient | null = null;

function getServerClientInstance() {
  if (!_serverClient) {
    if (!getApiToken()) {
      console.warn("[legacy-cms] No API token found; unauthenticated requests may fail.");
    }
    _serverClient = createClient();
  }
  return _serverClient;
}

export const cmsServerClient = new Proxy({} as CmsClient, {
  get(_, prop: string) {
    return (getServerClientInstance() as unknown as Record<string, unknown>)[prop];
  },
});

export function getCmsClient(jwt?: string | null) {
  return createClient(jwt);
}

export async function getServerCmsClient() {
  const { getServerCmsJwt } = await import("@/legacy-cms/jwt");
  const jwt = await getServerCmsJwt();
  if (!jwt) {
    throw new Error("Authenticated legacy CMS session is required.");
  }
  return getCmsClient(jwt);
}

/** @deprecated Use cmsServerClient */
export const strapiServerClient = cmsServerClient;
/** @deprecated Use getCmsClient */
export const getStrapiClient = getCmsClient;
/** @deprecated Use getServerCmsClient */
export const getServerStrapiClient = getServerCmsClient;
