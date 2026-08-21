import { NextResponse } from "next/server";

import {
  FIREBASE_AUTH_ROUTE_GONE_MESSAGE,
  isFirebaseAuthProvider,
} from "@/lib/auth/auth-provider";

/**
 * Returns 410 for retired credential/TOTP BFF routes. Browser auth uses
 * Firebase Auth (session cookie exchange, password recovery, authenticator enrolment).
 */
export function firebaseAuthRouteGoneResponse(): NextResponse | null {
  if (!isFirebaseAuthProvider()) {
    return null;
  }
  return NextResponse.json(
    { error: FIREBASE_AUTH_ROUTE_GONE_MESSAGE },
    { status: 410 },
  );
}
