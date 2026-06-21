import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
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
      getAdminClientStrapiUrl(clientId, "export-seats"),
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
        ?? "Seat export could not be sent";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat export could not be sent" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
