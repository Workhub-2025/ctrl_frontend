import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const strapiJwt = await getServerStrapiJwt(request);
    if (!strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { clientId } = await context.params;
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
