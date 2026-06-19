import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<any>;
};

async function requireAdmin(request?: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (!isAdminRole(session.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Administrator access required" }, { status: 403 }),
    };
  }
  const strapiJwt = await getServerStrapiJwt(request);
  if (!strapiJwt) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  return { ok: true as const, session, strapiJwt };
}

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.clientId;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const clientId = await getClientId(context);
    const body = await request.json().catch(() => ({}));

    // Forward the POST request to the Strapi backend endpoint /admin/clients/:id/downgrade-seat
    const BACKEND_URL = process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiUrl = `${BACKEND_URL}/api/admin/clients/${encodeURIComponent(clientId)}/downgrade-seat`;

    const res = await fetch(strapiUrl, {
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
