import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth-options";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { getAuthRequestContext } from "@/lib/auth/session-config";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import {
  clearFirebaseSessionCookie,
  getFirebaseSessionCookie,
} from "@/lib/firebase-session-server";
import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

const wantsJsonResponse = (request: Request) =>
  request.headers.get("accept")?.includes("application/json") ?? false;

function clearSessionCookie(response: NextResponse) {
  const secureCookie =
    process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL === "1";

  response.cookies.set({
    name: secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-logout",
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { ipAddress, userAgent } = getAuthRequestContext(request);
  const session = await getServerSession(authOptions);
  const firebaseSessionCookie = await getFirebaseSessionCookie();
  let upstreamRevoked = false;
  if (firebaseSessionCookie) {
    try {
      await createFirebaseDomainApi().logout(firebaseSessionCookie);
      upstreamRevoked = true;
    } catch (error) {
      // Local session material must still be cleared if the revocation service
      // is unavailable. Do not log the opaque cookie or upstream body.
      console.warn("[firebase-logout] upstream revocation failed", {
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  logAuthAuditEvent("logout", {
    email: session?.user?.email,
    ipAddress,
    userAgent,
    userId: session?.user?.id,
  });

  if (wantsJsonResponse(request)) {
    const response = NextResponse.json({
      ok: true,
      upstreamRevoked: firebaseSessionCookie ? upstreamRevoked : undefined,
    });
    clearSessionCookie(response);
    clearFirebaseSessionCookie(response);
    return response;
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  clearSessionCookie(response);
  clearFirebaseSessionCookie(response);
  return response;
}
