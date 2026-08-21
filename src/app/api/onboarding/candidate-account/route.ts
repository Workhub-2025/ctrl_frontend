import { NextResponse } from "next/server";

import {
  parseDisplayName,
  parseInvitationEmail,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";
import { createDomainApi } from "@/lib/domain-api";
import {
  accountProvisioningRateLimit,
  rejectRateLimitedMutation,
} from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";

const MAX_BODY_BYTES = 5_000;
const GENERIC_ACTIVATION_ERROR =
  "Account could not be activated. Check the invitation link and try again.";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const provisioningLimit = accountProvisioningRateLimit();
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-candidate-account-provisioning",
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

  const token = parseInvitationToken(body?.token);
  const displayName = parseDisplayName(body?.displayName);
  const email = parseInvitationEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordIssue = getPasswordPolicyIssue(password, email ?? "");
  if (!token || !displayName || !email || passwordIssue) {
    return NextResponse.json(
      { error: passwordIssue ?? GENERIC_ACTIVATION_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const data = await createDomainApi().provisionCandidateAccount({
      token,
      email,
      password,
      displayName,
    });
    return NextResponse.json(
      { data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    // Public onboarding deliberately does not disclose whether a token, email
    // or Firebase identity exists.
    return NextResponse.json(
      { error: GENERIC_ACTIVATION_ERROR },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}
