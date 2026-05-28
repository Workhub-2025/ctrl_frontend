import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { AuthAPI } from "@/services/auth-api";
import { inferDevSeededRole, normalizeRole, routeForRole } from "@/lib/auth/role-model";
import { logAuthAuditEvent } from "@/lib/security/audit-log";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

const getRequestContext = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

  return { ipAddress, userAgent };
};

const resolveCallbackPath = (value: FormDataEntryValue | null, role: string) => {
  const fallback = routeForRole(role);

  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  try {
    const parsed = value.startsWith("http")
      ? new URL(value)
      : new URL(value, "http://localhost");

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const { ipAddress, userAgent } = getRequestContext(request);

  if (!email || !password) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "CredentialsSignin");
    return NextResponse.redirect(loginUrl, 303);
  }

  try {
    logAuthAuditEvent("login_attempt", {
      email,
      ipAddress,
      userAgent,
    });

    const authResponse = await AuthAPI.login({
      identifier: email,
      password,
    });

    if (!authResponse.jwt || !authResponse.user) {
      throw new Error("Invalid Strapi auth response");
    }

    const userRole = authResponse.user.role;
    const fallbackDevRole = inferDevSeededRole(authResponse.user.email || email);
    const role = userRole
      ? normalizeRole(userRole)
      : fallbackDevRole ?? "candidate";

    const callbackPath = resolveCallbackPath(formData.get("callbackUrl"), role);
    const response = NextResponse.redirect(new URL(callbackPath, request.url), 303);
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
      throw new Error("NEXTAUTH_SECRET is required for login.");
    }

    const token = await encode({
      secret,
      maxAge: SESSION_MAX_AGE,
      token: {
        sub: String(authResponse.user.id),
        email: authResponse.user.email,
        name: `${authResponse.user.firstName || ""} ${authResponse.user.lastName || ""}`.trim(),
        role,
        jwt: authResponse.jwt,
        firstName: authResponse.user.firstName,
        lastName: authResponse.user.lastName,
        organization: typeof authResponse.user.organization === "string" ? authResponse.user.organization : undefined,
        phone: typeof authResponse.user.phone === "string" ? authResponse.user.phone : undefined,
        equalityMonitoring: authResponse.user.equalityMonitoring,
        agreeToMarketing: authResponse.user.agreeToMarketing ?? undefined,
        agreeToTerms: authResponse.user.agreeToTerms ?? undefined,
        agreeToDataPrivacyPolicy: authResponse.user.agreeToDataPrivacyPolicy ?? undefined,
      },
    });

    const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL === "1";
    response.cookies.set({
      name: secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    logAuthAuditEvent("login_success", {
      email,
      ipAddress,
      userAgent,
      role,
      userId: authResponse.user.id,
    });

    return response;
  } catch (error) {
    logAuthAuditEvent("login_failure", {
      email,
      ipAddress,
      userAgent,
      reason: error instanceof Error ? error.message : "Unknown error",
    });

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "CredentialsSignin");
    return NextResponse.redirect(loginUrl, 303);
  }
}
