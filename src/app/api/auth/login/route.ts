import { NextResponse } from "next/server";
import {
  authenticateCredentials,
  CredentialAuthError,
} from "@/lib/auth/credential-auth";
import { firebaseAuthRouteGoneResponse } from "@/lib/auth/firebase-auth-route-gone";
import { routeForRole } from "@/lib/auth/role-model";
import {
  attachSessionCookie,
  buildPublicUser,
  encodeSessionToken,
  getAuthRequestContext,
} from "@/lib/auth/session-config";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { roleSupportsTotp } from "@/lib/auth/role-model";
import {
  attachTotpPendingCookie,
  encodeTotpPendingToken,
} from "@/lib/auth/totp-pending-cookie";
import {
  PUBLIC_CMS_UNAVAILABLE_MESSAGE,
  checkCmsReachability,
  logCmsConnectivityIssue,
} from "@/legacy-cms/connectivity";
import { portalMfaEnrollmentRequired } from "@/lib/auth/portal-mfa-enrollment";

const wantsJsonResponse = (request: Request) =>
  request.headers.get("accept")?.includes("application/json") ?? false;

const resolveCallbackPath = (value: FormDataEntryValue | null, role: string) => {
  const fallback = routeForRole(role);

  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  try {
    const parsed = value.startsWith("http")
      ? new URL(value)
      : new URL(value, "http://localhost");

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
};

const lockedResponse = (request: Request, jsonResponse: boolean, retryAfterSeconds?: number) => {
  if (jsonResponse) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("mode", "login");
  loginUrl.searchParams.set("error", "LockedOut");
  return NextResponse.redirect(loginUrl, 303);
};

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const firebaseGone = firebaseAuthRouteGoneResponse();
  if (firebaseGone) {
    return firebaseGone;
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const jsonResponse = wantsJsonResponse(request);
  const context = getAuthRequestContext(request);

  if (!email || !password) {
    if (jsonResponse) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("error", "CredentialsSignin");
    return NextResponse.redirect(loginUrl, 303);
  }

  const strapiIssue = await checkCmsReachability();
  if (strapiIssue) {
    logCmsConnectivityIssue("auth/login", strapiIssue);
    if (jsonResponse) {
      return NextResponse.json({ error: PUBLIC_CMS_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("error", "CredentialsSignin");
    loginUrl.searchParams.set("message", PUBLIC_CMS_UNAVAILABLE_MESSAGE);
    return NextResponse.redirect(loginUrl, 303);
  }

  const loginStartedAt = Date.now();
  const logLoginTiming = (step: string) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[auth/login] ${step} +${Date.now() - loginStartedAt}ms`);
    }
  };

  try {
    logLoginTiming("start");
    const { authResponse, role } = await authenticateCredentials({
      email,
      password,
      context,
    });
    logLoginTiming("authenticateCredentials done");

    const callbackPath = resolveCallbackPath(formData.get("callbackUrl"), role);
    const publicUser = buildPublicUser(authResponse.user!, role);
    const totpEnabled =
      (authResponse.user as { totpEnabled?: boolean }).totpEnabled === true;
    const mustEnrollPortalMfa = portalMfaEnrollmentRequired({
      enabled: process.env.REQUIRE_PORTAL_MFA_ENROLLMENT === "true",
      role,
      totpEnabled,
    });
    const authenticatedRedirectPath = mustEnrollPortalMfa
      ? "/profile?tab=security&enroll=1"
      : callbackPath;

    if (roleSupportsTotp(role) && totpEnabled) {
      logLoginTiming("totp branch");
      const pendingToken = await encodeTotpPendingToken({
        id: authResponse.user!.id,
        email: authResponse.user!.email,
        firstName: authResponse.user!.firstName,
        lastName: authResponse.user!.lastName,
        role,
        jwt: authResponse.jwt!,
        organization:
          typeof authResponse.user!.organization === "string"
            ? authResponse.user!.organization
            : undefined,
        phone:
          typeof authResponse.user!.phone === "string" ? authResponse.user!.phone : undefined,
        equalityMonitoring: authResponse.user!.equalityMonitoring,
        agreeToMarketing: authResponse.user!.agreeToMarketing ?? undefined,
        agreeToTerms: authResponse.user!.agreeToTerms ?? undefined,
        agreeToDataPrivacyPolicy: authResponse.user!.agreeToDataPrivacyPolicy ?? undefined,
        redirectPath: callbackPath,
      });

      if (jsonResponse) {
        const response = NextResponse.json({
          data: {
            requiresTotp: true,
            redirectPath: callbackPath,
          },
        });
        attachTotpPendingCookie(response, pendingToken);
        return response;
      }

      const totpUrl = new URL("/auth/login", request.url);
      totpUrl.searchParams.set("mode", "login");
      totpUrl.searchParams.set("totp", "1");
      const response = NextResponse.redirect(totpUrl, 303);
      attachTotpPendingCookie(response, pendingToken);
      return response;
    }

    logLoginTiming("encodeSessionToken start");
    const token = await encodeSessionToken({
      id: authResponse.user!.id,
      email: authResponse.user!.email,
      firstName: authResponse.user!.firstName,
      lastName: authResponse.user!.lastName,
      role,
      jwt: authResponse.jwt!,
      organization:
        typeof authResponse.user!.organization === "string"
          ? authResponse.user!.organization
          : undefined,
      phone:
        typeof authResponse.user!.phone === "string" ? authResponse.user!.phone : undefined,
      equalityMonitoring: authResponse.user!.equalityMonitoring,
      agreeToMarketing: authResponse.user!.agreeToMarketing ?? undefined,
      agreeToTerms: authResponse.user!.agreeToTerms ?? undefined,
      agreeToDataPrivacyPolicy: authResponse.user!.agreeToDataPrivacyPolicy ?? undefined,
      totpEnabled,
    });

    logLoginTiming("encodeSessionToken done");

    if (jsonResponse) {
      const response = NextResponse.json({
        data: {
          user: publicUser,
          redirectPath: authenticatedRedirectPath,
        },
      });
      attachSessionCookie(response, token);
      logLoginTiming("json response ready");
      return response;
    }

    const response = NextResponse.redirect(new URL(authenticatedRedirectPath, request.url), 303);
    attachSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof CredentialAuthError) {
      if (error.code === "RATE_LIMITED") {
        if (jsonResponse) {
          return NextResponse.json(
            { error: error.message },
            {
              status: 429,
              headers: error.retryAfterSeconds
                ? { "Retry-After": String(error.retryAfterSeconds) }
                : undefined,
            }
          );
        }
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("mode", "login");
        loginUrl.searchParams.set("error", "CredentialsSignin");
        return NextResponse.redirect(loginUrl, 303);
      }

      if (error.code === "LOCKED") {
        return lockedResponse(request, jsonResponse, error.retryAfterSeconds);
      }

      if (error.code === "INVALID") {
        if (jsonResponse) {
          return NextResponse.json({ error: error.message }, { status: 401 });
        }
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("mode", "login");
        loginUrl.searchParams.set("error", "CredentialsSignin");
        loginUrl.searchParams.set("message", error.message);
        return NextResponse.redirect(loginUrl, 303);
      }

      if (error.code === "UNAVAILABLE") {
        if (jsonResponse) {
          return NextResponse.json({ error: error.message }, { status: 503 });
        }
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("mode", "login");
        loginUrl.searchParams.set("error", "CredentialsSignin");
        loginUrl.searchParams.set("message", error.message);
        return NextResponse.redirect(loginUrl, 303);
      }
    }

    if (jsonResponse) {
      return NextResponse.json({ error: "Credentials not verified" }, { status: 401 });
    }

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("error", "CredentialsSignin");
    return NextResponse.redirect(loginUrl, 303);
  }
}
