import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminApiAccess('clients.write');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;const { clientId } = await context.params;
    const response = await fetch(
      joinStrapiApiPath(
        getStrapiApiBaseUrl(),
        `/admin/clients/${encodeURIComponent(clientId)}/reactivate`
      ),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${strapiJwt}`,
        },
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        body?.error?.message ||
        body?.error ||
        body?.message ||
        `Strapi responded ${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(body);
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Client could not be reactivated" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
