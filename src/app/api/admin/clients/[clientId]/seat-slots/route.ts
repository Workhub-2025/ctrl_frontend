import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStrapiErrorStatus } from "@/services/admin-platform.service";

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

function backendUrl(path: string) {
  const base = process.env.STRAPI_API_URL || "http://localhost:1337";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function forwardStrapi(
  request: NextRequest,
  clientId: string,
  suffix: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const res = await fetch(backendUrl(`/api/admin/clients/${encodeURIComponent(clientId)}/${suffix}`), {
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
