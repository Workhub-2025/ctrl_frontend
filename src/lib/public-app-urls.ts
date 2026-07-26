import type { NextRequest } from "next/server";

/**
 * Prefer the live request host on Preview so invite/join links match the
 * deployment the operator is using (not a stale PUBLIC_APP_URL).
 */
export function publicAppBaseUrl(request: Request | NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const envBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "";
  if (forwardedHost && !forwardedHost.includes("localhost")) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return envBase || "http://localhost:3000";
}

export function invitationAcceptUrl(
  request: Request | NextRequest,
  token: string,
  email: string,
  options?: { type?: "candidate" },
): string {
  const url = new URL("/auth/accept-invitation", publicAppBaseUrl(request));
  if (options?.type) url.searchParams.set("type", options.type);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}

/** Deep-link candidates into the portal join form with the session code prefilled. */
export function sessionJoinUrl(
  request: Request | NextRequest,
  accessCode: string,
): string {
  const callback = new URL("/candidate-dashboard", publicAppBaseUrl(request));
  callback.searchParams.set("accessCode", accessCode);
  const login = new URL("/auth/login", publicAppBaseUrl(request));
  login.searchParams.set("callbackUrl", `${callback.pathname}${callback.search}`);
  return login.toString();
}
