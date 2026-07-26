import { NextResponse } from "next/server";

import { requireFirebaseProvisioningSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { attachFirebaseSessionProjection } from "@/lib/auth/firebase-session-projection";
import { parseDisplayName } from "@/lib/firebase-provisioning-contracts";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { routeForRole } from "@/lib/auth/role-model";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-bootstrap-administrator",
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;
  if (Number(request.headers.get("content-length") ?? "0") > 2_048) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 2_048) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: { displayName?: unknown } | null = null;
  try {
    body = JSON.parse(rawBody) as { displayName?: unknown };
  } catch {
    body = null;
  }
  const displayName = parseDisplayName(body?.displayName);
  if (!displayName) {
    return NextResponse.json({ error: "A valid display name is required" }, { status: 400 });
  }

  try {
    const auth = await requireFirebaseProvisioningSession();
    const result = await auth.domainApi.bootstrapAdministrator(
      auth.firebaseSessionCookie,
      { displayName },
    );
    const userContext = await auth.domainApi.getUserContext(
      auth.firebaseSessionCookie,
      { sensitive: true },
    );
    const response = NextResponse.json({
      data: { ...result, redirectPath: routeForRole(userContext.portalRole) },
    });
    await attachFirebaseSessionProjection(response, userContext);
    return response;
  } catch (error) {
    return handleBffRouteError(error, "Administrator bootstrap failed");
  }
}
