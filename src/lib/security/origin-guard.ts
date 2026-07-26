import { NextResponse } from "next/server";

const getConfiguredOrigin = () => {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(base).origin;
  } catch {
    return "http://localhost:3000";
  }
};

/** Apex ↔ www siblings so production mutations work on either hostname. */
function withApexWwwAliases(origin: string, into: Set<string>) {
  into.add(origin);
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      url.hostname = host.slice(4);
      into.add(url.origin);
    } else if (host.includes(".") && !host.endsWith(".vercel.app")) {
      url.hostname = `www.${host}`;
      into.add(url.origin);
    }
  } catch {
    // ignore malformed
  }
}

const getExpectedOrigins = () => {
  const origins = new Set<string>();
  withApexWwwAliases(getConfiguredOrigin(), origins);
  const publicApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicApp) {
    try {
      withApexWwwAliases(new URL(publicApp).origin, origins);
    } catch {
      // ignore
    }
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && !vercelUrl.includes("/") && !vercelUrl.includes("*")) {
    origins.add(`https://${vercelUrl}`);
  }
  return origins;
};

const matchesExpectedOrigin = (value: string | null) => {
  if (!value) {
    return false;
  }

  try {
    return getExpectedOrigins().has(new URL(value).origin);
  } catch {
    return false;
  }
};

/**
 * Rejects cross-site POSTs to state-changing auth routes in production.
 */
export function rejectCrossOriginRequest(request: Request): Response | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (matchesExpectedOrigin(origin) || matchesExpectedOrigin(referer)) {
    return null;
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
