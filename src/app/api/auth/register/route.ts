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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const { ipAddress, userAgent } = getRequestContext(request);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    logAuthAuditEvent("register_attempt", {
      email,
      ipAddress,
      userAgent,
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
    const role = userRole
      ? normalizeRole(userRole)
      : fallbackDevRole ?? "candidate";
    const redirectTo = routeForRole(role);
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
      throw new Error("NEXTAUTH_SECRET is required for registration.");
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

    const response = NextResponse.json({
      data: {
        user: authResponse.user,
        redirectTo,
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

    logAuthAuditEvent("register_success", {
      email,
      ipAddress,
      userAgent,
      role,
      userId: authResponse.user.id,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";

    logAuthAuditEvent("register_failure", {
      email,
      ipAddress,
      userAgent,
      reason: message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
