import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { session, strapiJwt } = await requireRoleSession("hiring_manager", "admin");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { sessionId } = await context.params;
    const limiter = await applyRateLimit({
      key: `hm-candidate-resend:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    const strapiRes = await fetch(
      joinStrapiApiPath(
        getStrapiApiBaseUrl(),
        `/candidate-sessions/${encodeURIComponent(sessionId)}/resend`
      ),
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
        { error: body?.error?.message || "Failed to resend candidate invitation" },
        { status: strapiRes.status }
      );
    }

    const data = await strapiRes.json().catch(() => ({}));
    return NextResponse.json({ data: data.data ?? null });
  } catch (error) {
    return handleBffRouteError(error, "Candidate invitation could not be resent");
  }
}
