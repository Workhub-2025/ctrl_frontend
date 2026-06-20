import { decode, encode } from "next-auth/jwt";
import { NextResponse } from "next/server";

export const TOTP_PENDING_MAX_AGE_SECONDS = 5 * 60;

export type TotpPendingSession = {
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
  redirectPath: string;
};

function pendingCookieName(secure: boolean) {
  return secure ? "__Secure-ctrl.totp-pending" : "ctrl.totp-pending";
}

function isSecureCookieEnv() {
  return process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL === "1";
}

export async function encodeTotpPendingToken(session: TotpPendingSession) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required.");
  }

  return encode({
    secret,
    maxAge: TOTP_PENDING_MAX_AGE_SECONDS,
    token: {
      type: "totp_pending",
      ...session,
    },
  });
}

export async function decodeTotpPendingToken(token: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required.");
  }

  const decoded = await decode({ secret, token });
  if (!decoded || decoded.type !== "totp_pending") {
    return null;
  }

  if (typeof decoded.jwt !== "string" || !decoded.jwt) {
    return null;
  }

  return decoded as TotpPendingSession & { type: string };
}

export function attachTotpPendingCookie(response: NextResponse, token: string) {
  const secure = isSecureCookieEnv();
  response.cookies.set({
    name: pendingCookieName(secure),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: TOTP_PENDING_MAX_AGE_SECONDS,
  });
}

export function clearTotpPendingCookie(response: NextResponse) {
  const secure = isSecureCookieEnv();
  response.cookies.set({
    name: pendingCookieName(secure),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function readTotpPendingCookie(request: Request) {
  const secure = isSecureCookieEnv();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const targetName = pendingCookieName(secure);
  const fallbackName = pendingCookieName(!secure);

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === targetName || rawName === fallbackName) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
