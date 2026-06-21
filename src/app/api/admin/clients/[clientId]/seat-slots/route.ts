import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";

type RouteContext = { params: Promise<{ clientId: string }> };

async function forwardStrapi(
  request: NextRequest,
  clientId: string,
  suffix: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  const auth = await requireAdminApiAccess('clients.read');
  if ("error" in auth) return auth.error;

  const res = await fetch(getAdminClientStrapiUrl(clientId, suffix), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.strapiJwt}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (payload as { error?: { message?: string } }).error?.message
      ?? (payload as { error?: string }).error
      ?? (payload as { message?: string }).message
      ?? "Request failed";
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json(payload);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params;
    return forwardStrapi(request, clientId, "seat-slots", "GET");
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat slots could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
