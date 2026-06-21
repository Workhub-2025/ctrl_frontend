import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";

type RouteContext = {
  params: Promise<any>;
};

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.clientId;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApiAccess('clients.write');
  if ("error" in auth) return auth.error;

  try {
    const clientId = await getClientId(context);
    const body = await request.json().catch(() => ({}));

    const res = await fetch(getAdminClientStrapiUrl(clientId, "downgrade-seat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.strapiJwt}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch {}
      throw new Error(errJson?.error?.message || errJson?.message || errText || "Failed to downgrade seat in backend");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat downgrade failed" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
