import type { NextRequest } from "next/server";

/** Production customer-facing origin. Never use a Vercel deployment hostname here. */
export const CANONICAL_PRODUCTION_APP_URL = "https://www.ctrl-assess.co.uk";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:")
  );
}

export function isEphemeralDeploymentHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized.endsWith(".vercel.app") ||
    normalized.endsWith(".vercel.dev") ||
    normalized.endsWith(".web.app")
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Resolve the public app origin used for Stripe redirects, invite emails,
 * and deep links.
 *
 * - Production: env URL if set and not ephemeral; otherwise canonical domain.
 * - Preview: request host (so operators can test that deployment).
 * - Never return a `.vercel.app` host from production Stripe/email paths.
 */
export function publicAppBaseUrl(request?: Request | NextRequest): string {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const envBase = stripTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      "",
  );

  if (request && isPreview) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (forwardedHost && !isLocalHost(forwardedHost)) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }

  if (envBase) {
    const host = hostOf(envBase);
    if (host && !isEphemeralDeploymentHost(host)) {
      return envBase;
    }
    // Production must not use a stale preview URL accidentally stored in env.
    if (!isPreview) {
      return CANONICAL_PRODUCTION_APP_URL;
    }
    return envBase;
  }

  if (!isPreview) {
    return CANONICAL_PRODUCTION_APP_URL;
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (forwardedHost && !isLocalHost(forwardedHost)) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }

  return "http://localhost:3000";
}

/** Stripe success/cancel/return base — always canonical on production. */
export function stripeReturnAppUrl(): string {
  return publicAppBaseUrl();
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
