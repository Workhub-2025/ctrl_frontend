import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/next-auth-options";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { session, context: actor } =
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

    void context;
    return NextResponse.json(
      {
        error:
          "Invitation tokens are one-shot. Copy the accept link from the create or resend response — it cannot be revealed again.",
      },
      { status: 410 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Invite accept link could not be loaded");
  }
}
