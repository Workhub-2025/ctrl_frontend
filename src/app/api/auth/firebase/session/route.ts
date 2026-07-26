import { NextResponse } from "next/server";

import { attachFirebaseSessionProjection, resolveFirebaseSessionRole } from "@/lib/auth/firebase-session-projection";
import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";
import { CloudRunDomainError } from "@/lib/cloud-run-bff-client";
import {
  FIREBASE_SESSION_CSRF_COOKIE_NAME,
  FIREBASE_SESSION_MAX_AGE_SECONDS,
  type FirebaseSessionExchangeRequest,
  type FirebaseSessionExchangeResponse,
} from "@/lib/firebase-session-contracts";
import {
  attachFirebaseSessionCookie,
  clearFirebaseCsrfCookie,
  isValidFirebaseSessionCsrfToken,
} from "@/lib/firebase-session-server";
import { routeForRole } from "@/lib/auth/role-model";
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
    scope: "firebase-session-exchange",
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 20_480) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (rawBody.length > 20_480) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let payload: FirebaseSessionExchangeRequest | null = null;
  try {
    payload = JSON.parse(rawBody) as FirebaseSessionExchangeRequest;
  } catch {
    payload = null;
  }
  const cookieCsrfToken = getCookie(request, FIREBASE_SESSION_CSRF_COOKIE_NAME);

  if (!isValidFirebaseSessionCsrfToken(payload?.csrfToken, cookieCsrfToken)) {
    return NextResponse.json({ error: "Invalid session exchange request" }, { status: 403 });
  }
  if (
    typeof payload?.idToken !== "string" ||
    payload.idToken.length < 100 ||
    payload.idToken.length > 16_384
  ) {
    const response = NextResponse.json(
      { error: "Invalid Firebase ID token" },
      { status: 400 },
    );
    clearFirebaseCsrfCookie(response);
    return response;
  }
  if (
    payload.intent !== undefined &&
    payload.intent !== "invitation_acceptance" &&
    payload.intent !== "session_access_code_claim"
  ) {
    return NextResponse.json({ error: "Invalid provisioning intent" }, { status: 400 });
  }

  try {
    const domainApi = createFirebaseDomainApi();
    const exchanged = await domainApi.exchangeSession(payload.idToken);
    const maxAge = Math.min(
      FIREBASE_SESSION_MAX_AGE_SECONDS,
      Math.max(1, Math.floor(exchanged.expiresInMilliseconds / 1_000)),
    );
    const expiresAt = new Date(Date.now() + maxAge * 1_000).toISOString();
    if (
      payload.intent === "invitation_acceptance" ||
      payload.intent === "session_access_code_claim"
    ) {
      const response = NextResponse.json(
        {
          data: {
            expiresAt,
            provisioningRequired: true,
            redirectPath:
              payload.intent === "session_access_code_claim"
                ? "/join"
                : "/auth/accept-invitation",
          },
        },
        { headers: { "cache-control": "no-store" } },
      );
      attachFirebaseSessionCookie(response, exchanged.sessionCookie, maxAge);
      clearFirebaseCsrfCookie(response);
      return response;
    }

    let userContext;
    try {
      userContext = await domainApi.getUserContext(exchanged.sessionCookie);
    } catch (contextError) {
      // Unprovisioned Auth users have a valid Firebase session cookie but no
      // application identity yet. domainApi returns 401 for that case; accept
      // legacy 403 "No active application identity" during rollout overlap.
      const isUnprovisioned =
        contextError instanceof CloudRunDomainError &&
        (contextError.status === 401 ||
          (contextError.status === 403 &&
            /no active application identity/i.test(contextError.message)));
      if (!isUnprovisioned) {
        throw contextError;
      }
      const bootstrap = await domainApi.getAdministratorBootstrapStatus(
        exchanged.sessionCookie,
      );
      const redirectPath =
        bootstrap.status === "pending"
          ? "/auth/bootstrap"
          : "/auth/accept-invitation";
      const response = NextResponse.json(
        {
          data: {
            expiresAt,
            provisioningRequired: true,
            bootstrapStatus: bootstrap.status,
            redirectPath,
          },
        },
        { headers: { "cache-control": "no-store" } },
      );
      attachFirebaseSessionCookie(response, exchanged.sessionCookie, maxAge);
      clearFirebaseCsrfCookie(response);
      return response;
    }
    const body: FirebaseSessionExchangeResponse & { redirectPath: string } = {
      expiresAt,
      user: {
        userId: userContext.userId,
        portalRole: userContext.portalRole,
        role: resolveFirebaseSessionRole(userContext),
        organizationId: userContext.organizationId,
      },
      redirectPath: routeForRole(resolveFirebaseSessionRole(userContext)),
    };
    const response = NextResponse.json(
      { data: body },
      { headers: { "cache-control": "no-store" } },
    );
    attachFirebaseSessionCookie(response, exchanged.sessionCookie, maxAge);
    await attachFirebaseSessionProjection(response, userContext, {
      secondFactorSatisfied: exchanged.secondFactorSatisfied,
    });
    clearFirebaseCsrfCookie(response);
    return response;
  } catch (error) {
    console.error("[firebase-session] exchange failed", {
      error: error instanceof Error ? error.name : "UnknownError",
      status: error instanceof CloudRunDomainError ? error.status : undefined,
      message: error instanceof Error ? error.message.slice(0, 160) : undefined,
    });
    const upstreamStatus =
      error instanceof CloudRunDomainError
        ? error.status === 429
          ? 429
          : error.status === 403
            ? 403
            : error.status >= 500
              ? 503
              : 401
        : 503;
    const response = NextResponse.json(
      { error: "Firebase session could not be established" },
      {
        status: upstreamStatus,
        headers: { "cache-control": "no-store" },
      },
    );
    clearFirebaseCsrfCookie(response);
    return response;
  }
}
