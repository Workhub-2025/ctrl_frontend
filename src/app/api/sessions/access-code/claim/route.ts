import { NextResponse } from "next/server";

import { requireFirebaseProvisioningSession } from "@/lib/auth/firebase-bff-session";
import { attachFirebaseSessionProjection } from "@/lib/auth/firebase-session-projection";
import { parseDisplayName } from "@/lib/firebase-provisioning-contracts";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

const MAX_BODY_BYTES = 4_096;
const GENERIC_CLAIM_ERROR =
  "Could not join this assessment session. Check your access code and try again.";

function parseIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 8 && normalized.length <= 200 ? normalized : null;
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-session-access-code-claim",
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
  let body: {
    accessCode?: unknown;
    displayName?: unknown;
    idempotencyKey?: unknown;
  } | null = null;
  try {
    body = JSON.parse(rawBody) as {
      accessCode?: unknown;
      displayName?: unknown;
      idempotencyKey?: unknown;
    };
  } catch {
    body = null;
  }

  const accessCode =
    typeof body?.accessCode === "string"
      ? sanitiseAccessCode(body.accessCode)
      : "";
  const displayName = parseDisplayName(body?.displayName);
  const idempotencyKey = parseIdempotencyKey(body?.idempotencyKey);
  if (accessCode.length < 4 || !displayName || !idempotencyKey) {
    return NextResponse.json(
      { error: GENERIC_CLAIM_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const auth = await requireFirebaseProvisioningSession();
    const result = await auth.domainApi.claimSessionAccessCode(
      auth.firebaseSessionCookie,
      { accessCode, displayName, idempotencyKey },
    );
    const userContext = await auth.domainApi.getUserContext(
      auth.firebaseSessionCookie,
    );
    if (userContext.portalRole !== "candidate") {
      return NextResponse.json(
        { error: GENERIC_CLAIM_ERROR },
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
      { error: GENERIC_CLAIM_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}
