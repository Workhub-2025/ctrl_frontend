import { NextResponse } from "next/server";

import {
  FIREBASE_AUTH_ROUTE_GONE_MESSAGE,
  isFirebaseAuthProvider,
} from "@/lib/auth/auth-provider";

/**
 * Short-circuits legacy Strapi credential/TOTP BFF routes when the deploy is
 * on Firebase Auth. Returns null so Strapi dual-path handlers can continue.
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
