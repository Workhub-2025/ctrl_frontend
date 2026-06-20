import { NextResponse } from "next/server";
import { joinStrapiApiPath, getStrapiApiBaseUrl } from "@/lib/strapi-server";
import {
  attachSessionCookie,
  buildPublicUser,
  encodeSessionToken,
  getAuthRequestContext,
} from "@/lib/auth/session-config";
import {
  clearTotpPendingCookie,
  decodeTotpPendingToken,
  readTotpPendingCookie,
} from "@/lib/auth/totp-pending-cookie";
import {
  buildLoginAttemptKey,
  checkLoginAttemptAllowed,
  clearLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/security/login-attempt-guard";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const pendingToken = readTotpPendingCookie(request);
  if (!pendingToken) {
    return NextResponse.json(
      { error: "Your sign-in session expired. Enter your password again." },
      { status: 401 },
    );
  }

  const pending = await decodeTotpPendingToken(pendingToken);
  if (!pending) {
    const response = NextResponse.json(
      { error: "Your sign-in session expired. Enter your password again." },
      { status: 401 },
    );
    clearTotpPendingCookie(response);
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
  }

  const context = getAuthRequestContext(request);
  const attemptKey = buildLoginAttemptKey(`totp:${pending.email ?? "unknown"}`, context.ipAddress);
  const attemptGuard = await checkLoginAttemptAllowed(attemptKey);
  if (!attemptGuard.allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again later." },
      {
        status: 429,
        headers: attemptGuard.retryAfterSeconds
          ? { "Retry-After": String(attemptGuard.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  const verifyResponse = await fetch(
    joinStrapiApiPath(getStrapiApiBaseUrl(), "/auth/admin/totp/verify-login"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pending.jwt}`,
      },
      body: JSON.stringify({ code }),
      cache: "no-store",
    },
  );

  const verifyBody = await verifyResponse.json().catch(() => ({}));
  if (!verifyResponse.ok) {
    if (verifyResponse.status === 429) {
      return NextResponse.json(
        {
          error:
            verifyBody?.error?.message ??
            "Too many verification attempts. Please try again later.",
        },
        {
          status: 429,
          headers: verifyBody?.error?.retryAfterSeconds
            ? { "Retry-After": String(verifyBody.error.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    await recordFailedLoginAttempt(attemptKey);
    return NextResponse.json(
      { error: verifyBody?.error?.message ?? verifyBody?.message ?? "Invalid verification code" },
      { status: 401 },
    );
  }

  await clearLoginAttempts(attemptKey);

  const token = await encodeSessionToken({
    id: pending.id,
    email: pending.email,
    firstName: pending.firstName,
    lastName: pending.lastName,
    role: pending.role,
    jwt: pending.jwt,
    organization: pending.organization,
    phone: pending.phone,
    equalityMonitoring: pending.equalityMonitoring,
    agreeToMarketing: pending.agreeToMarketing,
    agreeToTerms: pending.agreeToTerms,
    agreeToDataPrivacyPolicy: pending.agreeToDataPrivacyPolicy,
  });

  const publicUser = buildPublicUser(
    {
      id: pending.id,
      email: pending.email,
      firstName: pending.firstName,
      lastName: pending.lastName,
      organization: pending.organization,
      phone: pending.phone,
      equalityMonitoring: pending.equalityMonitoring,
      agreeToMarketing: pending.agreeToMarketing,
      agreeToTerms: pending.agreeToTerms,
      agreeToDataPrivacyPolicy: pending.agreeToDataPrivacyPolicy,
    },
    pending.role,
  );

  const response = NextResponse.json({
    data: {
      user: publicUser,
      redirectPath: pending.redirectPath,
      usedBackupCode: verifyBody?.usedBackupCode === true,
    },
  });
  attachSessionCookie(response, token);
  clearTotpPendingCookie(response);
  return response;
}
