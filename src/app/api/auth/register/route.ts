import { NextResponse } from "next/server";
import { AuthAPI } from "@/services/auth-api";
import { inferDevSeededRole, normalizeRole, routeForRole } from "@/lib/auth/role-model";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import {
  CredentialAuthError,
  enforceRegisterRateLimit,
} from "@/lib/auth/credential-auth";
import {
  attachSessionCookie,
  buildPublicUser,
  encodeSessionToken,
  getAuthRequestContext,
} from "@/lib/auth/session-config";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const context = getAuthRequestContext(request);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    await enforceRegisterRateLimit(context);

    logAuthAuditEvent("register_attempt", {
      email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const authResponse = await AuthAPI.register({
      ...body,
      email,
      username: body?.username || email,
      password,
    });

    if (!authResponse.jwt || !authResponse.user) {
      throw new Error("Invalid Strapi registration response");
    }

    const userRole = authResponse.user.role;
    const fallbackDevRole = inferDevSeededRole(authResponse.user.email || email);
    const role = userRole ? normalizeRole(userRole) : fallbackDevRole ?? "candidate";
    const redirectTo = routeForRole(role);

    const token = await encodeSessionToken({
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName,
      lastName: authResponse.user.lastName,
      role,
      jwt: authResponse.jwt,
      organization:
        typeof authResponse.user.organization === "string"
          ? authResponse.user.organization
          : undefined,
      phone:
        typeof authResponse.user.phone === "string" ? authResponse.user.phone : undefined,
      equalityMonitoring: authResponse.user.equalityMonitoring,
      agreeToMarketing: authResponse.user.agreeToMarketing ?? undefined,
      agreeToTerms: authResponse.user.agreeToTerms ?? undefined,
      agreeToDataPrivacyPolicy: authResponse.user.agreeToDataPrivacyPolicy ?? undefined,
    });

    const response = NextResponse.json({
      data: {
        user: buildPublicUser(authResponse.user, role),
        redirectTo,
      },
    });
    attachSessionCookie(response, token);

    logAuthAuditEvent("register_success", {
      email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      role,
      userId: authResponse.user.id,
    });

    return response;
  } catch (error) {
    if (error instanceof CredentialAuthError && error.code === "RATE_LIMITED") {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: error.retryAfterSeconds
            ? { "Retry-After": String(error.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    const message = error instanceof Error ? error.message : "Registration failed";

    logAuthAuditEvent("register_failure", {
      email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: "Registration failed",
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
