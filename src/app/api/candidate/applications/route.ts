import { NextRequest, NextResponse } from "next/server";
import { getStrapiClient } from "@/lib/strapi";
import {
  handleBffRouteError,
  requireCandidateSession,
} from "@/lib/auth/bff-session";
import { invalidateCandidateWorkspaceServerCache } from "@/lib/portal-cache-invalidation";
import { getServerAuthSub } from "@/lib/portal-server-auth";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";

/** Join a candidate application via access code. List applications via GET /api/candidate/workspace. */
export async function POST(request: NextRequest) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session, strapiJwt } = await requireCandidateSession();
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "candidate:link-session",
      actorId: session.user.id,
      limit: 12,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const payload = (await request.json()) as { accessCode?: string };
    const accessCode = sanitiseAccessCode(payload?.accessCode);

    if (!accessCode || accessCode.length < 4) {
      return NextResponse.json({ error: "Enter a valid access code" }, { status: 400 });
    }

    const client = getStrapiClient(strapiJwt);
    const response = await client.fetch("/candidate-sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      void invalidateCandidateWorkspaceServerCache(await getServerAuthSub());
    }

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return handleBffRouteError(error, "Could not link access code");
  }
}
