import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireHmSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { sessionId } = await context.params;
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    const limiter = await applyRateLimit({
      key: `hm-candidate-unlock:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 15,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: {
            "retry-after": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      const strapiRes = await fetch(
        joinStrapiApiPath(getStrapiApiBaseUrl(), `/candidate-sessions/${encodeURIComponent(sessionId)}/unlock`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${strapiJwt}`,
          },
        }
      );

      if (!strapiRes.ok) {
        const body = await strapiRes.json().catch(() => null);
        return NextResponse.json(
          { error: body?.error?.message || "Failed to unlock candidate" },
          { status: strapiRes.status }
        );
      }

      const data = await strapiRes.json();
      return NextResponse.json({ data: data.data });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Candidate could not be unlocked");
  }
}
