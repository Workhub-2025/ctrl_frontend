import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

export const SESSION_MAX_AGE =
  Number.parseInt(process.env.SESSION_MAX_AGE_SECONDS || "", 10) ||
  30 * 24 * 60 * 60;

export const SESSION_IDLE_MAX_AGE =
  Number.parseInt(process.env.SESSION_IDLE_MAX_AGE_SECONDS || "", 10) ||
  7 * 24 * 60 * 60;

export function getAuthRequestContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

  return { ipAddress, userAgent };
}

type AuthUserLike = {
  id: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  organization?: unknown;
  phone?: unknown;
  equalityMonitoring?: { completed?: boolean } | Record<string, unknown>;
  agreeToMarketing?: boolean | null;
  agreeToTerms?: boolean | null;
  agreeToDataPrivacyPolicy?: boolean | null;
};

export function buildPublicUser(user: AuthUserLike, role: string) {
  return {
    id: String(user.id),
    email: user.email,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    role,
    firstName: user.firstName,
    lastName: user.lastName,
    organization: typeof user.organization === "string" ? user.organization : undefined,
    phone: typeof user.phone === "string" ? user.phone : undefined,
    equalityMonitoring: user.equalityMonitoring,
    agreeToMarketing: user.agreeToMarketing ?? undefined,
    agreeToTerms: user.agreeToTerms ?? undefined,
    agreeToDataPrivacyPolicy: user.agreeToDataPrivacyPolicy ?? undefined,
  };
}

export function attachSessionCookie(response: NextResponse, token: string) {
  const secureCookie =
    process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL === "1";
  response.cookies.set({
    name: secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

type SessionUserFields = {
  id: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  jwt: string;
  organization?: string;
  phone?: string;
  equalityMonitoring?: { completed?: boolean } | Record<string, unknown>;
  agreeToMarketing?: boolean;
  agreeToTerms?: boolean;
  agreeToDataPrivacyPolicy?: boolean;
};

export async function encodeSessionToken(user: SessionUserFields) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required.");
  }

  const now = Math.floor(Date.now() / 1000);

  return encode({
    secret,
    maxAge: SESSION_MAX_AGE,
    token: {
      sub: String(user.id),
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      role: user.role,
      jwt: user.jwt,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.organization,
      phone: user.phone,
      equalityMonitoring: user.equalityMonitoring,
      agreeToMarketing: user.agreeToMarketing,
      agreeToTerms: user.agreeToTerms,
      agreeToDataPrivacyPolicy: user.agreeToDataPrivacyPolicy,
      lastActivity: now,
    },
  });
}
