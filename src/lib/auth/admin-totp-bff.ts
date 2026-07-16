import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { joinStrapiApiPath, getStrapiApiBaseUrl } from "@/lib/strapi-server";
import { attachSessionCookie, encodeSessionToken } from "@/lib/auth/session-config";

export async function forwardAdminTotpRequest(
  request: NextRequest,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  rotateSessionJwt = false,
) {
  const auth = await requireAdminApiAccess("security.manage");
  if ("error" in auth) return auth.error;

  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), path), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.strapiJwt}`,
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
    });
    attachSessionCookie(nextResponse, sessionToken);
  }

  return nextResponse;
}
