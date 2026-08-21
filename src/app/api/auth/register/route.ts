import { NextResponse } from "next/server";
import { firebaseAuthRouteGoneResponse } from "@/lib/auth/firebase-auth-route-gone";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }
  return (
    firebaseAuthRouteGoneResponse() ??
    NextResponse.json(
      {
        error:
          "Public registration is closed. Create an account from a verified invitation.",
      },
      { status: 410 },
    )
  );
}
