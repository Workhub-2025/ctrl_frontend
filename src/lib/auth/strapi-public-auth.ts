import "server-only";

import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";
import { isFetchTimeoutError } from "@/lib/strapi-connectivity";

const STRAPI_AUTH_TIMEOUT_MS = 10_000;

type StrapiAuthResult<T = unknown> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

export async function postStrapiAuth<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<StrapiAuthResult<T>> {
  let response: Response;

  try {
    response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(STRAPI_AUTH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isFetchTimeoutError(error)) {
      return {
        ok: false,
        status: 504,
        error:
          "Authentication service timed out. On Vercel, set STRAPI_API_URL=https://be.ctrl-assess.co.uk/api (not a private LAN IP).",
      };
    }

    return {
      ok: false,
      status: 503,
      error: error instanceof Error ? error.message : "Authentication service unavailable",
    };
  }

  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const errorBody = data as { error?: { message?: string }; message?: string } | null;
    return {
      ok: false,
      status: response.status,
      error:
        errorBody?.error?.message ??
        errorBody?.message ??
        `Strapi responded ${response.status}`,
    };
  }

  return { ok: true, status: response.status, data: data ?? undefined };
}
