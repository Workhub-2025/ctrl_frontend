import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApiAccess('clients.write');
  if ("error" in auth) return auth.error;

  try {
    const { clientId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const res = await fetch(
      getAdminClientStrapiUrl(clientId, "downgrade-seats"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.strapiJwt}`,
        },
        body: JSON.stringify(body),
      },
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        (payload as { error?: { message?: string } }).error?.message
        ?? (payload as { error?: string }).error
        ?? "Seat deactivation failed";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    void invalidateAdminPlatformServerCache();

    return NextResponse.json(payload);
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat deactivation failed" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
