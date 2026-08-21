import { NextResponse } from "next/server";

import { createDomainApi } from "@/lib/domain-api";
import { CloudRunDomainError } from "@/lib/cloud-run-bff-client";
import { firebasePasswordAccepted } from "@/lib/auth/firebase-password-verify";
import {
  FIREBASE_SESSION_CSRF_COOKIE_NAME,
} from "@/lib/firebase-session-contracts";
import {
  clearFirebaseCsrfCookie,
  isValidFirebaseSessionCsrfToken,
} from "@/lib/firebase-session-server";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

export const dynamic = "force-dynamic";

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-in-person-mfa-bypass",
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 8_192) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (rawBody.length > 8_192) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: {
    email?: unknown;
    password?: unknown;
    accessCode?: unknown;
    csrfToken?: unknown;
  } = {};
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieCsrfToken = getCookie(request, FIREBASE_SESSION_CSRF_COOKIE_NAME);
  if (
    !isValidFirebaseSessionCsrfToken(
      typeof payload.csrfToken === "string" ? payload.csrfToken : undefined,
      cookieCsrfToken,
    )
  ) {
    const response = NextResponse.json(
      { error: "Invalid session exchange request" },
      { status: 403 },
    );
    clearFirebaseCsrfCookie(response);
    return response;
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const accessCode =
    typeof payload.accessCode === "string" && payload.accessCode.trim()
      ? payload.accessCode.trim()
      : undefined;
  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ error: "Credentials not verified." }, { status: 401 });
  }

  try {
    const passwordOk = await firebasePasswordAccepted({ email, password });
    if (!passwordOk) {
      return NextResponse.json({ error: "Credentials not verified." }, { status: 401 });
    }

    const domainApi = createDomainApi();
    const issued = await domainApi.issueInPersonCandidateCustomToken({
      email,
      accessCode,
    });
    const response = NextResponse.json(
      { data: { customToken: issued.customToken } },
      { headers: { "cache-control": "no-store" } },
    );
    clearFirebaseCsrfCookie(response);
    return response;
  } catch (error) {
    const status =
      error instanceof CloudRunDomainError
        ? error.status === 403
          ? 403
          : error.status === 401
            ? 401
            : error.status === 429
              ? 429
              : 403
        : 403;
    const response = NextResponse.json(
      { error: "Two-factor authentication is required" },
      { status, headers: { "cache-control": "no-store" } },
    );
    clearFirebaseCsrfCookie(response);
    return response;
  }
}
