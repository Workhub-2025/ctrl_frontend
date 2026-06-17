import "server-only";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

export function getStrapiApiBaseUrl(): string {
  const raw =
    process.env.STRAPI_API_URL ??
    process.env.NEXT_PUBLIC_STRAPI_API_URL ??
    "http://127.0.0.1:1337/api";
  const trimmed = stripTrailingSlashes(raw.trim());
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

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
  const normalizedPath = path.replace(/^\/+/, "");
  const response = await fetch(`${getStrapiApiBaseUrl()}/${normalizedPath}`, {
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
