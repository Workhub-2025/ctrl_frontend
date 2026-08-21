import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FIREBASE_AUTH_ROUTE_GONE_MESSAGE } from "@/lib/auth/auth-provider";

function gone(): NextResponse {
  return NextResponse.json(
    {
      error: FIREBASE_AUTH_ROUTE_GONE_MESSAGE,
      hint: "Use the Firebase authenticator panel on /profile?tab=security.",
    },
    { status: 410 },
  );
}

export async function forwardAdminTotpRequest(
  _request: NextRequest,
  _path: string,
  _method: "GET" | "POST",
  _body?: unknown,
  _rotateSessionJwt = false,
) {
  return gone();
}

export async function forwardPortalTotpRequest(
  _request: NextRequest,
  _path: string,
  _method: "GET" | "POST",
  _body?: unknown,
  _rotateSessionJwt = false,
) {
  return gone();
}
