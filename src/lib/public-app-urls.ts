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

/** Candidate portal path with a session access code ready to redeem. */
export function candidateDashboardPathWithAccessCode(accessCode: string): string {
  const path = new URL("/candidate-dashboard", "https://ctrl.local");
  path.searchParams.set("accessCode", accessCode);
  return `${path.pathname}${path.search}`;
}

/**
 * Deep-link candidates to the public join page with the session code
 * prefilled. They sign in (or continue) from there.
 */
export function sessionJoinUrl(
  request: Request | NextRequest,
  accessCode: string,
): string {
  const join = new URL("/join", publicAppBaseUrl(request));
  join.searchParams.set("accessCode", accessCode);
  return join.toString();
}
