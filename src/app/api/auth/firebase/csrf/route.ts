import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { attachFirebaseCsrfCookie } from "@/lib/firebase-session-server";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-session-csrf",
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const csrfToken = randomBytes(32).toString("base64url");
  const response = NextResponse.json(
    { csrfToken },
    { headers: { "cache-control": "no-store" } },
  );
  attachFirebaseCsrfCookie(response, csrfToken);
  return response;
}
