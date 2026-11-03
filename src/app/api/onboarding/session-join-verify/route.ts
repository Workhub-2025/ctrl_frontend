import { NextResponse } from "next/server";

import { CloudRunDomainError } from "@/lib/cloud-run-bff-client";
import { createDomainApi } from "@/lib/domain-api";
import {
  accountProvisioningRateLimit,
  rejectRateLimitedMutation,
} from "@/lib/security/api-rate-limit";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

const MAX_BODY_BYTES = 12_000;
const GENERIC_ERROR =
  "We couldn't confirm your account. Check the session code and try again.";
const INACTIVE_CODE_ERROR =
  "This session code isn't valid or has expired. Ask your hiring team for the current code.";

/**
 * Confirms a signed-in candidate's email for a session-code join. The session
 * code stands in for email verification; the ID token proves the password.
 */
export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const limit = accountProvisioningRateLimit();
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "session-join-email-verification",
    limit: limit.limit,
    windowMs: limit.windowMs,
  });
  if (rateLimited) return rateLimited;

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: { "cache-control": "no-store" } },
    );
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  const accessCode = sanitiseAccessCode(body?.accessCode);
  if (!idToken || accessCode.length < 4) {
    return NextResponse.json(
      { error: GENERIC_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const data = await createDomainApi().verifySessionJoinEmail({
      idToken,
      accessCode,
    });
    return NextResponse.json(
      { data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const inactiveCode =
      error instanceof CloudRunDomainError &&
      (error.status === 404 || error.status === 409);
    return NextResponse.json(
      { error: inactiveCode ? INACTIVE_CODE_ERROR : GENERIC_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}
