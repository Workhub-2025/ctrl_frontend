import { NextResponse } from "next/server";

import { requireFirebaseProvisioningSession } from "@/lib/auth/firebase-bff-session";
import { attachFirebaseSessionProjection } from "@/lib/auth/firebase-session-projection";
import {
  parseDisplayName,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

const MAX_BODY_BYTES = 4_096;
const GENERIC_ACCEPTANCE_ERROR =
  "Invitation could not be accepted. Check the invitation link and try again.";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-candidate-invitation-acceptance",
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: { "cache-control": "no-store" } },
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: { "cache-control": "no-store" } },
    );
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
      { error: GENERIC_ACCEPTANCE_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const auth = await requireFirebaseProvisioningSession();
    const result = await auth.domainApi.acceptCandidateInvitation(
      auth.firebaseSessionCookie,
      { token, displayName },
    );
    const userContext = await auth.domainApi.getUserContext(
      auth.firebaseSessionCookie,
    );
    if (userContext.portalRole !== "candidate") {
      return NextResponse.json(
        { error: GENERIC_ACCEPTANCE_ERROR },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
    const response = NextResponse.json({
      data: { ...result, redirectPath: "/candidate-dashboard/" },
    });
    response.headers.set("cache-control", "no-store");
    await attachFirebaseSessionProjection(response, userContext);
    return response;
  } catch {
    return NextResponse.json(
      { error: GENERIC_ACCEPTANCE_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}
