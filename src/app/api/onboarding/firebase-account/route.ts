import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";
import {
  parseDisplayName,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";
import {
  accountProvisioningRateLimit,
  rejectRateLimitedMutation,
} from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 5_000;

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const provisioningLimit = accountProvisioningRateLimit();
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-account-provisioning",
    limit: provisioningLimit.limit,
    windowMs: provisioningLimit.windowMs,
  });
  if (rateLimited) return rateLimited;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }

  const token = parseInvitationToken(body?.token);
  const displayName = parseDisplayName(body?.displayName);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordIssue = getPasswordPolicyIssue(password, email);
  if (!token || !displayName || !EMAIL_PATTERN.test(email) || passwordIssue) {
    return NextResponse.json(
      {
        error:
          passwordIssue ??
          "A valid invitation, email address and display name are required",
      },
      { status: 400 },
    );
  }

  try {
    const data = await createFirebaseDomainApi().provisionFirebaseAccount({
      token,
      email,
      password,
      displayName,
    });
    return NextResponse.json(
      { data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return handleBffRouteError(error, "Account activation failed");
  }
}

