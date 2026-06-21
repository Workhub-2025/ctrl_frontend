import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { joinStrapiApiPath, getStrapiApiBaseUrl } from "@/lib/strapi-server";

export async function forwardAdminTotpRequest(
  request: NextRequest,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  const auth = await requireAdminApiAccess("security.manage");
  if ("error" in auth) return auth.error;

  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), path), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.strapiJwt}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } }).error?.message
      ?? (payload as { error?: string }).error
      ?? (payload as { message?: string }).message
      ?? "Request failed";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json({ data: payload });
}
