import { NextResponse } from "next/server";

import { CloudRunDomainError } from "@/lib/cloud-run-bff-client";
import { createDomainApi } from "@/lib/domain-api";
import {
  parseDisplayName,
  parseInvitationEmail,
} from "@/lib/firebase-provisioning-contracts";
import {
  accountProvisioningRateLimit,
  rejectRateLimitedMutation,
} from "@/lib/security/api-rate-limit";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";

const MAX_BODY_BYTES = 5_000;
const GENERIC_JOIN_ERROR =
  "Your account could not be created. Check the session code and try again.";
const INACTIVE_CODE_ERROR =
  "This session code isn't valid or has expired. Ask your hiring team for the current code.";

/**
 * Creates the candidate's Firebase account for a session-code join. Public
 * sign-up is disabled on the Firebase project, so the browser cannot create
 * the account itself; domainApi does it once the code checks out.
 */
export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const provisioningLimit = accountProvisioningRateLimit();
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-session-join-account-provisioning",
    limit: provisioningLimit.limit,
    windowMs: provisioningLimit.windowMs,
  });
  if (rateLimited) return rateLimited;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
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
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }

  const accessCode = sanitiseAccessCode(body?.accessCode);
  const displayName = parseDisplayName(body?.displayName);
  const email = parseInvitationEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordIssue = getPasswordPolicyIssue(password, email ?? "");
  if (accessCode.length < 4 || !displayName || !email || passwordIssue) {
    return NextResponse.json(
      { error: passwordIssue ?? GENERIC_JOIN_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const data = await createDomainApi().provisionSessionJoinAccount({
      accessCode,
      email,
      password,
      displayName,
    });
    return NextResponse.json(
      { data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    // A bad code is the candidate's to fix; anything else stays generic so
    // the endpoint never reveals whether an email already has an account.
    const inactiveCode =
      error instanceof CloudRunDomainError &&
      (error.status === 404 || error.status === 409);
    return NextResponse.json(
      { error: inactiveCode ? INACTIVE_CODE_ERROR : GENERIC_JOIN_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}
