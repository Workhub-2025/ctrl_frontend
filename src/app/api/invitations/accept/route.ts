import { NextResponse } from "next/server";

import { requireFirebaseProvisioningSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { attachFirebaseSessionProjection } from "@/lib/auth/firebase-session-projection";
import {
  parseDisplayName,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { routeForRole } from "@/lib/auth/role-model";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-invitation-acceptance",
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 4_096) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: { token?: unknown; displayName?: unknown } | null = null;
  try {
    body = JSON.parse(rawBody) as {
      token?: unknown;
      displayName?: unknown;
    };
  } catch {
    body = null;
  }
  const token = parseInvitationToken(body?.token);
  const displayName = parseDisplayName(body?.displayName);
  if (!token || !displayName) {
    return NextResponse.json(
      { error: "A valid invitation token and display name are required" },
      { status: 400 },
    );
  }

  try {
    const auth = await requireFirebaseProvisioningSession();
    const result = await auth.domainApi.acceptInvitation(
      auth.firebaseSessionCookie,
      { token, displayName },
    );
    const userContext = await auth.domainApi.getUserContext(
      auth.firebaseSessionCookie,
    );
    const response = NextResponse.json({
      data: { ...result, redirectPath: routeForRole(userContext.portalRole) },
    });
    await attachFirebaseSessionProjection(response, userContext);
    return response;
  } catch (error) {
    return handleBffRouteError(error, "Invitation acceptance failed");
  }
}
