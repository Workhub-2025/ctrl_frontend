import "server-only";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

export async function forwardAssessmentRuntime(
  request: NextRequest,
  path: string,
  init: RequestInit = {}
) {
  const [session, jwt] = await Promise.all([
    getServerSession(authOptions),
    getServerStrapiJwt(request),
  ]);
  if (!session?.user?.id || !jwt) {
    return { status: 401, body: { error: "Authentication required" } };
  }
  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), path), {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${jwt}`,
      ...init.headers,
    },
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}
