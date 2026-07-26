import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { FIREBASE_AUTH_ROUTE_GONE_MESSAGE } from "@/lib/auth/auth-provider";
import {
  handleBffRouteError,
  requireRoleSession,
} from "@/lib/auth/bff-session";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import { joinCmsApiPath, getCmsApiBaseUrl } from "@/legacy-cms/server-url";
import { attachSessionCookie, encodeSessionToken } from "@/lib/auth/session-config";
import { accountTotpUpstreamPath } from "@/lib/auth/totp-route-contract";

async function rejectFirebaseTotpTransport(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.authProvider === "firebase") {
    return NextResponse.json(
      {
        error: FIREBASE_AUTH_ROUTE_GONE_MESSAGE,
        hint: "Use the Firebase authenticator panel on /profile?tab=security.",
      },
      { status: 410 },
    );
  }
  return null;
}

export async function forwardAdminTotpRequest(
  request: NextRequest,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  rotateSessionJwt = false,
) {
  const firebaseGone = await rejectFirebaseTotpTransport();
  if (firebaseGone) {
    return firebaseGone;
  }

  // Legacy Strapi TOTP transport. Firebase sessions never enter this helper.
  const auth = await requireAdminApiAccess("security.manage");
  if ("error" in auth) return auth.error;

  const response = await fetch(joinCmsApiPath(getCmsApiBaseUrl(), path), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.cmsJwt}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } }).error?.message
      ?? (payload as { error?: string }).error
      ?? (payload as { message?: string }).message
      ?? "Request failed";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const nextResponse = NextResponse.json({
    data: rotateSessionJwt && typeof (payload as { jwt?: unknown }).jwt === "string"
      ? { ...(payload as Record<string, unknown>), jwt: undefined }
      : payload,
  });

  if (rotateSessionJwt) {
    const verifiedJwt = (payload as { jwt?: unknown }).jwt;
    if (typeof verifiedJwt !== "string" || !verifiedJwt) {
      return NextResponse.json(
        { error: "Two-factor setup could not refresh the authenticated session." },
        { status: 502 },
      );
    }

    const user = (auth.session as {
      user: {
        id: string;
        email?: string | null;
        firstName?: string;
        lastName?: string;
        role: string;
        organization?: string;
        phone?: string;
        equalityMonitoring?: { completed?: boolean } | Record<string, unknown>;
        agreeToMarketing?: boolean;
        agreeToTerms?: boolean;
        agreeToDataPrivacyPolicy?: boolean;
      };
    }).user;
    const sessionToken = await encodeSessionToken({
      id: user.id,
      email: user.email ?? undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      jwt: verifiedJwt,
      organization: user.organization,
      phone: user.phone,
      equalityMonitoring: user.equalityMonitoring,
      agreeToMarketing: user.agreeToMarketing,
      agreeToTerms: user.agreeToTerms,
      agreeToDataPrivacyPolicy: user.agreeToDataPrivacyPolicy,
      totpEnabled: true,
    });
    attachSessionCookie(nextResponse, sessionToken);
  }

  return nextResponse;
}

export async function forwardPortalTotpRequest(
  request: NextRequest,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  rotateSessionJwt = false,
) {
  const firebaseGone = await rejectFirebaseTotpTransport();
  if (firebaseGone) {
    return firebaseGone;
  }

  // Legacy Strapi TOTP transport retained only for unported sessions.
  try {
    const portalAuth = await requireRoleSession(
      "admin",
      "client",
      "hiring_manager",
    );
    if (isAdminRole(portalAuth.session.user.role)) {
      return forwardAdminTotpRequest(
        request,
        accountTotpUpstreamPath(path, true),
        method,
        body,
        rotateSessionJwt,
      );
    }

    const response = await fetch(joinCmsApiPath(getCmsApiBaseUrl(), path), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${portalAuth.cmsJwt}`,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (payload as { error?: { message?: string } }).error?.message ??
        (payload as { error?: string }).error ??
        (payload as { message?: string }).message ??
        "Request failed";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const verifiedJwt = (payload as { jwt?: unknown }).jwt;
    const responseData =
      rotateSessionJwt && typeof verifiedJwt === "string"
        ? { ...(payload as Record<string, unknown>), jwt: undefined }
        : payload;
    const nextResponse = NextResponse.json({ data: responseData });

    if (rotateSessionJwt) {
      if (typeof verifiedJwt !== "string" || !verifiedJwt) {
        return NextResponse.json(
          { error: "Two-factor setup could not refresh the authenticated session." },
          { status: 502 },
        );
      }
      const user = portalAuth.session.user;
      const sessionToken = await encodeSessionToken({
        id: user.id,
        email: user.email ?? undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        jwt: verifiedJwt,
        organization: user.organization,
        phone: user.phone,
        equalityMonitoring: user.equalityMonitoring,
        agreeToMarketing: user.agreeToMarketing,
        agreeToTerms: user.agreeToTerms,
        agreeToDataPrivacyPolicy: user.agreeToDataPrivacyPolicy,
        totpEnabled: true,
      });
      attachSessionCookie(nextResponse, sessionToken);
    }

    return nextResponse;
  } catch (error) {
    return handleBffRouteError(error, "Security settings request failed");
  }
}
