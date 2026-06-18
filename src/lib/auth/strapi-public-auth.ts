import "server-only";

import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

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
  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

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
