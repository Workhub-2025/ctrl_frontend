import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import type { FirebaseSessionExchangeResponse } from "@/lib/firebase-session-contracts";
import {
  FIREBASE_SESSION_COOKIE_NAME,
  FIREBASE_SESSION_CSRF_COOKIE_NAME,
  FIREBASE_SESSION_CSRF_MAX_AGE_SECONDS,
  FIREBASE_SESSION_COOKIE_POLICY,
} from "@/lib/firebase-session-contracts";

/**
 * Trusted Cloud Run -> Vercel BFF response. The BFF writes `sessionCookie` with
 * FIREBASE_SESSION_COOKIE_POLICY and returns only the sanitized public value.
 */
export type TrustedFirebaseSessionExchangeResponse =
  FirebaseSessionExchangeResponse &
    Readonly<{
      sessionCookie: string;
    }>;

export function toPublicFirebaseSessionExchangeResponse(
  trusted: TrustedFirebaseSessionExchangeResponse,
): FirebaseSessionExchangeResponse {
  return {
    expiresAt: trusted.expiresAt,
    user: trusted.user,
  };
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isValidFirebaseSessionCsrfToken(
  submittedToken: unknown,
  cookieToken: string | undefined,
): boolean {
  return (
    typeof submittedToken === "string" &&
    submittedToken.length >= 32 &&
    submittedToken.length <= 256 &&
    typeof cookieToken === "string" &&
    secureEquals(submittedToken, cookieToken)
  );
}

export function attachFirebaseSessionCookie(
  response: NextResponse,
  sessionCookie: string,
  maxAge = FIREBASE_SESSION_COOKIE_POLICY.maxAge,
): void {
  response.cookies.set({
    ...FIREBASE_SESSION_COOKIE_POLICY,
    value: sessionCookie,
    maxAge,
  });
}

export function clearFirebaseSessionCookie(response: NextResponse): void {
  response.cookies.set({
    ...FIREBASE_SESSION_COOKIE_POLICY,
    value: "",
    maxAge: 0,
  });
}

export function attachFirebaseCsrfCookie(
  response: NextResponse,
  csrfToken: string,
): void {
  response.cookies.set({
    name: FIREBASE_SESSION_CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: FIREBASE_SESSION_CSRF_MAX_AGE_SECONDS,
  });
}

export function clearFirebaseCsrfCookie(response: NextResponse): void {
  response.cookies.set({
    name: FIREBASE_SESSION_CSRF_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function getFirebaseSessionCookie(): Promise<string | null> {
  return (await cookies()).get(FIREBASE_SESSION_COOKIE_NAME)?.value ?? null;
}
