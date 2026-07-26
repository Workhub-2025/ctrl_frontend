import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/next-auth-options";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { invitationAcceptUrl } from "@/lib/public-app-urls";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { session, context: actor, tenancy } =
      await requireFirebaseTenancySession("client");
    if (!actor.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const authSession = session ?? (await getServerSession(authOptions));
    const limiter = await applyRateLimit({
      key: `client-invite-accept-link:${authSession?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: { "retry-after": String(limiter.retryAfterSeconds) },
        },
      );
    }

    const { invitationId } = await context.params;
    const material = await tenancy.revealInvitationAcceptMaterial(invitationId);
    return NextResponse.json({
      data: {
        inviteAcceptUrl: invitationAcceptUrl(
          request,
          material.token,
          material.email,
        ),
        email: material.email,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Invite accept link could not be loaded");
  }
}
