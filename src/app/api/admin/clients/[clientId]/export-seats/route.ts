import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";

type RouteContext = { params: Promise<{ clientId: string }> };

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
  return { ok: true as const, strapiJwt };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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
