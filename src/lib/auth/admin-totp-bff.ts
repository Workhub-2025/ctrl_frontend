import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { joinStrapiApiPath, getStrapiApiBaseUrl } from "@/lib/strapi-server";

async function requireAdminSession(request?: NextRequest) {
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

export async function forwardAdminTotpRequest(
  request: NextRequest,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

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
