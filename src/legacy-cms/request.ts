import "server-only";

import { getServerCmsJwt } from "@/legacy-cms/jwt";
import {
  getCmsApiBaseUrl,
  joinCmsApiPath,
} from "@/legacy-cms/server-url";

class CmsRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CmsRequestError";
    this.status = status;
  }
}

export { CmsRequestError };

/** Authenticated fetch against the legacy CMS REST API (production dual-path). */
export async function cmsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = await getServerCmsJwt();
  if (!jwt) {
    throw new Error("Authentication required");
  }

  const response = await fetch(joinCmsApiPath(getCmsApiBaseUrl(), path), {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body?.error?.message || body?.error || `Legacy CMS responded ${response.status}`;
    throw new CmsRequestError(message, response.status);
  }

  return body as T;
}

export function getCmsErrorStatus(error: unknown) {
  return error instanceof CmsRequestError ? error.status : null;
}

/** @deprecated Use cmsRequest */
export const strapiRequest = cmsRequest;
/** @deprecated Use getCmsErrorStatus */
export const getStrapiErrorStatus = getCmsErrorStatus;
/** @deprecated Use CmsRequestError */
export const StrapiRequestError = CmsRequestError;
